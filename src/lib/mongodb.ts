import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  // Allow build to succeed without MONGODB_URI; will fail at runtime
  client = new MongoClient('mongodb://localhost:27017');
  clientPromise = Promise.resolve(client);
} else if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export { clientPromise };

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
  return c.db('axiom');
}
