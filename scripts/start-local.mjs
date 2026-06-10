#!/usr/bin/env node
/**
 * start-local.mjs
 *
 * Modo producción con datos locales:
 *   - El app corre en Render (siempre online)
 *   - El emulador Firestore corre en tu máquina
 *   - ngrok expone el emulador con URL fija para que Render lo alcance
 *
 * Uso:
 *   1. npm run emulator:core   (en una terminal)
 *   2. npm run start:local     (en otra terminal)
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ENV_LOCAL_PATH = resolve(process.cwd(), '.env.local');

function readEnvFile(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}
function parseEnvVar(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

async function main() {
  const originalEnvLocal = readEnvFile(ENV_LOCAL_PATH);
  const ngrokDomain = parseEnvVar(originalEnvLocal, 'NGROK_DOMAIN');

  if (!ngrokDomain) {
    console.error('❌ NGROK_DOMAIN no está definido en .env.local');
    console.error('   Añade: NGROK_DOMAIN=sullen-armed-antitoxic.ngrok-free.dev');
    process.exit(1);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      Axiom — Firestore Local → Render            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 App en Render (siempre online)`);
  console.log(`🗄️  Firestore local → tunel: https://${ngrokDomain}\n`);

  // Restaurar .env.local al estado de desarrollo local
  const restoreEnvLocal = () => {
    try { writeFileSync(ENV_LOCAL_PATH, originalEnvLocal, 'utf8'); } catch { /* ignorar */ }
  };

  // Abrir ngrok apuntando al emulador Firestore (8080), no al app
  console.log('🚇 Abriendo túnel ngrok → Firestore (8080)...\n');
  const ngrokProc = spawn('ngrok', ['http', `--url=${ngrokDomain}`, '8080'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let tunnelReady = false;
  const waitForNgrok = new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('Timeout esperando ngrok')), 30_000);
    const check = (data) => {
      if (!tunnelReady && ngrokProc.pid) {
        tunnelReady = true;
        clearTimeout(timer);
        res();
      }
    };
    ngrokProc.stdout.on('data', check);
    ngrokProc.stderr.on('data', check);
    setTimeout(() => { if (!tunnelReady && ngrokProc.pid) { tunnelReady = true; clearTimeout(timer); res(); } }, 2500);
    ngrokProc.on('error', (err) => { clearTimeout(timer); rej(err); });
  });

  await waitForNgrok;
  console.log(`  ✅ Firestore tunnel activo → https://${ngrokDomain}\n`);

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                    ¡LISTO! 🎉                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Render conecta a tu Firestore local mientras esto esté corriendo.');
  console.log('  Ctrl+C para cerrar el túnel.\n');

  const cleanup = () => {
    console.log('\n🛑 Cerrando túnel Firestore...');
    try { ngrokProc.kill('SIGTERM'); } catch { /* ignorar */ }
    restoreEnvLocal();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
