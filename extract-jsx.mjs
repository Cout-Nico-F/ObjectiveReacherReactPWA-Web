import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🤖 Refactorizador AST (Dominio Extendido con Alias v13)...\n');

function getFileInfo(filePath) {
  if (!fs.existsSync(filePath)) return { lines: 0, kb: '0.00 KB' };
  const content = fs.readFileSync(filePath, 'utf-8');
  const bytes = fs.statSync(filePath).size;
  return { lines: content.split('\n').length, kb: (bytes / 1024).toFixed(2) + ' KB' };
}

const srcPath = path.join(process.cwd(), 'src');
const srcContents = fs.existsSync(srcPath) ? fs.readdirSync(srcPath) : [];
const hooksFolderName = srcContents.find(f => f.toLowerCase() === 'hooks') || 'Hooks';
const hooksDir = path.join(srcPath, hooksFolderName);

if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const appFilePath = path.join(srcPath, 'App.tsx');
if (!fs.existsSync(appFilePath)) {
  console.error('❌ No se encontró src/App.tsx');
  process.exit(1);
}

const initialStats = getFileInfo(appFilePath);
console.log(`📊 ESTADO INICIAL DE App.tsx: ${initialStats.lines.toLocaleString()} líneas (${initialStats.kb})\n`);

fs.copyFileSync(appFilePath, path.join(srcPath, 'App.tsx.bak'));

const project = new Project({
  compilerOptions: { allowJs: true, jsx: 1, target: 99, moduleResolution: 2 }
});

const appFile = project.addSourceFileAtPath(appFilePath);

// Imports de cabecera
const appTopLevelImports = new Map();
appFile.getImportDeclarations().forEach(imp => {
  const moduleSpecifier = imp.getModuleSpecifierValue();
  imp.getNamedImports().forEach(named => {
    appTopLevelImports.set(named.getName(), { specifier: moduleSpecifier, importName: named.getName() });
  });
  const defaultImport = imp.getDefaultImport();
  if (defaultImport) {
    appTopLevelImports.set(defaultImport.getText(), { specifier: moduleSpecifier, importName: defaultImport.getText() });
  }
});

// Constantes
const constantsFilePath = path.join(srcPath, 'constants.ts');
const availableConstants = new Set();
if (fs.existsSync(constantsFilePath)) {
  const constantsFile = project.addSourceFileAtPath(constantsFilePath);
  constantsFile.getVariableDeclarations().forEach(v => {
    if (v.isExported()) availableConstants.add(v.getName());
  });
}

let appFunc = null;
appFile.getFunctions().forEach(f => {
  if (f.getName() === 'App' || f.isDefaultExport()) appFunc = f;
});

if (!appFunc) {
  appFile.getVariableDeclarations().forEach(v => {
    if (v.getName() === 'App') appFunc = v;
  });
}

const appBody = appFunc.getBody();
const targetDomainName = process.argv[2] ? process.argv[2].toLowerCase() : 'asmr';

// Mapeo de palabras clave complementarias por dominio
const domainKeywords = {
  mascot: ['mascot', 'species'],
  asmr: ['asmr'],
  objective: ['objective', 'goal'],
  equipped: ['equipped', 'skin']
};

const searchKeywords = domainKeywords[targetDomainName] || [targetDomainName];

const hookName = `use${targetDomainName.charAt(0).toUpperCase() + targetDomainName.slice(1)}Engine`;
const fileName = `${hookName}.ts`;

const cluster = new Set();

appFunc.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
  const text = id.getText();
  if (searchKeywords.some(kw => text.toLowerCase().includes(kw))) {
    cluster.add(text);
  }
});

let expanded = true;
while (expanded) {
  const previousSize = cluster.size;

  appFunc.getVariableStatements().forEach(stmt => {
    const ids = stmt.getDescendantsOfKind(SyntaxKind.Identifier).map(i => i.getText());
    if (ids.some(id => cluster.has(id))) {
      stmt.getDeclarations().forEach(d => {
        d.getNameNode().getDescendantsOfKind(SyntaxKind.Identifier).forEach(i => cluster.add(i.getText()));
      });
    }
  });

  appFunc.getFunctions().forEach(fn => {
    const name = fn.getName();
    const ids = fn.getDescendantsOfKind(SyntaxKind.Identifier).map(i => i.getText());
    if ((name && cluster.has(name)) || ids.some(id => cluster.has(id))) {
      if (name) cluster.add(name);
    }
  });

  expanded = cluster.size > previousSize;
}

console.log(`🎯 Dominio "${targetDomainName}" expandido transitivamente a ${cluster.size} símbolos.`);

const statementsToExtract = [];
const statementsToRemove = [];
const topLevelDeclaredInHook = new Set();
const allReferencedIdentifiers = new Set();

const varStatements = appFunc.getVariableStatements();
for (const stmt of varStatements) {
  if (stmt.getParent() !== appBody) continue;

  const decls = stmt.getDeclarations();
  const isClusterStmt = decls.some(d => {
    const ids = d.getNameNode().getDescendantsOfKind(SyntaxKind.Identifier).map(i => i.getText());
    return ids.some(id => cluster.has(id)) || cluster.has(d.getName());
  });

  if (isClusterStmt) {
    statementsToExtract.push(stmt.getText());
    statementsToRemove.push(stmt);

    decls.forEach(d => {
      const nameNode = d.getNameNode();
      if (nameNode.getKind() === SyntaxKind.ArrayBindingPattern || nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
        nameNode.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => topLevelDeclaredInHook.add(id.getText()));
      } else {
        topLevelDeclaredInHook.add(d.getName());
      }
    });

    stmt.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => allReferencedIdentifiers.add(id.getText()));
  }
}

const funcDecls = appFunc.getFunctions();
for (const fn of funcDecls) {
  if (fn.getParent() !== appBody) continue;

  const name = fn.getName();
  if (name && cluster.has(name)) {
    statementsToExtract.push(fn.getText());
    statementsToRemove.push(fn);
    topLevelDeclaredInHook.add(name);
    fn.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => allReferencedIdentifiers.add(id.getText()));
  }
}

// Map de declaraciones en App()
const allAppDeclaredVars = new Map();
appFunc.getVariableStatements().forEach(stmt => {
  if (stmt.getParent() === appBody && !statementsToRemove.includes(stmt)) {
    stmt.getDeclarations().forEach(d => {
      const nameNode = d.getNameNode();
      if (nameNode.getKind() === SyntaxKind.ArrayBindingPattern || nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
        nameNode.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => allAppDeclaredVars.set(id.getText(), stmt));
      } else {
        allAppDeclaredVars.set(d.getName(), stmt);
      }
    });
  }
});

appFunc.getFunctions().forEach(fn => {
  if (fn.getParent() === appBody && !statementsToRemove.includes(fn)) {
    const name = fn.getName();
    if (name) allAppDeclaredVars.set(name, fn);
  }
});

// Inferir Props
const autoProps = new Set();
const autoConstantImports = new Set();
const autoTopLevelImports = new Map();

const builtins = new Set(['window', 'Date', 'Math', 'console', 'React', 'useState', 'useRef', 'useEffect', 'useCallback', 'useMemo', 'Array', 'Set', 'Map', 'String', 'Number', 'Boolean', 'undefined', 'null', 'true', 'false', 'e', 'evt', 'event']);

allReferencedIdentifiers.forEach(id => {
  if (!topLevelDeclaredInHook.has(id) && !builtins.has(id)) {
    if (appTopLevelImports.has(id)) {
      const impInfo = appTopLevelImports.get(id);
      if (!autoTopLevelImports.has(impInfo.specifier)) {
        autoTopLevelImports.set(impInfo.specifier, new Set());
      }
      autoTopLevelImports.get(impInfo.specifier).add(impInfo.importName);
    } else if (availableConstants.has(id)) {
      autoConstantImports.add(id);
    } else if (allAppDeclaredVars.has(id)) {
      autoProps.add(id);
    }
  }
});

const appRemainingCode = appFile.getText();
const returnExports = [];

topLevelDeclaredInHook.forEach(idName => {
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(idName)) return;
  if (idName.startsWith('set') && !appRemainingCode.includes(idName + '(')) return;
  returnExports.push(idName);
});

// Construcción del Hook
const hookFilePath = path.join(hooksDir, fileName);

let headerImportsCode = '';
if (autoConstantImports.size > 0) {
  headerImportsCode += `import { ${Array.from(autoConstantImports).join(', ')} } from '../constants';\n`;
}

autoTopLevelImports.forEach((names, specifier) => {
  const isRelative = specifier.startsWith('.');
  const importPath = isRelative ? path.join('..', specifier).replace(/\\/g, '/') : specifier;
  headerImportsCode += `import { ${Array.from(names).join(', ')} } from '${importPath}';\n`;
});

const propsInterfaceFields = Array.from(autoProps).map(p => `  ${p}?: any;`).join('\n');
const propsDestructure = autoProps.size > 0 
  ? `  const { ${Array.from(autoProps).join(', ')} } = props;\n\n`
  : '';

let rawHookContent = `import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
${headerImportsCode}
export interface ${hookName}Props {
${propsInterfaceFields}
}

export function ${hookName}(props: ${hookName}Props = {}) {
${propsDestructure}${statementsToExtract.map(code => '  ' + code.replace(/\n/g, '\n  ')).join('\n\n')}

  return {
    ${returnExports.join(',\n    ')}
  };
}
`;

const sanitizedHookContent = rawHookContent
  .replace(/\(?\bprev\b\)?\s*=>/g, '(prev: any) =>')
  .replace(/\(?\bsp\b\)?\s*=>/g, '(sp: any) =>')
  .replace(/\(?\bs\b\)?\s*=>/g, '(s: any) =>')
  .replace(/\(?\bt\b\)?\s*=>/g, '(t: any) =>');

fs.writeFileSync(hookFilePath, sanitizedHookContent, 'utf-8');
project.addSourceFileAtPath(hookFilePath);
console.log(`  ✅ Creado: src/${hooksFolderName}/${fileName}`);

for (const stmt of statementsToRemove) {
  try { stmt.remove(); } catch (e) {}
}

console.log(`  🧹 Eliminadas ${statementsToRemove.length} declaraciones monolíticas de App()`);

// Hoisting y Posicionamiento
let targetUsageIndex = -1;
const remainingStatements = appBody.getStatements();

remainingStatements.forEach((stmt, idx) => {
  if (targetUsageIndex !== -1) return;
  const stmtText = stmt.getText();
  const usesReturnedVar = returnExports.some(retName => stmtText.includes(retName));
  if (usesReturnedVar) {
    targetUsageIndex = idx;
  }
});

if (targetUsageIndex === -1) targetUsageIndex = 0;

const hoistedMap = new Map();
const propsToHoistQueue = Array.from(autoProps);

while (propsToHoistQueue.length > 0) {
  const propName = propsToHoistQueue.shift();
  const propDeclStmt = allAppDeclaredVars.get(propName);

  if (propDeclStmt && !statementsToRemove.includes(propDeclStmt)) {
    const currentIdx = remainingStatements.indexOf(propDeclStmt);
    if (currentIdx > targetUsageIndex && !hoistedMap.has(propDeclStmt)) {
      hoistedMap.set(propDeclStmt, currentIdx);

      propDeclStmt.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
        const idText = id.getText();
        if (allAppDeclaredVars.has(idText) && !hoistedMap.has(allAppDeclaredVars.get(idText))) {
          propsToHoistQueue.push(idText);
        }
      });
    }
  }
}

const sortedHoistedStmts = Array.from(hoistedMap.entries())
  .sort((a, b) => a[1] - b[1])
  .map(([stmt]) => {
    const text = stmt.getText();
    try { stmt.remove(); } catch (e) {}
    return text;
  });

if (sortedHoistedStmts.length > 0) {
  appBody.insertStatements(targetUsageIndex, sortedHoistedStmts.join('\n'));
  console.log(`  🚀 Hoisted transitivamente ${sortedHoistedStmts.length} declaraciones para eliminar TDZ.`);
}

const finalHookIndex = targetUsageIndex + sortedHoistedStmts.length;
const propsPassing = Array.from(autoProps).map(p => `${p}`).join(', ');
const destructureCall = `const { ${returnExports.join(', ')} } = ${hookName}({ ${propsPassing} });\n`;

appBody.insertStatements(finalHookIndex, destructureCall);
console.log(`  ✅ Inyectada llamada al Hook en posición segura (índice ${finalHookIndex})`);

const hasImport = appFile.getImportDeclarations().some(imp => 
  imp.getModuleSpecifierValue().includes(hookName)
);

if (!hasImport) {
  appFile.addImportDeclaration({
    moduleSpecifier: `./${hooksFolderName}/${hookName}`,
    namedImports: [hookName]
  });
}

appFile.saveSync();
project.saveSync();

// Auditoría
const finalStats = getFileInfo(appFilePath);
const linesReduced = initialStats.lines - finalStats.lines;

console.log('\n' + '═'.repeat(60));
console.log('📈 INFORME DE EXTRACCIÓN AUTOMÁTICA DE DOMINIO');
console.log('═'.repeat(60));
console.log(`   • Dominio:       ${targetDomainName}`);
console.log(`   • Estado App.tsx: ${initialStats.lines.toLocaleString()} ➔ ${finalStats.lines.toLocaleString()} (${linesReduced} líneas reducidas)`);

console.log('\n⚡ Verificando compilación (npx tsc --noEmit)...');

try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('\n🎉 ¡DESGUACE AUTOMÁTICO EXITOSO! 0 errores de compilación.');
} catch (error) {
  console.log('\n⚠️ Revisa la consola por si resta algún detalle puntual.');
}