const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'demo-sandbox' });

const db = admin.firestore();
const auth = admin.auth();

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function isoAtDayOffset(dayOffset, hourMin, hourMax) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dayOffset);
  d.setUTCHours(randInt(hourMin, hourMax), randInt(0, 59), randInt(0, 59), 0);
  return d.toISOString();
}

async function commitChunks(ops) {
  const chunkSize = 450;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = ops.slice(i, i + chunkSize);
    for (const op of chunk) {
      batch.set(op.ref, op.data, { merge: true });
    }
    await batch.commit();
  }
}

async function resolveTargetUid() {
  const users = await auth.listUsers(1000);
  if (users.users.length > 0) {
    const byEmail = users.users.find((u) => (u.email || '').toLowerCase() === 'carlosgdj1996@gmail.com');
    return byEmail ? byEmail.uid : users.users[0].uid;
  }

  const fsUsers = await db.collection('users').get();
  if (fsUsers.empty) {
    throw new Error('No hay usuarios en Auth ni en Firestore.');
  }
  return fsUsers.docs[0].id;
}

async function seedForUser(uid) {
  const userRef = db.collection('users').doc(uid);
  const variablesSnap = await userRef.collection('variables').get();
  const relationsSnap = await userRef.collection('relations').get();
  const accountsSnap = await userRef.collection('accounts').get();
  const debtsSnap = await userRef.collection('debts').get();
  const areasSnap = await userRef.collection('areas').get();
  const hormonesSnap = await userRef.collection('hormones').get();

  const variableIds = variablesSnap.docs.map((d) => d.data().var_id).filter(Boolean);
  const relationIds = relationsSnap.docs.map((d) => d.data().persona_id).filter(Boolean);
  const accountIds = accountsSnap.docs.map((d) => d.data().cuenta_id).filter(Boolean);
  const debtIds = debtsSnap.docs.map((d) => d.data().debt_id).filter(Boolean);
  const areaIds = areasSnap.docs.map((d) => d.data().area_id).filter(Boolean);
  const hormoneIds = hormonesSnap.docs.map((d) => d.data().hormone_id).filter(Boolean);

  if (variableIds.length === 0) {
    throw new Error(`El usuario ${uid} no tiene variables. Carga primero los presets/base.`);
  }

  const baseAccount = accountIds[0] || 'BANCO_1';
  const categoriasGasto = [
    'Vivienda',
    'Alimentación',
    'Transporte',
    'Salud y Bienestar',
    'Ocio y Suscripciones',
    'Desarrollo Personal',
    'Compras',
    'Deudas',
    'Otros Gastos',
  ];
  const categoriasIngreso = ['Nómina', 'Freelance/Negocio', 'Ingresos Pasivos', 'Otros Ingresos'];

  const ops = [];
  let eventCount = 0;
  let txCount = 0;
  let interactionCount = 0;
  let scoreCount = 0;

  for (let day = 0; day < 90; day += 1) {
    const eventsToday = randInt(1, 4);
    for (let i = 0; i < eventsToday; i += 1) {
      const varId = pick(variableIds);
      const ref = userRef.collection('events').doc();
      ops.push({
        ref,
        data: {
          evento_id: `EVT_FAKE_${Date.now()}_${day}_${i}_${randInt(1000, 9999)}`,
          fecha: isoAtDayOffset(day, 6, 23),
          var_id: varId,
          intensidad: randInt(1, 5),
          duracion_min: randInt(5, 120),
          contexto: 'Dato ficticio para visualizacion de graficos',
          impulsivo: Math.random() < 0.25,
          tipo: 'Variable',
        },
      });
      eventCount += 1;
    }

    const isPayrollDay = day % 30 === 0 || day % 30 === 15;
    const txToday = isPayrollDay ? randInt(2, 4) : randInt(0, 3);
    for (let i = 0; i < txToday; i += 1) {
      const income = isPayrollDay && i === 0 ? true : Math.random() < 0.18;
      const debtPick = debtIds.length > 0 && Math.random() < 0.22;
      const categoria = income ? pick(categoriasIngreso) : (debtPick ? 'Deudas' : pick(categoriasGasto));
      const amount = income ? randInt(350, 2600) : -randInt(8, 240);
      const ref = userRef.collection('transactions').doc();
      const data = {
        transaccion_id: `TRN_FAKE_${Date.now()}_${day}_${i}_${randInt(1000, 9999)}`,
        fecha: isoAtDayOffset(day, 7, 22),
        tipo: income ? 'Ingreso' : 'Gasto',
        categoria,
        monto: amount,
        impulsivo: !income && Math.random() < 0.3,
        cuenta_id: baseAccount,
        notas: 'Dato ficticio para analiticas financieras',
      };
      if (!income && debtPick) {
        data.deuda_id = pick(debtIds);
      }
      ops.push({ ref, data });
      txCount += 1;
    }

    if (relationIds.length > 0 && day % 2 === 0) {
      const ref = userRef.collection('interactions').doc();
      ops.push({
        ref,
        data: {
          interaccion_id: `INT_FAKE_${Date.now()}_${day}_${randInt(1000, 9999)}`,
          fecha: isoAtDayOffset(day, 9, 23),
          persona_id: pick(relationIds),
          energia_resultante: pick([-1, 0, 1]),
          respeto_percibido: pick([-1, 0, 1]),
          contexto: 'Interaccion ficticia',
        },
      });
      interactionCount += 1;
    }

    const dayDate = new Date();
    dayDate.setUTCDate(dayDate.getUTCDate() - day);
    const dayStr = dayDate.toISOString().slice(0, 10);
    const ref = userRef.collection('computed_daily_score').doc(dayStr);
    ops.push({
      ref,
      data: {
        fecha: dayStr,
        score_total: randInt(35, 92),
      },
    });
    scoreCount += 1;
  }

  for (const areaId of areaIds) {
    ops.push({
      ref: userRef.collection('computed_areas').doc(areaId),
      data: {
        area_id: areaId,
        score_7d: randInt(42, 88),
        estado: pick(['OK', 'RIESGO', 'CRITICO']),
      },
    });
  }

  for (const hormoneId of hormoneIds) {
    ops.push({
      ref: userRef.collection('computed_hormones').doc(hormoneId),
      data: {
        hormone_id: hormoneId,
        current_level: randInt(18, 92),
        delta_24h: randInt(-25, 25),
      },
    });
  }

  ops.push({
    ref: userRef.collection('computed_global_state').doc('latest'),
    data: {
      estado_global: 'RIESGO',
      reason_codes: ['FAKE_ACTIVITY_DATA'],
      explanation: {
        primary_cause: 'Dataset sintético para demo visual',
        secondary_causes: ['Eventos simulados', 'Finanzas simuladas'],
        modifiers: ['No usar para decisiones reales'],
      },
      rpg_stats: {
        dopamina: 58,
        serotonina: 61,
        cortisol: 49,
        foco: 57,
        energia: 54,
        sueño: 52,
        conexion_social: 59,
        carga_dopaminergica: 46,
        player_score: 63,
      },
      is_locked: false,
      lock_reason: '',
      estimated_unlock_time: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  await commitChunks(ops);

  const summary = {
    uid,
    inserted: {
      events: eventCount,
      transactions: txCount,
      interactions: interactionCount,
      computedDailyScores: scoreCount,
    },
  };
  return summary;
}

async function main() {
  const uid = await resolveTargetUid();
  const summary = await seedForUser(uid);
  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

