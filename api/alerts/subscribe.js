import { MongoClient } from "mongodb";

let client;
let clientPromise;

function getClient() {
    if (!clientPromise) {
        client = new MongoClient(process.env.MONGODB_URI);
        clientPromise = client.connect();
    }

    return clientPromise;
}

export default async function handler(req, res) {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    try {

        const { email, categories } = req.body || {};

        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "A valid email address is required."
            });
        }

        const cleanEmail =
            email.trim().toLowerCase();

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        const allowedCategories = [
            "Wildfire",
            "Evacuation",
            "Emergency",
            "General"
        ];

        const cleanCategories =
            Array.isArray(categories)
                ? categories.filter(category =>
                    allowedCategories.includes(category)
                )
                : [];

        if (cleanCategories.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Please select at least one alert category."
            });
        }

        const mongoClient =
            await getClient();

        const db =
            mongoClient.db(
                process.env.MONGODB_DB || "lafd"
            );

        const subscribers =
            db.collection("alertSubscribers");

        const existing =
            await subscribers.findOne({
                email: cleanEmail
            });

        if (existing) {

            await subscribers.updateOne(
                {
                    email: cleanEmail
                },
                {
                    $set: {
                        categories: cleanCategories,
                        active: true,
                        updatedAt: new Date()
                    }
                }
            );

            return res.status(200).json({
                success: true,
                message:
                    "Your alert subscription has been updated."
            });
        }

        await subscribers.insertOne({

            email: cleanEmail,

            categories: cleanCategories,

            active: true,

            subscribedAt: new Date(),

            updatedAt: new Date()

        });

        return res.status(201).json({

            success: true,

            message:
                "You have successfully signed up for alerts."

        });

    } catch (error) {

        console.error(
            "Alert subscription error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to process your subscription."

        });

    }
}
