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

    if (req.method !== "GET") {

        return res.status(405).json({

            success: false,

            message:
                "Method not allowed."

        });

    }

    try {

        const mongoClient =
            await getClient();

        const db =
            mongoClient.db(
                process.env.MONGODB_DB || "lafd"
            );

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

        return res.status(200).json({

            success: true,

            alerts

        });

    } catch (error) {

        console.error(
            "Alert list error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load alerts."

        });

    }
}
