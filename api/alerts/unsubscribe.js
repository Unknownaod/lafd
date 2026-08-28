javascript
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
    // CHECK MONGODB
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
        // GET EMAIL
        // ======================================

        const {
            email
        } = req.body || {};

        if (
            !email ||
            typeof email !== "string"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email address is required."

            });

        }

        // ======================================
        // CLEAN EMAIL
        // ======================================

        const cleanEmail =
            email
                .trim()
                .toLowerCase();

        // ======================================
        // EMAIL VALIDATION
        // ======================================

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
        // FIND ACTIVE SUBSCRIPTION
        // ======================================

        const existing =
            await subscribers.findOne({

                email:
                    cleanEmail,

                active:
                    true

            });

        if (!existing) {

            return res.status(404).json({

                success: false,

                message:
                    "No active subscription was found for this email address."

            });

        }

        // ======================================
        // DEACTIVATE SUBSCRIPTION
        // ======================================

        await subscribers.updateOne(

            {
                email:
                    cleanEmail,

                active:
                    true
            },

            {
                $set: {

                    active:
                        false,

                    updatedAt:
                        new Date()

                }
            }

        );

        // ======================================
        // SUCCESS
        // ======================================

        return res.status(200).json({

            success: true,

            message:
                "You have been unsubscribed from alerts."

        });

    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "FIMS ALERT UNSUBSCRIBE ERROR"
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
                "Unable to unsubscribe."

        });

    }

}
