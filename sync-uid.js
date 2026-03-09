const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({ projectId: 'demo-sandbox' });
const db = app.firestore();

const OLD_UID = 'UBzL4NXJK1sHQE27h5l5iC6Zl4a2'; // Desde check-uid (Firestore original)
const NEW_UID = 'oXIVudKHDnU4eRkZ06nE82Uu0h43'; // Desde check-uid (Google Auth nuevo local)

async function copyCollection(srcColRef, destColRef) {
    const docs = await srcColRef.get();
    for (const doc of docs.docs) {
        await destColRef.doc(doc.id).set(doc.data());

        // Copy subcollections
        const subCollections = await doc.ref.listCollections();
        for (const subCol of subCollections) {
            await copyCollection(subCol, destColRef.doc(doc.id).collection(subCol.id));
        }
    }
}

async function migrateUser() {
    console.log(`Migrating data from ${OLD_UID} to ${NEW_UID}...`);

    const srcUserRef = db.collection('users').doc(OLD_UID);
    const destUserRef = db.collection('users').doc(NEW_UID);

    // Copy Main Document
    const userDoc = await srcUserRef.get();
    if (userDoc.exists) {
        await destUserRef.set(userDoc.data());
    }

    // Copy Root Subcollections
    const rootCollections = await srcUserRef.listCollections();
    for (const col of rootCollections) {
        console.log(`Copying collection: ${col.id}`);
        await copyCollection(col, destUserRef.collection(col.id));
    }

    console.log('Migration complete!');

    // Clean up
    await srcUserRef.delete();
}

migrateUser().then(() => process.exit(0)).catch(console.error);
