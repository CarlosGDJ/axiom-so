const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'demo-sandbox' });
const db = admin.firestore();

async function run() {
  const usersSnapshot = await db.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    console.log(`\nUsuario: ${uid}`);
    
    // Check events
    const events = await db.collection(`users/${uid}/events`).get();
    console.log(`- events: ${events.size} documentos`);
    for (const doc of events.docs) {
      const data = doc.data();
      if (!data.fecha) {
        console.log(`  [ALERTA] Evento ${doc.id} no tiene fecha:`, data);
      }
    }
    
    // Check interactions
    const interactions = await db.collection(`users/${uid}/interactions`).get();
    console.log(`- interactions: ${interactions.size} documentos`);
    for (const doc of interactions.docs) {
      const data = doc.data();
      if (!data.fecha) {
        console.log(`  [ALERTA] Interacción ${doc.id} no tiene fecha:`, data);
      }
    }

    // Check transactions
    const transactions = await db.collection(`users/${uid}/transactions`).get();
    console.log(`- transactions: ${transactions.size} documentos`);
    for (const doc of transactions.docs) {
      const data = doc.data();
      if (!data.fecha) {
        console.log(`  [ALERTA] Transacción ${doc.id} no tiene fecha:`, data);
      }
    }
  }
}

run().catch(console.error);
