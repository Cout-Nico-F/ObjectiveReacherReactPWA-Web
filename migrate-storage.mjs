import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🤖 Transformador AST: Corrigiendo firmas Promise<T> y callbacks de React...\n');

const project = new Project({
  compilerOptions: { allowJs: true, jsx: 1, target: 99, moduleResolution: 2 }
});

const ignoreFiles = ['storageService.ts', 'App.tsx.bak'];
const srcPath = path.join(process.cwd(), 'src');
project.addSourceFilesAtPaths(`${srcPath}/**/*.{ts,tsx}`);

let modifiedFilesCount = 0;

project.getSourceFiles().forEach(sourceFile => {
  const filePath = sourceFile.getFilePath();
  const baseName = path.basename(filePath);

  if (ignoreFiles.includes(baseName)) return;

  let fileModified = false;

  // -------------------------------------------------------------
  // REGLA 1: Ajustar tipos de retorno explícitos a Promise<T> (Fix TS1064)
  // -------------------------------------------------------------
  const allFunctions = [
    ...sourceFile.getFunctions(),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression)
  ];

  allFunctions.forEach(fn => {
    if (typeof fn.isAsync === 'function' && fn.isAsync()) {
      const returnTypeNode = fn.getReturnTypeNode();
      if (returnTypeNode) {
        const typeText = returnTypeNode.getText();
        if (!typeText.startsWith('Promise<')) {
          returnTypeNode.replaceWithText(`Promise<${typeText}>`);
          fileModified = true;
        }
      }
    }
  });

  // -------------------------------------------------------------
  // REGLA 2: Corregir callbacks en useState / setState (Fix TS2345)
  // -------------------------------------------------------------
  const useStateCalls = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(call => call.getExpression().getText() === 'useState');

  useStateCalls.forEach(call => {
    call.getArguments().forEach(arg => {
      if (
        arg.getKind() === SyntaxKind.ArrowFunction ||
        arg.getKind() === SyntaxKind.FunctionExpression
      ) {
        // En useState, no se pueden usar async callbacks. Remarcamos a síncrono si era async.
        if (typeof arg.setIsAsync === 'function' && arg.isAsync()) {
          arg.setIsAsync(false);
          fileModified = true;
        }
      }
    });
  });

  // -------------------------------------------------------------
  // REGLA 3: Reemplazar llamadas a localStorage remanentes
  // -------------------------------------------------------------
  const storageCalls = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(call => call.getExpression().getText().startsWith('localStorage.'))
    .sort((a, b) => b.getStart() - a.getStart());

  storageCalls.forEach(call => {
    if (call.wasForgotten()) return;
    const expr = call.getExpression().getText();
    fileModified = true;

    if (expr === 'localStorage.getItem') {
      const args = call.getArguments().map(a => a.getText());
      call.replaceWithText(`await storageService.get(${args[0]}, null)`);
    } else if (expr === 'localStorage.setItem') {
      const args = call.getArguments().map(a => a.getText());
      call.replaceWithText(`await storageService.set(${args[0]}, ${args[1]})`);
    } else if (expr === 'localStorage.removeItem') {
      const args = call.getArguments().map(a => a.getText());
      call.replaceWithText(`await storageService.remove(${args[0]})`);
    } else if (expr === 'localStorage.clear') {
      call.replaceWithText(`await storageService.clear()`);
    }
  });

  if (fileModified) {
    const hasImport = sourceFile.getImportDeclarations().some(imp =>
      imp.getModuleSpecifierValue().includes('storageService')
    );

    if (!hasImport) {
      const relativePath = path
        .relative(path.dirname(filePath), path.join(srcPath, 'services', 'storageService'))
        .replace(/\\/g, '/');
      const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;

      sourceFile.addImportDeclaration({
        moduleSpecifier: importPath,
        namedImports: ['storageService']
      });
    }

    sourceFile.saveSync();
    console.log(`✅ Ajustado: ${path.relative(process.cwd(), filePath)}`);
    modifiedFilesCount++;
  }
});

console.log(`\n📊 Total de archivos procesados: ${modifiedFilesCount}`);
console.log('⚡ Verificando compilación de TypeScript (npx tsc --noEmit)...');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('\n🎉 ¡MIGRACIÓN DE STORAGE COMPLETADA CON 0 ERRORES!');
} catch (error) {
  const rawOutput = error.stdout ? error.stdout.toString() : '';
  const errorLines = rawOutput
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('error TS'));

  console.log(`\n⚠️ Errores pendientes (${errorLines.length}):\n`);
  console.log(errorLines.slice(0, 15).join('\n'));
}