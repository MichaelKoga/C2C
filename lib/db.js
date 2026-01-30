import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI not defined");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then(m => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}