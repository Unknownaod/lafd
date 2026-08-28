import { MongoClient } from "mongodb";

let client;
let clientPromise;

function getClient() {

    if (!process.env.MONGODB_URI) {
        throw new Error(
            "MONGODB_URI is not configured."
        );
    }

    if (!clientPromise) {

        client =
            new MongoClient(
                process.env.MONGODB_URI
            );

        clientPromise =
            client.connect();
    }

    return clientPromise;
}

export default async function handler(req, res) {

    // ======================================
    // CORS
    // ======================================

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

    // ======================================
    // OPTIONS
    // ======================================

    if (req.method === "OPTIONS") {

        return res.status(200).end();

    }

    // ======================================
    // ONLY ALLOW POST
    // ======================================

    if (req.method !== "POST") {

        return res.status(405).json({

            success: false,

            message:
                "Method not allowed."

        });

    }

    // ======================================
    // CHECK DATABASE CONFIGURATION
    // ======================================

    if (!process.env.MONGODB_URI) {

        console.error(
            "MONGODB_URI is not configured."
        );

        return res.status(500).json({

            success: false,

            message:
                "Database is not configured."

        });

    }

    try {

        // ======================================
        // REQUEST BODY
        // ======================================

        const {
            email,
            categories
        } = req.body || {};

        // ======================================
        // EMAIL VALIDATION
        // ======================================

        if (
            !email ||
            typeof email !== "string"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "A valid email address is required."

            });

        }

        const cleanEmail =
            email
                .trim()
                .toLowerCase();

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid email address."

            });

        }

        // ======================================
        // ALLOWED ALERT CATEGORIES
        // ======================================

        const allowedCategories = [

            "Wildfire",
            "Evacuation",
            "Emergency",
            "General"

        ];

        // ======================================
        // CLEAN CATEGORIES
        // ======================================

        const cleanCategories =
            Array.isArray(categories)

                ? [
                    ...new Set(
                        categories.filter(
                            category =>
                                allowedCategories
                                    .includes(category)
                        )
                    )
                ]

                : [];

        if (
            cleanCategories.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please select at least one alert category."

            });

        }

        // ======================================
        // CONNECT TO MONGODB
        // ======================================

        const mongoClient =
            await getClient();

        const db =
            mongoClient.db(
                process.env.MONGODB_DB ||
                "lafd"
            );

        const subscribers =
            db.collection(
                "alertSubscribers"
            );

        // ======================================
        // CHECK EXISTING SUBSCRIBER
        // ======================================

        const existing =
            await subscribers.findOne({

                email:
                    cleanEmail

            });

        // ======================================
        // UPDATE EXISTING SUBSCRIBER
        // ======================================

        if (existing) {

            await subscribers.updateOne(

                {
                    email:
                        cleanEmail
                },

                {
                    $set: {

                        categories:
                            cleanCategories,

                        active:
                            true,

                        updatedAt:
                            new Date()

                    }
                }

            );

            return res.status(200).json({

                success: true,

                message:
                    "Your alert subscription has been updated."

            });

        }

        // ======================================
        // CREATE NEW SUBSCRIBER
        // ======================================

        await subscribers.insertOne({

            email:
                cleanEmail,

            categories:
                cleanCategories,

            active:
                true,

            subscribedAt:
                new Date(),

            updatedAt:
                new Date()

        });

        // ======================================
        // SUCCESS
        // ======================================

        return res.status(201).json({

            success: true,

            message:
                "You have successfully signed up for alerts."

        });

    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "FIMS ALERT SUBSCRIPTION ERROR"
        );

        console.error(
            error
        );

        console.error(
            "================================="
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to process your subscription."

        });

    }

}
