const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({ projectId: 'demo-sandbox' });
const db = app.firestore();

async function check() {
    const usersRef = db.collection('users');
    const snap = await usersRef.limit(1).get();
    if (snap.empty) {
        console.log("No users found.");
        return;
    }
    const uid = snap.docs[0].id;
    console.log(`Checking UID: ${uid}`);

    const imSnap = await db.collection(`users/${uid}/impactMatrix`).get();
    console.log(`impactMatrix collection has ${imSnap.size} documents.`);

    const deepWorkImpacts = imSnap.docs.filter(d => d.data().var_id === 'DEEP_WORK');
    console.log(`impactMatrix docs for DEEP_WORK: ${deepWorkImpacts.length}`);
    if (deepWorkImpacts.length > 0) {
        console.log(deepWorkImpacts[0].data());
    }

    const eventsSnap = await db.collection(`users/${uid}/events`).get();
    console.log(`events collection has ${eventsSnap.size} documents.`);
    const dwEvents = eventsSnap.docs.filter(d => d.data().var_id === 'DEEP_WORK');
    console.log(`DEEP_WORK events: ${dwEvents.length}`);
}

check().then(() => process.exit(0)).catch(console.error);
