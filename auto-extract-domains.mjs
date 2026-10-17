import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🤖 Refactorizador AST (Absorción de Rachas v21)...\n');

function getFileInfo(filePath) {
  if (!fs.existsSync(filePath)) return { lines: 0, kb: '0.00 KB' };
  const content = fs.readFileSync(filePath, 'utf-8');
  const bytes = fs.statSync(filePath).size;
  return { lines: content.split('\n').length, kb: (bytes / 1024).toFixed(2) + ' KB' };
}

const srcPath = path.join(process.cwd(), 'src');
const hooksDir = path.join(srcPath, 'Hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const appFilePath = path.join(srcPath, 'App.tsx');
if (!fs.existsSync(appFilePath)) process.exit(1);

const initialStats = getFileInfo(appFilePath);
fs.copyFileSync(appFilePath, path.join(srcPath, 'App.tsx.bak'));

const project = new Project({
  compilerOptions: { allowJs: true, jsx: 1, target: 99, moduleResolution: 2 }
});

const appFile = project.addSourceFileAtPath(appFilePath);

const appTopLevelImports = new Map();
appFile.getImportDeclarations().forEach(imp => {
  const spec = imp.getModuleSpecifierValue();
  imp.getNamedImports().forEach(n => appTopLevelImports.set(n.getName(), { specifier: spec, importName: n.getName() }));
  const def = imp.getDefaultImport();
  if (def) appTopLevelImports.set(def.getText(), { specifier: spec, importName: def.getText() });
});

const constantsFilePath = path.join(srcPath, 'constants.ts');
const availableConstants = new Set();
if (fs.existsSync(constantsFilePath)) {
  const constantsFile = project.addSourceFileAtPath(constantsFilePath);
  constantsFile.getVariableDeclarations().forEach(v => { if (v.isExported()) availableConstants.add(v.getName()); });
}

let appFunc = appFile.getFunctions().find(f => f.getName() === 'App' || f.isDefaultExport());
if (!appFunc) appFunc = appFile.getVariableDeclarations().find(v => v.getName() === 'App');

const appBody = appFunc.getBody();
const targetDomainName = process.argv[2] ? process.argv[2].toLowerCase() : 'asmr';

const domainKeywords = {
  mascot: ['mascot', 'species'],
  asmr: ['asmr'],
  objective: ['objective', 'goal', 'hasentrytoday', 'haspettedtoday', 'todayentries', 'streakdays'],
  equipped: ['equipped', 'skin'],
  streak: ['streak']
};

const searchKeywords = domainKeywords[targetDomainName] || [targetDomainName];
const hookName = `use${targetDomainName.charAt(0).toUpperCase() + targetDomainName.slice(1)}Engine`;
const fileName = `${hookName}.ts`;

const cluster = new Set();
appFunc.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
  const text = id.getText();
  if (searchKeywords.some(kw => text.toLowerCase().includes(kw))) cluster.add(text);
});

let expanded = true;
while (expanded) {
  const prevSize = cluster.size;
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
  expanded = cluster.size > prevSize;
}

const statementsToExtract = [];
const statementsToRemove = [];
const topLevelDeclaredInHook = new Set();
const allReferencedIdentifiers = new Set();

for (const stmt of appFunc.getVariableStatements()) {
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

for (const fn of appFunc.getFunctions()) {
  if (fn.getParent() !== appBody) continue;
  const name = fn.getName();
  if (name && cluster.has(name)) {
    statementsToExtract.push(fn.getText());
    statementsToRemove.push(fn);
    topLevelDeclaredInHook.add(name);
    fn.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => allReferencedIdentifiers.add(id.getText()));
  }
}

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

const autoProps = new Set();
const autoConstantImports = new Set();
const autoTopLevelImports = new Map();
const builtins = new Set(['window', 'Date', 'Math', 'console', 'React', 'useState', 'useRef', 'useEffect', 'useCallback', 'useMemo', 'Array', 'Set', 'Map', 'String', 'Number', 'Boolean', 'undefined', 'null', 'true', 'false', 'e', 'evt', 'event']);

allReferencedIdentifiers.forEach(id => {
  if (!topLevelDeclaredInHook.has(id) && !builtins.has(id)) {
    if (appTopLevelImports.has(id)) {
      const impInfo = appTopLevelImports.get(id);
      if (!autoTopLevelImports.has(impInfo.specifier)) autoTopLevelImports.set(impInfo.specifier, new Set());
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

const hookFilePath = path.join(hooksDir, fileName);
let headerImportsCode = '';
if (autoConstantImports.size > 0) headerImportsCode += `import { ${Array.from(autoConstantImports).join(', ')} } from '../constants';\n`;

autoTopLevelImports.forEach((names, specifier) => {
  const isRelative = specifier.startsWith('.');
  const importPath = isRelative ? path.join('..', specifier).replace(/\\/g, '/') : specifier;
  headerImportsCode += `import { ${Array.from(names).join(', ')} } from '${importPath}';\n`;
});

const propsInterfaceFields = Array.from(autoProps).map(p => `  ${p}?: any;`).join('\n');
const propsDestructure = autoProps.size > 0 ? `  const { ${Array.from(autoProps).join(', ')} } = props;\n\n` : '';

const rawHookContent = `import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

fs.writeFileSync(hookFilePath, rawHookContent, 'utf-8');

const hookSourceFile = project.addSourceFileAtPath(hookFilePath);
[...hookSourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction), ...hookSourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression)].forEach(fn => {
  fn.getParameters().forEach(param => { if (!param.getTypeNode()) param.setType('any'); });
});
hookSourceFile.saveSync();

for (const stmt of statementsToRemove) {
  try { stmt.remove(); } catch (e) {}
}

const remainingStatements = appBody.getStatements();
let targetUsageIndex = -1;
remainingStatements.forEach((stmt, idx) => {
  if (targetUsageIndex !== -1) return;
  const stmtText = stmt.getText();
  if (returnExports.some(retName => stmtText.includes(retName))) {
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
}

const finalHookIndex = targetUsageIndex + sortedHoistedStmts.length;
const propsPassing = Array.from(autoProps).map(p => `${p}`).join(', ');
const destructureCall = `const { ${returnExports.join(', ')} } = ${hookName}({ ${propsPassing} });\n`;

appBody.insertStatements(finalHookIndex, destructureCall);

if (!appFile.getImportDeclarations().some(imp => imp.getModuleSpecifierValue().includes(hookName))) {
  appFile.addImportDeclaration({ moduleSpecifier: `./Hooks/${hookName}`, namedImports: [hookName] });
}

[...appFile.getDescendantsOfKind(SyntaxKind.ArrowFunction), ...appFile.getDescendantsOfKind(SyntaxKind.FunctionExpression)].forEach(fn => {
  fn.getParameters().forEach(param => { if (!param.getTypeNode()) param.setType('any'); });
});

appFile.saveSync();
project.saveSync();

const finalStats = getFileInfo(appFilePath);
console.log(`\n📈 Estado App.tsx: ${initialStats.lines.toLocaleString()} ➔ ${finalStats.lines.toLocaleString()} (${initialStats.lines - finalStats.lines} líneas reducidas)`);
console.log('⚡ Verificando compilación (npx tsc --noEmit)...');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('\n🎉 ¡DESGUACE AUTOMÁTICO EXITOSO! 0 errores de compilación.');
} catch (error) {
  const rawOutput = error.stdout ? error.stdout.toString() : '';
  const errorLines = rawOutput
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('error TS'));

  console.log(`\n❌ Se encontraron ${errorLines.length} errores de TypeScript:\n`);
  console.log(errorLines.slice(0, 15).join('\n'));
  if (errorLines.length > 15) {
    console.log(`\n... y ${errorLines.length - 15} errores más omitidos.`);
  }
}