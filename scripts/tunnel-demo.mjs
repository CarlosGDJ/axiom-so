#!/usr/bin/env node
/**
 * tunnel-demo.mjs
 *
 * Expone la app + emulador Firestore al exterior y configura .env.local en
 * modo producción-auth para que Google sign-in funcione con usuarios reales.
 *
 * URL FIJA (recomendado):
 *   1. Crea cuenta en ngrok.com
 *   2. Consigue tu dominio estático: dashboard.ngrok.com/domains
 *   3. Copia tu authtoken:          dashboard.ngrok.com/authtokens
 *   4. winget install ngrok.ngrok && ngrok config add-authtoken TU_TOKEN
 *   5. Añade NGROK_DOMAIN=tu-dominio.ngrok-free.app en .env.local
 *      (solo la primera vez — ya no cambia nunca)
 *
 * URL ALEATORIA (sin cuenta):
 *   Solo necesitas cloudflared: winget install Cloudflare.cloudflared
 *
 * Flujo de uso:
 *   1. npm run emulator:core    (terminal A)
 *   2. npm run tunnel:demo      (terminal B)
 */

import { spawn } from 'child_process';
import { createConnection } from 'net';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const TUNNEL_TIMEOUT_MS = 60_000;
const ENV_LOCAL_PATH = resolve(process.cwd(), '.env.local');

// Lee el .env.local original para parsear NGROK_DOMAIN si existe
function readEnvFile(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}
function parseEnvVar(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

/** Inicia un túnel ngrok con dominio fijo y devuelve la URL pública */
function startNgrokTunnel(port, domain) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ngrok', ['http', `--url=${domain}`, `${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // ngrok ya tiene la URL fija — resolverla inmediatamente
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error(`Timeout iniciando ngrok para dominio ${domain}`));
    }, TUNNEL_TIMEOUT_MS);

    // ngrok imprime el URL en stdout o stderr; lo confirmamos cuando el proceso arranca
    const tryResolve = (data) => {
      // ngrok puede emitir JSON o texto; en cualquier caso la URL ya la conocemos
      if (!ready && proc.pid) {
        ready = true;
        clearTimeout(timer);
        resolve({ url: `https://${domain}`, proc });
      }
    };
    proc.stdout.on('data', tryResolve);
    proc.stderr.on('data', tryResolve);
    // También resolver a los 2s si ya arrancó el proceso (ngrok no siempre imprime nada)
    setTimeout(() => { if (!ready && proc.pid) { ready = true; clearTimeout(timer); resolve({ url: `https://${domain}`, proc }); } }, 2000);

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(
        `No se pudo arrancar ngrok.\n` +
        `  ¿Está instalado y configurado? (winget install ngrok.ngrok && ngrok config add-authtoken TU_TOKEN)\n  ${err.message}`
      ));
    });
  });
}

/** Inicia un túnel cloudflared (URL aleatoria) */
function startCloudflareTunnel(port, label) {
  const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
  return new Promise((resolve, reject) => {
    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) reject(new Error(`Timeout esperando túnel para "${label}" (puerto ${port})`));
    }, TUNNEL_TIMEOUT_MS);

    const handleOutput = (data) => {
      const match = data.toString().match(URL_RE);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ url: match[0], proc });
      }
    };

    proc.stdout.on('data', handleOutput);
    proc.stderr.on('data', handleOutput);
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(
        `No se pudo arrancar cloudflared para "${label}".\n` +
        `  ¿Está instalado? (winget install Cloudflare.cloudflared)\n  ${err.message}`
      ));
    });
  });
}

function waitForPort(port, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const sock = createConnection({ port, host: '127.0.0.1' });
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() >= deadline) reject(new Error(`Timeout: puerto ${port} no respondió`));
        else setTimeout(attempt, 600);
      });
    };
    attempt();
  });
}

function killAll(procs) {
  for (const p of procs) {
    try { p.kill('SIGTERM'); } catch { /* ya terminó */ }
  }
}

async function main() {
  const originalEnvLocal = readEnvFile(ENV_LOCAL_PATH);
  const ngrokDomain = parseEnvVar(originalEnvLocal, 'NGROK_DOMAIN');

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         Axiom — Demo Tunnel                      ║');
  console.log(`║         Modo: ${ngrokDomain ? 'ngrok (URL fija)       ' : 'cloudflared (URL aleatoria)'}         ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('ℹ️  Asegúrate de que los emuladores Firebase estén corriendo:');
  console.log('   npm run emulator:core\n');

  const restoreEnvLocal = () => {
    try { writeFileSync(ENV_LOCAL_PATH, originalEnvLocal, 'utf8'); } catch { /* ignorar */ }
  };

  console.log('🚇 Abriendo túnel para Firestore (8080)...\n');
  // Firestore siempre en cloudflared — URL aleatoria, solo la usa el código internamente
  const { url: fsUrl, proc: fsProc } = await startCloudflareTunnel(8080, 'Firestore emulator');
  const fsHost = new URL(fsUrl).hostname;
  console.log(`  ✅ Firestore → ${fsUrl}`);

  // Escribir config en .env.local ANTES de arrancar Next.js para que lo lea desde el inicio
  // y sobreviva a cualquier reinicio automático del servidor de desarrollo.
  const tunnelEnv = [
    `NEXT_PUBLIC_USE_EMULATOR=false`,
    `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=${fsHost}`,
    `NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT=443`,
    `NEXT_PUBLIC_APP_URL=__PENDING__`,
    ...(ngrokDomain ? [`NGROK_DOMAIN=${ngrokDomain}`] : []),
  ].join('\n');
  writeFileSync(ENV_LOCAL_PATH, tunnelEnv + '\n', 'utf8');

  console.log('\n🚀 Arrancando Next.js...\n');
  const nextProc = spawn('npm', ['run', 'dev'], {
    env: {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
      GCLOUD_PROJECT: 'demo-sandbox',
    },
    stdio: 'inherit',
    shell: true,
  });

  // Dar tiempo a Next.js para que tome el puerto 3000 antes de tunelizarlo
  console.log('⏳ Esperando que Next.js arranque en el puerto 3000...\n');
  await new Promise(r => setTimeout(r, 3000)); // pequeña espera inicial
  await waitForPort(3000);

  console.log('🚇 Abriendo túnel para la app (3000)...\n');
  const { url: appUrl, proc: appProc } = ngrokDomain
    ? await startNgrokTunnel(3000, ngrokDomain)
    : await startCloudflareTunnel(3000, 'Next.js app');
  console.log(`  ✅ App       → ${appUrl}`);

  // Actualizar NEXT_PUBLIC_APP_URL con la URL real
  writeFileSync(
    ENV_LOCAL_PATH,
    tunnelEnv.replace('NEXT_PUBLIC_APP_URL=__PENDING__', `NEXT_PUBLIC_APP_URL=${appUrl}`) + '\n',
    'utf8'
  );

  const all = [fsProc, nextProc, appProc];

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                  ¡DEMO LISTA! 🎉                 ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  📱 Comparte esta URL:\n');
  console.log(`     ${appUrl}\n`);
  if (!ngrokDomain) {
    console.log('  💡 Para URL fija: añade NGROK_DOMAIN=tu-dominio.ngrok-free.app en .env.local');
    console.log('     Ver instrucciones: dashboard.ngrok.com/domains\n');
  }
  console.log('  ⚠️  Google sign-in requiere dominio autorizado en Firebase Console:');
  console.log('     Authentication → Settings → Authorized domains →', new URL(appUrl).hostname);
  console.log('');
  console.log('  Ctrl+C para detener todo.\n');

  const cleanup = () => {
    console.log('\n🛑 Deteniendo túneles y servidor...');
    killAll(all);
    restoreEnvLocal();
    console.log('✅ .env.local restaurado.');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  nextProc.on('close', (code) => {
    console.log(`\nNext.js terminó (código ${code ?? 0}). Cerrando túneles...`);
    killAll([fsProc, appProc]);
    restoreEnvLocal();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
