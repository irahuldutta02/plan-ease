import { MongoClient } from "mongodb";
import mongoose from "mongoose";

/**
 * One MongoClient shared by Better Auth and Mongoose.
 * Cached on globalThis so Next.js hot reload does not open new pools.
 */
globalThis.__planeaseMongo ||= {};
const cache = globalThis.__planeaseMongo;

function createClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
  }
  return new MongoClient(uri);
}

/** The shared client. The driver connects lazily on first use. */
cache.client ||= createClient();
export const client = cache.client;

/**
 * Mongoose connection that reuses the shared client.
 * Mongoose requires `connect()` to have been called before `setClient()`.
 * @returns {Promise<import("mongoose").Connection>}
 */
export function connectMongoose() {
  cache.connection ||= (async () => {
    await client.connect();
    const connection = mongoose.createConnection();
    connection.setClient(client);
    return connection;
  })().catch((error) => {
    cache.connection = undefined; // allow a retry on the next request
    throw error;
  });
  return cache.connection;
}
