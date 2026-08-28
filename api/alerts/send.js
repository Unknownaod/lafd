import { MongoClient } from "mongodb";


// ======================================
// MONGODB CONNECTION
// ======================================

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {

    if (cachedClient && cachedDb) {
        return {
            client: cachedClient,
            db: cachedDb
        };
    }

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "lafd";

    if (!uri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db(dbName);

    cachedClient = client;
    cachedDb = db;

    return {
        client,
        db
    };
}


// ======================================
// MAIN HANDLER
// ======================================

export default async function handler(req, res) {

    // ==================================
    // CORS
    // ==================================

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


    // ==================================
    // ONLY ALLOW POST
    // ==================================

    if (req.method !== "POST") {

        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });

    }


    // ==================================
    // ENVIRONMENT VARIABLES
    // ==================================

    const resendApiKey =
        process.env.RESEND_API_KEY;

    const fromEmail =
        process.env.ALERT_FROM_EMAIL;


    if (!resendApiKey || !fromEmail) {

        console.error(
            "RESEND_API_KEY or ALERT_FROM_EMAIL is not configured."
        );

        return res.status(500).json({
            success: false,
            message: "Alert service is not configured."
        });

    }


    try {

        // ==================================
        // REQUEST DATA
        // ==================================

        const {
            subject,
            message,
            alertType
        } = req.body || {};


        // ==================================
        // VALIDATION
        // ==================================

        if (!subject || !message) {

            return res.status(400).json({
                success: false,
                message:
                    "Subject and message are required."
            });

        }


        // ==================================
        // SANITIZE
        // ==================================

        const clean = value => {

            if (
                value === undefined ||
                value === null
            ) {
                return "";
            }

            return String(value)
                .trim()
                .slice(0, 5000);

        };


        const cleanSubject =
            clean(subject);

        const cleanMessage =
            clean(message);

        const cleanAlertType =
            clean(alertType) || "Emergency Alert";


        // ==================================
        // CONNECT TO MONGODB
        // ==================================

        const { db } =
            await connectToDatabase();


        // ==================================
        // GET ALERT SUBSCRIBERS
        // ==================================

        const subscribers =
            await db
                .collection("alertSubscribers")
                .find({
                    active: {
                        $ne: false
                    },

                    email: {
                        $exists: true,
                        $ne: ""
                    }
                })
                .project({
                    email: 1
                })
                .toArray();


        // ==================================
        // NO SUBSCRIBERS
        // ==================================

        if (!subscribers.length) {

            return res.status(200).json({

                success: true,

                message:
                    "Alert created, but there are currently no subscribers.",

                recipientCount: 0

            });

        }


        // ==================================
        // CLEAN EMAIL ADDRESSES
        // ==================================

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        const emails = [
            ...new Set(

                subscribers

                    .map(user =>
                        String(user.email)
                            .trim()
                            .toLowerCase()
                    )

                    .filter(email =>
                        emailRegex.test(email)
                    )

            )
        ];


        if (!emails.length) {

            return res.status(200).json({

                success: true,

                message:
                    "No valid subscriber email addresses were found.",

                recipientCount: 0

            });

        }


        // ==================================
        // SEND TO SUBSCRIBERS
        // ==================================
        //
        // Resend supports multiple recipients,
        // but we send individually so subscriber
        // addresses are NOT exposed to each other.
        //
        // ==================================

        const results = [];

        let successful = 0;
        let failed = 0;


        for (const email of emails) {

            try {

                const resendResponse =
                    await fetch(
                        "https://api.resend.com/emails",
                        {

                            method: "POST",

                            headers: {

                                "Authorization":
                                    `Bearer ${resendApiKey}`,

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                from: fromEmail,

                                to: [email],

                                subject:
                                    cleanSubject,

                                text:
`${cleanAlertType}

${cleanSubject}

${cleanMessage}

Los Angeles Fire Department
Emergency Alert System`,

                                html: `

<div style="
    font-family: Arial, Helvetica, sans-serif;
    max-width: 650px;
    margin: 0 auto;
    padding: 30px;
    color: #222;
">

    <div style="
        background: #b5121b;
        color: white;
        padding: 20px;
    ">

        <h2 style="
            margin: 0;
            font-size: 20px;
        ">
            Los Angeles Fire Department
        </h2>

        <p style="
            margin: 5px 0 0;
            font-size: 12px;
        ">
            Emergency Alert System
        </p>

    </div>


    <div style="
        border: 1px solid #ddd;
        border-top: none;
        padding: 25px;
    ">

        <div style="
            display: inline-block;
            background: #b5121b;
            color: white;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 15px;
        ">
            ${escapeHtml(cleanAlertType)}
        </div>


        <h3 style="
            margin-top: 0;
            font-size: 20px;
        ">
            ${escapeHtml(cleanSubject)}
        </h3>


        <p style="
            white-space: pre-line;
            line-height: 1.7;
            color: #444;
        ">
            ${escapeHtml(cleanMessage)}
        </p>

    </div>


    <div style="
        margin-top: 20px;
        font-size: 11px;
        color: #777;
        text-align: center;
    ">

        Los Angeles Fire Department
        <br>

        Emergency Alert System

    </div>

</div>

`

                            })

                        }
                    );


                if (!resendResponse.ok) {

                    const errorText =
                        await resendResponse.text();

                    console.error(
                        `Resend failed for ${email}:`,
                        errorText
                    );

                    failed++;

                    results.push({
                        email,
                        success: false
                    });

                    continue;

                }


                const resendData =
                    await resendResponse.json();


                successful++;


                results.push({

                    email,

                    success: true,

                    id:
                        resendData.id || null

                });


            } catch (error) {

                console.error(
                    `Email error for ${email}:`,
                    error
                );

                failed++;

                results.push({

                    email,

                    success: false

                });

            }

        }


        // ==================================
        // RESPONSE
        // ==================================

        return res.status(200).json({

            success:
                successful > 0,

            message:
                "Alert processing completed.",

            recipientCount:
                emails.length,

            successful,

            failed

        });


    } catch (error) {

        console.error(
            "Alert error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "An unexpected error occurred."

        });

    }

}


// ======================================
// HTML ESCAPING
// ======================================

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}
