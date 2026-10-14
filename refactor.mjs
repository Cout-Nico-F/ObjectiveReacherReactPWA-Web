import { Project } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const project = new Project({
  compilerOptions: { allowJs: true, jsx: 1, target: 99, moduleResolution: 2 }
});

const appFilePath = path.join(process.cwd(), 'src', 'App.tsx');
if (!fs.existsSync(appFilePath)) {
  console.error('❌ No se encontró src/App.tsx');
  process.exit(1);
}

const appFile = project.addSourceFileAtPath(appFilePath);

// Mapear importaciones originales de App.tsx
const originalImportsMap = new Map();
appFile.getImportDeclarations().forEach((imp) => {
  const moduleSpecifier = imp.getModuleSpecifierValue();
  imp.getNamedImports().forEach((named) => {
    originalImportsMap.set(named.getName(), moduleSpecifier);
  });
  if (imp.getDefaultImport()) {
    originalImportsMap.set(imp.getDefaultImport().getText(), moduleSpecifier);
  }
});

// Exportar helpers y hooks que se quedaron en App.tsx (empezados en minúscula)
appFile.getFunctions().forEach((func) => {
  const name = func.getName();
  if (name && (!/^[A-Z]/.test(name) || name.startsWith('use')) && !func.isExported()) {
    func.setIsExported(true);
    originalImportsMap.set(name, './App');
  }
});

// -------------------------------------------------------------
// FASE 1: EXTRAER CONSTANTES GLOBALES
// -------------------------------------------------------------
console.log('📦 FASE 1: Extrayendo constantes globales...');

const constantsToExtract = [];
const statementsToRemove = [];

appFile.getVariableStatements().forEach((stmt) => {
  const stmtText = stmt.getText();
  const containsJsx = /<[A-Za-z]|\/>|<\//.test(stmtText) || stmtText.includes('React.memo') || stmtText.includes('memo(');

  stmt.getDeclarations().forEach((decl) => {
    const name = decl.getName();
    const isComponent = (/^[A-Z]/.test(name) && decl.getInitializer()?.getKindName().includes('Function')) || containsJsx;
    
    if (!isComponent && name !== 'App') {
      constantsToExtract.push(stmt.getText());
      statementsToRemove.push(stmt);
    }
  });
});

let constantsNames = [];

if (constantsToExtract.length > 0) {
  const constantsFilePath = path.join(process.cwd(), 'src', 'constants.ts');
  const constantsContent = `// Generado automáticamente\n\n` + 
    constantsToExtract.map(code => code.startsWith('export') ? code : `export ${code}`).join('\n\n');
  
  fs.writeFileSync(constantsFilePath, constantsContent, 'utf-8');

  constantsNames = constantsToExtract
    .map(c => c.match(/const\s+([A-Za-z0-9_]+)/)?.[1])
    .filter(Boolean);

  statementsToRemove.forEach(stmt => { try { stmt.remove(); } catch(e){} });

  appFile.addImportDeclaration({
    moduleSpecifier: './constants',
    namedImports: constantsNames
  });
}

// -------------------------------------------------------------
// FASE 2: EXTRAER COMPONENTES
// -------------------------------------------------------------
console.log('\n🚀 FASE 2: Extraer componentes a src/components/extracted/...');

const outputDir = path.join(process.cwd(), 'src', 'components', 'extracted');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const components = [];
const extractedComponentNames = new Set();

appFile.getFunctions().forEach((func) => {
  const name = func.getName();
  if (name && /^[A-Z]/.test(name) && name !== 'App' && !name.startsWith('use')) {
    components.push({ name, node: func });
    extractedComponentNames.add(name);
  }
});

appFile.getVariableDeclarations().forEach((v) => {
  const name = v.getName();
  const stmtText = v.getVariableStatement()?.getText() || '';
  const isJsxComponent = /^[A-Z]/.test(name) && (/<[A-Za-z]|\/>|<\//.test(stmtText) || stmtText.includes('memo('));
  
  if (isJsxComponent && name !== 'App') {
    components.push({ name, node: v.getVariableStatement() || v });
    extractedComponentNames.add(name);
  }
});

components.forEach(({ name, node }) => {
  if (!node) return;
  let compCode = node.getText().trim();

  if (compCode.startsWith('export ')) {
    compCode = compCode.substring(7).trim();
  }

  const newFileContent = `import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ObjectiveEntry, Objective, GamificationState } from '../../types';
import * as Constants from '../../constants';

${constantsNames.length > 0 ? `const { ${constantsNames.join(', ')} } = Constants;\n` : ''}
export ${compCode}
`;

  const newFilePath = path.join(outputDir, `${name}.tsx`);
  fs.writeFileSync(newFilePath, newFileContent, 'utf-8');
  project.addSourceFileAtPath(newFilePath);

  try { node.remove(); } catch(e){}

  appFile.addImportDeclaration({
    moduleSpecifier: `./components/extracted/${name}`,
    namedImports: [name]
  });

  console.log(`  • Extraído: ${name}`);
});

appFile.saveSync();

// -------------------------------------------------------------
// FASE 3: CONECTAR DEPENDENCIAS Y PREVENIR DUPLICADOS
// -------------------------------------------------------------
console.log('\n🛠️ FASE 3: Resolviendo dependencias cruzadas...');

const diagnostics = project.getPreEmitDiagnostics();

diagnostics.forEach((diag) => {
  if (diag.getCode() === 2304 || diag.getCode() === 2552) {
    const message = typeof diag.getMessageText() === 'string' 
      ? diag.getMessageText() 
      : diag.getMessageText().getMessageText();
    
    const missingName = message.match(/Cannot find name '([^']+)'/)?.[1];
    const sourceFile = diag.getSourceFile();

    if (missingName && sourceFile) {
      const filePath = sourceFile.getFilePath();

      const addNamedImportSafely = (file, moduleSpec, symbol) => {
        const existingImport = file.getImportDeclaration(imp => imp.getModuleSpecifierValue() === moduleSpec);
        if (existingImport) {
          if (!existingImport.getNamedImports().some(n => n.getName() === symbol)) {
            existingImport.addNamedImport(symbol);
          }
        } else {
          file.addImportDeclaration({ moduleSpecifier: moduleSpec, namedImports: [symbol] });
        }
      };

      if (extractedComponentNames.has(missingName) && filePath.includes('extracted')) {
        addNamedImportSafely(sourceFile, `./${missingName}`, missingName);
      } else if (originalImportsMap.has(missingName) && filePath.includes('extracted')) {
        let moduleSpecifier = originalImportsMap.get(missingName);
        if (moduleSpecifier.startsWith('./')) {
          moduleSpecifier = `../../${moduleSpecifier.replace('./', '')}`;
        }
        addNamedImportSafely(sourceFile, moduleSpecifier, missingName);
      }
    }
  }
});

project.saveSync();

// -------------------------------------------------------------
// FASE 4: VERIFICACIÓN FINAL
// -------------------------------------------------------------
console.log('\n🔍 FASE 4: Ejecutando "npx tsc --noEmit"...');

try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('\n🎉 ¡VERIFICACIÓN EXITOSA! 0 errores de compilación.');
} catch (error) {
  console.log('\n⚠️ Revisa la consola si queda algún detalle.');
}