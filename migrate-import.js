const admin = require('firebase-admin');
const fs = require('fs');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const emulatorApp = admin.initializeApp({
    projectId: 'demo-sandbox'
});
const emulatorDb = emulatorApp.firestore();

function revive(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(revive);

    if (obj._seconds !== undefined && Math.abs(obj._seconds) > 0) {
        return new admin.firestore.Timestamp(obj._seconds, obj._nanoseconds || 0);
    }
    if (obj._latitude !== undefined) {
        return new admin.firestore.GeoPoint(obj._latitude, obj._longitude || 0);
    }

    const revived = {};
    for (const [k, v] of Object.entries(obj)) {
        revived[k] = revive(v);
    }
    return revived;
}

async function importCollection(collectionRef, ObjectData) {
    for (const [docId, docInfo] of Object.entries(ObjectData)) {
        const docRef = collectionRef.doc(docId);
        const revivedData = revive(docInfo.__documentData);

        await docRef.set(revivedData);

        for (const [subColId, subColData] of Object.entries(docInfo.__subCollections)) {
            await importCollection(docRef.collection(subColId), subColData);
        }
    }
}

async function runImport() {
    console.log('Starting import to local emulator...');
    if (!fs.existsSync('prod-backup.json')) {
        console.log('No backup file found.');
        return;
    }
    const backup = JSON.parse(fs.readFileSync('prod-backup.json', 'utf8'));
    for (const [colId, colData] of Object.entries(backup)) {
        console.log(`Importing root collection: ${colId}`);
        await importCollection(emulatorDb.collection(colId), colData);
    }
    console.log('Import complete.');
}

runImport().then(() => process.exit(0)).catch(console.error);
