import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in your Vercel environment variables.");
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null
    };
}

export default async function connectMongo() {

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {

        const options = {
            bufferCommands: false
        };

        cached.promise = mongoose
            .connect(MONGODB_URI, options)
            .then((mongooseInstance) => {
                return mongooseInstance;
            })
            .catch((error) => {

                cached.promise = null;

                console.error(
                    "MongoDB connection error:",
                    error
                );

                throw error;
            });
    }

    cached.conn = await cached.promise;

    return cached.conn;
}
