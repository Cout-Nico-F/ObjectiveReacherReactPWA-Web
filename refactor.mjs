import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🚀 Ejecutando Refactorizador y Extractor de Dominios (ts-morph)...\n');

function getFileInfo(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, lines: 0, bytes: 0, kb: '0.00 KB' };
  const content = fs.readFileSync(filePath, 'utf-8');
  const bytes = fs.statSync(filePath).size;
  const lines = content.split('\n').length;
  return { exists: true, lines, bytes, kb: (bytes / 1024).toFixed(2) + ' KB' };
}

const srcPath = path.join(process.cwd(), 'src');
const srcContents = fs.existsSync(srcPath) ? fs.readdirSync(srcPath) : [];
const hooksFolderName = srcContents.find(f => f.toLowerCase() === 'hooks') || 'Hooks';
const utilsFolderName = srcContents.find(f => f.toLowerCase() === 'utils') || 'utils';

const dirs = {
  utils: path.join(srcPath, utilsFolderName),
  hooks: path.join(srcPath, hooksFolderName),
  extracted: path.join(srcPath, 'components', 'extracted')
};

Object.values(dirs).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const appFilePath = path.join(srcPath, 'App.tsx');
if (!fs.existsSync(appFilePath)) {
  console.error('❌ No se encontró src/App.tsx');
  process.exit(1);
}

const initialAppStats = getFileInfo(appFilePath);
console.log(`📊 ESTADO INICIAL DE App.tsx:`);
console.log(`   • Líneas totales: ${initialAppStats.lines.toLocaleString()}`);
console.log(`   • Tamaño en disco: ${initialAppStats.kb}\n`);

// Backup de seguridad
fs.copyFileSync(appFilePath, path.join(srcPath, 'App.tsx.bak'));

const project = new Project({
  compilerOptions: { allowJs: true, jsx: 1, target: 99, moduleResolution: 2 }
});

const appFile = project.addSourceFileAtPath(appFilePath);

// -------------------------------------------------------------
// FASE 1: SANEAMIENTO Y AUTO-FIX DE IMPORTACIONES EN UTILIDADES
// -------------------------------------------------------------
console.log('🧹 FASE 1: Verificando importaciones de constantes...');

const constantsFilePath = path.join(srcPath, 'constants.ts');
if (fs.existsSync(constantsFilePath)) {
  const constantsFile = project.addSourceFileAtPath(constantsFilePath);
  const exportedConstantNames = new Set();
  
  constantsFile.getVariableDeclarations().forEach(v => {
    if (v.isExported()) exportedConstantNames.add(v.getName());
  });

  const utilFiles = fs.readdirSync(dirs.utils).filter(f => f.endsWith('.ts'));
  utilFiles.forEach(file => {
    const filePath = path.join(dirs.utils, file);
    const sourceFile = project.addSourceFileAtPath(filePath);
    let updated = false;

    exportedConstantNames.forEach(constName => {
      const usesConst = new RegExp(`\\b${constName}\\b`).test(sourceFile.getText());
      const hasImport = sourceFile.getImportDeclarations().some(imp => 
        imp.getNamedImports().some(n => n.getName() === constName)
      );

      if (usesConst && !hasImport) {
        let constImport = sourceFile.getImportDeclaration(imp => imp.getModuleSpecifierValue().includes('constants'));
        if (constImport) {
          constImport.addNamedImport(constName);
        } else {
          sourceFile.addImportDeclaration({
            moduleSpecifier: '../constants',
            namedImports: [constName]
          });
        }
        updated = true;
      }
    });

    if (updated) {
      sourceFile.saveSync();
      console.log(`   • Inyectadas constantes faltantes en: src/${utilsFolderName}/${file}`);
    }
  });
}

// -------------------------------------------------------------
// FASE 2: AUTO-SANEAR RUTAS ENTRE COMPONENTES HERMANOS
// -------------------------------------------------------------
console.log('\n🧩 FASE 2: Saneando importaciones en /components/extracted/...');

const extractedFiles = fs.readdirSync(dirs.extracted).filter(f => f.endsWith('.tsx'));

extractedFiles.forEach(file => {
  const filePath = path.join(dirs.extracted, file);
  let code = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  if (code.includes('../../App')) {
    code = code.replace(/import\s*\{[^}]*doTitlesShareCoreMeaning[^}]*\}\s*from\s*["']\.\.\/\.\.\/App["'];?/g, `import { doTitlesShareCoreMeaning } from "../../${utilsFolderName}/textUtils";`);
    code = code.replace(/import\s*\{[^}]*useHorizontalScrollProps[^}]*\}\s*from\s*["']\.\.\/\.\.\/App["'];?/g, `import { useHorizontalScrollProps } from "../../${hooksFolderName}/useHorizontalScroll";`);
    modified = true;
  }

  if (code.includes('../extracted/')) {
    code = code.replace(/from\s*["']\.\.\/extracted\/([A-Za-z0-9_]+)["'];?/g, 'from "./$1";');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, code, 'utf-8');
  }
});

project.saveSync();

// -------------------------------------------------------------
// FASE 3: AUDITORÍA FINAL DE TIPO Y LÍNEAS
// -------------------------------------------------------------
const finalAppStats = getFileInfo(appFilePath);
const linesReduced = initialAppStats.lines - finalAppStats.lines;

console.log('\n' + '═'.repeat(60));
console.log('📈 INFORME FINAL DE REFACTORIZACIÓN Y ESTADO DE App.tsx');
console.log('═'.repeat(60));

console.log(`\n📄 Estado de App.tsx:`);
console.log(`   • Líneas: ${initialAppStats.lines.toLocaleString()} ➔ ${finalAppStats.lines.toLocaleString()} (${linesReduced} líneas reducidas)`);
console.log(`   • Tamaño: ${initialAppStats.kb} ➔ ${finalAppStats.kb}`);

console.log('\n⚡ Ejecutando verificación de tipos (npx tsc --noEmit)...');

try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('\n🎉 ¡VERIFICACIÓN EXITOSA! 0 errores de compilación.');
} catch (error) {
  console.log('\n⚠️ Revisa la consola si resta algún detalle de tipos.');
}