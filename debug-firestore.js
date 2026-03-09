const admin = require('firebase-admin');
const fs = require('fs');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({ projectId: 'demo-sandbox' });
const db = app.firestore();

const TARGET_UID = 'oXIVudKHDnU4eRkZ06nE82Uu0h43';

async function debugData() {
    const result = { uid: TARGET_UID, mainDoc: false, collections: {} };

    const destUserRef = db.collection('users').doc(TARGET_UID);
    const userDoc = await destUserRef.get();

    if (userDoc.exists) {
        result.mainDoc = userDoc.data();
    }

    const collections = ['playerProfile', 'areas', 'hormones', 'impactMatrix', 'events', 'computed_global_state'];

    for (const col of collections) {
        const snap = await destUserRef.collection(col).get();
        result.collections[col] = {
            count: snap.size,
            samples: snap.docs.slice(0, 2).map(d => ({ id: d.id }))
        };
    }

    fs.writeFileSync('debug-output.json', JSON.stringify(result, null, 2));
}

debugData().then(() => process.exit(0)).catch(console.error);
