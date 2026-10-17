import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🤖 Refactorizando almacenamiento al patrón In-Memory Cache...\n');

const project = new Project({
  compilerOptions: { allowJs: true, jsx: 1, target: 99, moduleResolution: 2 }
});

const srcPath = path.join(process.cwd(), 'src');

// ----------------------------------------------------------------------
// 1. Refactor de i18n.ts
// ----------------------------------------------------------------------
const i18nPath = path.join(srcPath, 'i18n.ts');
if (fs.existsSync(i18nPath)) {
  const i18nFile = project.addSourceFileAtPath(i18nPath);
  i18nFile.removeDefaultWithTarget();
  
  // Reemplazar implementación de lectura e idioma guardado
  const content = i18nFile.getFullText();
  if (!content.includes('let cachedLanguage')) {
    i18nFile.replaceWithText(
      `import { storageService } from './services/storageService';\n` +
      `let cachedLanguage: string = 'es';\n\n` +
      `export function getSavedLanguage(): string {\n` +
      `  return cachedLanguage;\n` +
      `}\n\n` +
      `export async function initLanguage(): Promise<string> {\n` +
      `  cachedLanguage = await storageService.get(LANG_STORAGE_KEY, 'es');\n` +
      `  return cachedLanguage;\n` +
      `}\n\n` +
      `export async function setSavedLanguage(lang: string): Promise<void> {\n` +
      `  cachedLanguage = lang;\n` +
      `  await storageService.set(LANG_STORAGE_KEY, lang);\n` +
      `}\n` + content
    );
  }
  i18nFile.saveSync();
  console.log('✅ i18n.ts refactorizado con caché síncrono.');
}

// ----------------------------------------------------------------------
// 2. Refactor de soundEffects.ts
// ----------------------------------------------------------------------
const soundPath = path.join(srcPath, 'soundEffects.ts');
if (fs.existsSync(soundPath)) {
  const soundFile = project.addSourceFileAtPath(soundPath);
  let code = soundFile.getFullText();
  
  // Garantizar que getSensoryPreferences sea síncrono
  code = code.replace(
    /export async function getSensoryPreferences\(\)[^\{]+\{([\s\S]*?)\}/,
    `let cachedSensory: any = { soundEnabled: true, hapticsEnabled: true };\n` +
    `export function getSensoryPreferences() { return cachedSensory; }\n` +
    `export async function initSensoryPreferences() {\n` +
    `  cachedSensory = await storageService.get(SENSORY_STORAGE_KEY, cachedSensory);\n` +
    `  return cachedSensory;\n` +
    `}`
  );
  soundFile.replaceWithText(code);
  soundFile.saveSync();
  console.log('✅ soundEffects.ts refactorizado.');
}

// ----------------------------------------------------------------------
// 3. Refactor de getLaunchEndTimestamp.ts
// ----------------------------------------------------------------------
const launchPath = path.join(srcPath, 'utils', 'getLaunchEndTimestamp.ts');
if (fs.existsSync(launchPath)) {
  const launchFile = project.addSourceFileAtPath(launchPath);
  launchFile.replaceWithText(
    `import { storageService } from '../services/storageService';\n` +
    `const LAUNCH_DEADLINE_STORAGE_KEY = 'objectivereacher_launch_deadline';\n` +
    `let cachedDeadline: number | null = null;\n\n` +
    `export function getLaunchEndTimestamp(): number {\n` +
    `  if (cachedDeadline !== null) return cachedDeadline;\n` +
    `  return Date.now() + 7 * 24 * 60 * 60 * 1000;\n` +
    `}\n\n` +
    `export async function initLaunchEndTimestamp(): Promise<number> {\n` +
    `  const saved = await storageService.get<string | null>(LAUNCH_DEADLINE_STORAGE_KEY, null);\n` +
    `  if (saved) {\n` +
    `    cachedDeadline = Number(saved);\n` +
    `  } else {\n` +
    `    cachedDeadline = Date.now() + 7 * 24 * 60 * 60 * 1000;\n` +
    `    await storageService.set(LAUNCH_DEADLINE_STORAGE_KEY, String(cachedDeadline));\n` +
    `  }\n` +
    `  return cachedDeadline;\n` +
    `}\n`
  );
  launchFile.saveSync();
  console.log('✅ getLaunchEndTimestamp.ts refactorizado.');
}

project.saveSync();

console.log('\n⚡ Verificando compilación de TypeScript (npx tsc --noEmit)...');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('\n🎉 ¡MIGRACIÓN COMPLETADA CON 0 ERRORES DE COMPILACIÓN!');
} catch (error) {
  const rawOutput = error.stdout ? error.stdout.toString() : '';
  const errorLines = rawOutput
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('error TS'));

  console.log(`\n⚠️ Errores pendientes (${errorLines.length}):\n`);
  console.log(errorLines.slice(0, 15).join('\n'));
}