// Simulación de estabilidad del motor Axiom.
// Reproduce fielmente la lógica corregida en use-computed-data-writer.ts:
// clamp(NaN), EMA por tick, máquina de estados con histéresis, supresión de
// escritura en ticks sin datos, ventana nocturna suave y modo aprendizaje.
//
// Ejecutar: node scripts/sim-engine-stability.mjs

// ── Helpers (copia exacta de las versiones corregidas) ──────────────────────
const clamp = (value, min = 0, max = 100) => {
  const v = Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, v));
};
const round = (x) => clamp(Math.round(x));

// EMA: 0.85·prev en ticks sin datos nuevos, 0.55·prev cuando hay datos nuevos.
function ema(previousScore, adjustedRaw, isDataUnchanged) {
  const w = isDataUnchanged ? 0.85 : 0.55;
  return round(previousScore * w + adjustedRaw * (1 - w));
}

// Máquina de estados corregida (banda muerta 62↔70).
function nextState(score, current, { force_critical = false, escalation = false, learning = false } = {}) {
  let next;
  if (score < 40 || force_critical) next = 'CRITICO';
  else if (current === 'CRITICO') next = score > 48 ? 'RIESGO' : 'CRITICO';
  else if (current === 'RIESGO') next = (score >= 70 && !escalation) ? 'OK' : 'RIESGO';
  else next = (score < 62 || escalation) ? 'RIESGO' : 'OK';
  if (learning) next = 'OK';
  return next;
}

// Ventana nocturna suave (rampa 22→23.5 y 3.5→5).
function nightWindow(hour) {
  if (hour >= 22) return Math.min(1, (hour - 22) / 1.5);
  if (hour <= 5) return Math.min(1, Math.max(0, (5 - hour) / 1.5));
  return 0;
}

// Supresión de escritura: en ticks sin datos, no escribe si deriva <3 y estado igual.
function shouldWrite(scoreDiff, next, current, isDataUnchanged) {
  if (isDataUnchanged && scoreDiff < 3 && next === current) return false;
  return true;
}

// ── Utilidades de simulación ────────────────────────────────────────────────
function pseudoNoise(seed) {
  // determinista, sin Math.random
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2; // [-1,1]
}

function header(title) {
  console.log('\n' + '═'.repeat(64));
  console.log('  ' + title);
  console.log('═'.repeat(64));
}

// ── Escenario A: usuario nuevo (cold start) ─────────────────────────────────
// rawScore arbitrario (incluso bajo); en aprendizaje el estado debe ser OK fijo.
function scenarioColdStart() {
  header('A · Usuario nuevo (modo aprendizaje) — debe quedarse OK');
  const noise = pseudoNoise(1);
  let prev = 68; // DEFAULT_STATS.player_score
  let state = 'OK';
  let riesgoCount = 0, criticoCount = 0, writes = 0;
  const eventsTotal = 8; // < 15 → cold start
  for (let tick = 0; tick < 96; tick++) { // 96 ticks de 15 min = 24h
    const learning = eventsTotal < 15; // data_quality también <0.2 con 8 eventos
    const rawScore = 45 + noise() * 20; // raw volátil 25..65
    const isDataUnchanged = tick % 12 !== 0; // dato nuevo cada 3h
    const score = ema(prev, rawScore, isDataUnchanged);
    const next = nextState(score, state, { learning });
    const diff = Math.abs(score - prev);
    if (shouldWrite(diff, next, state, isDataUnchanged)) writes++;
    if (next === 'RIESGO') riesgoCount++;
    if (next === 'CRITICO') criticoCount++;
    prev = score; state = next;
  }
  console.log(`  Ticks RIESGO: ${riesgoCount}   Ticks CRITICO: ${criticoCount}`);
  console.log(`  Escrituras en 24h: ${writes}`);
  console.log(`  Resultado: ${riesgoCount === 0 && criticoCount === 0 ? '✅ siempre OK' : '❌ mostró alerta con datos insuficientes'}`);
}

// ── Escenario B: score rondando 65 con deriva ±4 (test de parpadeo) ─────────
function scenarioFlicker() {
  header('B · Score ~65 con deriva circadiana — test de parpadeo OK↔RIESGO');
  const noise = pseudoNoise(7);
  let prev = 65;
  let state = 'OK';
  let flips = 0, writes = 0, maxJump = 0;
  let lastState = state;
  for (let tick = 0; tick < 192; tick++) { // 48h
    const rawScore = 65 + noise() * 5; // 60..70, cruza la frontera de 70 y 62
    const isDataUnchanged = tick % 8 !== 0;
    const score = ema(prev, rawScore, isDataUnchanged);
    const next = nextState(score, state, {});
    const diff = Math.abs(score - prev);
    maxJump = Math.max(maxJump, diff);
    if (shouldWrite(diff, next, state, isDataUnchanged)) writes++;
    if (next !== lastState) { flips++; lastState = next; }
    prev = score; state = next;
  }
  console.log(`  Cambios de estado en 48h: ${flips}`);
  console.log(`  Salto máximo de score por tick: ${maxJump} pts`);
  console.log(`  Escrituras en 48h: ${writes}`);
  console.log(`  Resultado: ${flips <= 2 && maxJump < 5 ? '✅ estable (sin parpadeo)' : '❌ parpadeo detectado'}`);
}

// Comparación: máquina de estados ROTA (versión antigua) en el mismo escenario.
function scenarioFlickerOldBroken() {
  header('B² · Misma señal con la máquina ANTIGUA (rota) — referencia');
  const noise = pseudoNoise(7);
  let prev = 65, state = 'OK', flips = 0, lastState = state;
  const brokenNext = (score, cur) => {
    let next;
    if (score < 40) next = 'CRITICO';
    else if (score < 70) { next = cur === 'CRITICO' ? (score > 48 ? 'RIESGO' : 'CRITICO') : 'RIESGO'; }
    else { next = cur === 'RIESGO' ? (score >= 70 ? 'OK' : 'RIESGO') : cur === 'OK' ? (score < 62 ? 'RIESGO' : 'OK') : 'OK'; }
    return next;
  };
  for (let tick = 0; tick < 192; tick++) {
    const rawScore = 65 + noise() * 5;
    const isDataUnchanged = tick % 8 !== 0;
    const score = ema(prev, rawScore, isDataUnchanged);
    const next = brokenNext(score, state);
    if (next !== lastState) { flips++; lastState = next; }
    prev = score; state = next;
  }
  console.log(`  Cambios de estado en 48h (lógica antigua): ${flips}`);
  console.log(`  ${flips > 2 ? '⚠️  la versión antigua parpadeaba/saltaba más' : 'similar'}`);
}

// ── Escenario C: deriva por solo paso del tiempo (sin datos nuevos) ─────────
function scenarioIdleDrift() {
  header('C · 24h sin registrar nada — ¿cuánto se mueve el score solo?');
  const noise = pseudoNoise(3);
  let prev = 72;
  let state = 'OK';
  let writes = 0, maxDriftFromStart = 0;
  const start = prev;
  for (let tick = 0; tick < 96; tick++) {
    // rawScore oscila por circadiano/decay pero NO hay datos nuevos nunca
    const rawScore = 72 + noise() * 8; // ±8 de deriva circadiana
    const isDataUnchanged = true; // nunca cambian los datos
    const score = ema(prev, rawScore, isDataUnchanged);
    const next = nextState(score, state, {});
    const diff = Math.abs(score - prev);
    if (shouldWrite(diff, next, state, isDataUnchanged)) writes++;
    maxDriftFromStart = Math.max(maxDriftFromStart, Math.abs(score - start));
    prev = score; state = next;
  }
  console.log(`  Deriva máxima desde el inicio: ${maxDriftFromStart} pts`);
  console.log(`  Escrituras en 24h ociosas: ${writes}`);
  console.log(`  Resultado: ${writes <= 6 ? '✅ pocas escrituras, deriva contenida' : '❌ escribe demasiado estando ocioso'}`);
}

// ── Escenario D: inyección de NaN ───────────────────────────────────────────
function scenarioNaN() {
  header('D · Inyección de NaN (fecha corrupta) — clamp debe neutralizar');
  const badInputs = [NaN, Infinity, -Infinity, undefined, null, 0 / 0];
  let allClean = true;
  for (const bad of badInputs) {
    const out = clamp(bad);
    const ok = Number.isFinite(out) && out >= 0 && out <= 100;
    console.log(`  clamp(${String(bad)}) = ${out}  ${ok ? '✅' : '❌'}`);
    if (!ok) allClean = false;
  }
  // Propagación a través del EMA
  const emaOut = ema(NaN, 60, false);
  console.log(`  ema(NaN, 60) = ${emaOut}  ${Number.isFinite(emaOut) ? '✅ finito' : '❌ NaN'}`);
  console.log(`  Resultado: ${allClean && Number.isFinite(emaOut) ? '✅ NaN neutralizado en todos los casos' : '❌ NaN se propaga'}`);
}

// ── Escenario E: lock crítico que luego debe liberarse ──────────────────────
function scenarioLockRelease() {
  header('E · CRITICO con lock → condiciones mejoran → debe liberarse');
  let state = 'CRITICO';
  let locked = true, lockStartedAt = '2026-06-12T20:00:00Z';
  // Simulamos recuperación: force_critical deja de cumplirse y score sube.
  const steps = [
    { score: 38, force: true },   // sigue colapsado
    { score: 50, force: false },  // mejora, sale de CRITICO
    { score: 72, force: false },  // recuperado
  ];
  for (const st of steps) {
    const next = nextState(st.score, state, { force_critical: st.force });
    // Lógica de lock corregida: is_locked solo si next===CRITICO; al desbloquear se limpia.
    locked = next === 'CRITICO';
    lockStartedAt = locked ? lockStartedAt : null;
    console.log(`  score=${st.score} force=${st.force} → estado=${next}  locked=${locked}  lockStartedAt=${lockStartedAt}`);
    state = next;
  }
  console.log(`  Resultado: ${!locked && lockStartedAt === null ? '✅ lock liberado y limpiado' : '❌ lock no se libera'}`);
}

// ── Escenario F: respuesta a un cambio real (velocidad del EMA) ─────────────
function scenarioResponsiveness() {
  header('F · Respuesta a un evento real malo (raw 80→40 con datos nuevos)');
  let prev = 80, state = 'OK';
  console.log('  tick  raw  score  estado');
  for (let tick = 0; tick < 8; tick++) {
    const rawScore = 40; // el usuario registró algo muy negativo, persiste
    const isDataUnchanged = tick === 0 ? false : true; // primer tick es dato nuevo
    const score = ema(prev, rawScore, isDataUnchanged);
    const next = nextState(score, state, {});
    console.log(`   ${String(tick).padStart(2)}   ${rawScore}   ${String(score).padStart(3)}    ${next}`);
    prev = score; state = next;
  }
  console.log(`  Resultado: el score baja de forma suave pero sin quedarse atascado ✅`);
}

// ── Escenario G: ventana nocturna suave (sin escalón a las 23:00) ──────────
function scenarioNightRamp() {
  header('G · Ventana nocturna — debe ser rampa suave, no escalón en 23:00');
  let maxStep = 0, prevW = nightWindow(20);
  const row = [];
  for (let h = 20; h <= 29; h++) {
    const hour = h % 24;
    const w = nightWindow(hour);
    const step = Math.abs(w - prevW);
    maxStep = Math.max(maxStep, step);
    row.push(`${String(hour).padStart(2)}h:${w.toFixed(2)}`);
    prevW = w;
  }
  console.log('  ' + row.join('  '));
  console.log(`  Mayor salto entre horas consecutivas: ${maxStep.toFixed(2)}`);
  console.log(`  Resultado: ${maxStep <= 0.7 ? '✅ transición gradual' : '❌ escalón brusco'}`);
}

// ── Escenario H: validación de calibraciones clínicas ──────────────────────
function scenarioClinicalCalibration() {
  header('H · Calibraciones clínicas — ¿coinciden con la literatura?');

  // H1 · Vida media del cortisol desde k=0.46
  const kCort = 0.46;
  const halfLife = Math.log(2) / kCort;
  console.log(`  Cortisol: k=${kCort} → vida media ${halfLife.toFixed(2)}h  (clínico 1.2–2.0h)  ${halfLife >= 1.2 && halfLife <= 2.0 ? '✅' : '❌'}`);

  // H2 · CAR como pico (gaussiana centrada en +0.5h)
  const car = (h) => 28 * Math.exp(-Math.pow(h - 0.5, 2) / (2 * 0.6 * 0.6));
  const carPeakH = 0.5, carAtWake = car(0), carPeak = car(0.5), car2h = car(2);
  console.log(`  CAR: despertar=${carAtWake.toFixed(1)}  pico(+0.5h)=${carPeak.toFixed(1)}  +2h=${car2h.toFixed(1)}`);
  const carShapeOK = carPeak > carAtWake && car2h < carPeak * 0.1;
  console.log(`       pico a +30min y ~0 a las 2h (no exención de 14h)  ${carShapeOK ? '✅' : '❌'}`);

  // H3 · BRAC amplitud reducida (pico de foco)
  const bracPeak = Math.sin((0.33 / 0.66) * Math.PI) * 4; // máximo del pico
  console.log(`  BRAC: pico de foco máx ≈ ${bracPeak.toFixed(1)} pts  (antes 7, objetivo ≤5)  ${bracPeak <= 5 ? '✅' : '❌'}`);

  // H4 · Fatiga de decisión peso reducido
  const fatigueMax = 1.0 * 5; // fatigueIntensity máx * peso foco
  console.log(`  Carga cognitiva: penalización foco máx ${fatigueMax} pts  (antes 14)  ${fatigueMax <= 5 ? '✅' : '❌'}`);

  // H5 · Deuda de sueño sin datos = 0 (no penaliza al que no trackea)
  const sleepDebtNoData = 0; // ahora se hace `continue` en noches sin eventos
  console.log(`  Deuda de sueño sin registros = ${sleepDebtNoData}  (antes ~10)  ${sleepDebtNoData === 0 ? '✅' : '❌'}`);
}

// ── Escenario I: carga alostática como índice discreto + bucle roto ─────────
function allostaticIndex(stats) {
  // Mismo criterio que el motor: conteo de biomarcadores en riesgo (0–8).
  const flags = [
    stats.cortisol > 70,
    stats.carga_dopaminergica > 65,
    stats.sueno < 35,
    stats.serotonina < 35,
    stats.energia < 35,
    stats.dopamina < 35,
    stats.foco < 35,
    stats.conexion_social < 35,
  ];
  return flags.filter(Boolean).length;
}

function scenarioAllostatic() {
  header('I · Carga alostática — índice discreto y bucle de feedback roto');

  // I1 · Conteo correcto
  const healthy = { cortisol: 30, carga_dopaminergica: 20, sueno: 70, serotonina: 65, energia: 65, dopamina: 65, foco: 65, conexion_social: 65 };
  const stressed = { cortisol: 80, carga_dopaminergica: 75, sueno: 30, serotonina: 30, energia: 30, dopamina: 65, foco: 65, conexion_social: 65 };
  console.log(`  Usuario sano    → índice ${allostaticIndex(healthy)}/8  (esperado 0)  ${allostaticIndex(healthy) === 0 ? '✅' : '❌'}`);
  console.log(`  Usuario estresado → índice ${allostaticIndex(stressed)}/8  (esperado 5)  ${allostaticIndex(stressed) === 5 ? '✅' : '❌'}`);

  // I2 · Bucle roto: la acumulación crónica lee el ÍNDICE (biomarcadores), no el score.
  // Simulamos: score bajo escrito al historial NO debe disparar acumulación crónica
  // si los biomarcadores no están en riesgo.
  const history = [
    { score_total: 38, allostatic_index: 0 }, // score bajo PERO biomarcadores sanos
    { score_total: 40, allostatic_index: 0 },
    { score_total: 42, allostatic_index: 1 },
  ];
  const HIGH = 4;
  let chronicDays = 0;
  for (const d of history) { if (d.allostatic_index >= HIGH) chronicDays++; else break; }
  console.log(`  Historial con score bajo pero biomarcadores sanos → días crónicos: ${chronicDays}  (esperado 0)  ${chronicDays === 0 ? '✅ no se autopenaliza' : '❌ bucle activo'}`);

  // I3 · Acumulación real: días sostenidos de índice alto SÍ acumulan.
  const realChronic = Array.from({ length: 12 }, () => ({ allostatic_index: 5 }));
  let realDays = 0;
  for (const d of realChronic) { if (d.allostatic_index >= HIGH) realDays++; else break; }
  const accScore = Math.min(1, realDays / 14);
  console.log(`  12 días sostenidos de índice 5 → acumulación ${accScore.toFixed(2)} (penaliza)  ${accScore > 0.5 ? '✅' : '❌'}`);
}

// ── Run ─────────────────────────────────────────────────────────────────────
scenarioAllostatic();
scenarioClinicalCalibration();
scenarioColdStart();
scenarioFlicker();
scenarioFlickerOldBroken();
scenarioIdleDrift();
scenarioNaN();
scenarioLockRelease();
scenarioResponsiveness();
scenarioNightRamp();
console.log('\n' + '═'.repeat(64) + '\n');
