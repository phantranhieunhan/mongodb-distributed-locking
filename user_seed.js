const { MongoClient } = require("mongodb");
const faker = require("faker");

const uri = "mongodb://root:example@localhost:27017";
const dbName = "demo_caching";
const collectionName = "Users";
const TOTAL_USERS = 1_000_000;
const BATCH_SIZE = 2000;
const ROLES = ["admin", "buyer", "seller"];

function getRandomRole() {
  return ROLES[Math.floor(Math.random() * ROLES.length)];
}

function getRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function generateUser() {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email(firstName, lastName);
  const phoneNumber = faker.phone.phoneNumber();
  const dob = getRandomDate(new Date(1950, 0, 1), new Date(2005, 0, 1));
  const now = new Date();
  return {
    email,
    firstName,
    lastName,
    phoneNumber,
    dob,
    createdAt: now,
    updatedAt: now,
    role: getRandomRole(),
  };
}

async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    console.log("Connected to MongoDB");
    await collection.deleteMany({});
    console.log("Cleared Users collection");

    for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < TOTAL_USERS; j++) {
        batch.push(generateUser());
      }
      await collection.insertMany(batch);
      console.log(`Inserted ${i + batch.length} / ${TOTAL_USERS}`);
    }
    console.log("Seeding complete!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

seed();

