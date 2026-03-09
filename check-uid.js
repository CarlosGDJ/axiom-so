const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const app = admin.initializeApp({ projectId: 'demo-sandbox' });
const db = app.firestore();
const auth = app.auth();

async function check() {
    console.log("=== FIRESTORE USERS ===");
    const usersRef = db.collection('users');
    const snap = await usersRef.get();
    const firestoreUIDs = [];
    snap.docs.forEach(d => {
        firestoreUIDs.push(d.id);
        console.log(`- Firestore UID: ${d.id}`);
    });

    console.log("\n=== AUTHENTICATION USERS ===");
    const listUsers = await auth.listUsers();
    listUsers.users.forEach(u => {
        console.log(`- Auth UID: ${u.uid} | Email: ${u.email}`);
    });
}

check().then(() => process.exit(0)).catch(console.error);
