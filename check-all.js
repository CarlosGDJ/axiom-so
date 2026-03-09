const admin = require('firebase-admin');
const fs = require('fs');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({ projectId: 'demo-sandbox' });
const db = app.firestore();

async function check() {
    const usersRef = db.collection('users');
    const snap = await usersRef.get();
    const uids = [];

    if (snap.empty) {
        console.log('No users at all.');
    } else {
        for (const d of snap.docs) {
            uids.push(d.id);

            const pSnap = await d.ref.collection('playerProfile').get();
            console.log(`UID: ${d.id} | Profiles count: ${pSnap.size}`);
            if (pSnap.size > 0) {
                console.log(`  Profile name: ${pSnap.docs[0].data().displayName}`);
            }
        }
    }
}

check().then(() => process.exit(0)).catch(console.error);
