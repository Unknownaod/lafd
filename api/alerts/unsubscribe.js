import { MongoClient } from "mongodb";

let client;
let clientPromise;

function getClient() {

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

            message:
                "Method not allowed."

        });

    }

    try {

        const { email } =
            req.body || {};

        if (!email) {

            return res.status(400).json({

                success: false,

                message:
                    "Email address is required."

            });

        }

        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();

        const mongoClient =
            await getClient();

        const db =
            mongoClient.db(
                process.env.MONGODB_DB || "lafd"
            );

        const result =
            await db
                .collection("alertSubscribers")
                .updateOne(
                    {
                        email: cleanEmail
                    },
                    {
                        $set: {
                            active: false,
                            updatedAt: new Date()
                        }
                    }
                );

        if (result.matchedCount === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "No active subscription was found."

            });

        }

        return res.status(200).json({

            success: true,

            message:
                "You have been unsubscribed from alerts."

        });

    } catch (error) {

        console.error(
            "Unsubscribe error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to unsubscribe."

        });

    }
}
