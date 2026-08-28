import { MongoClient } from "mongodb";

let client;
let clientPromise;

async function getClient() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not configured.");
    }

    if (!clientPromise) {
        client = new MongoClient(process.env.MONGODB_URI);

        clientPromise = client.connect();
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
        "GET, OPTIONS"
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
    // ONLY ALLOW GET
    // ======================================

    if (req.method !== "GET") {

        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });

    }

    // ======================================
    // CHECK MONGODB CONFIG
    // ======================================

    if (!process.env.MONGODB_URI) {

        console.error(
            "MONGODB_URI is missing from Vercel environment variables."
        );

        return res.status(500).json({
            success: false,
            message: "Database is not configured."
        });

    }

    try {

        // ======================================
        // CONNECT TO MONGODB
        // ======================================

        const mongoClient =
            await getClient();

        // ======================================
        // DATABASE
        // ======================================

        const databaseName =
            process.env.MONGODB_DB || "lafd";

        const db =
            mongoClient.db(databaseName);

        // ======================================
        // GET ACTIVE ALERTS
        // ======================================

        const alerts =
            await db
                .collection("alerts")
                .find({
                    active: true
                })
                .sort({
                    createdAt: -1
                })
                .limit(50)
                .toArray();

        // ======================================
        // RETURN ALERTS
        // ======================================

        return res.status(200).json({

            success: true,

            alerts: alerts.map(alert => ({

                _id: alert._id,

                title:
                    alert.title || "Emergency Alert",

                message:
                    alert.message || "",

                type:
                    alert.type || "general",

                severity:
                    alert.severity || "info",

                active:
                    alert.active === true,

                createdAt:
                    alert.createdAt || null,

                expiresAt:
                    alert.expiresAt || null

            }))

        });

    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "FIMS ALERT LIST ERROR"
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
                "Unable to load alerts."

        });

    }

}
