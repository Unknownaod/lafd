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

                                html: `<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<meta
    name="color-scheme"
    content="light"
>

<meta
    name="supported-color-schemes"
    content="light"
>

<title>
    ${escapeHtml(cleanSubject)}
</title>

</head>

<body style="
    margin:0;
    padding:0;
    background:#f3f4f6;
    font-family:Arial,Helvetica,sans-serif;
    color:#1f2937;
">

<div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    color:transparent;
">

    ${escapeHtml(cleanAlertType)}
    —
    ${escapeHtml(cleanSubject)}

</div>


<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        width:100%;
        background:#f3f4f6;
    "
>

<tr>

<td
    align="center"
    style="
        padding:32px 16px;
    "
>


<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        width:100%;
        max-width:680px;
        background:#ffffff;
        border:1px solid #e5e7eb;
        border-radius:10px;
        overflow:hidden;
    "
>


<!-- ================================= -->
<!-- HEADER -->
<!-- ================================= -->

<tr>

<td style="
    background:#b5121b;
    padding:28px 32px;
">

<div style="
    font-size:11px;
    line-height:16px;
    font-weight:700;
    letter-spacing:1.4px;
    text-transform:uppercase;
    color:#ffd9dc;
    margin-bottom:6px;
">

    Official Emergency Notification

</div>


<div style="
    font-size:24px;
    line-height:30px;
    font-weight:700;
    color:#ffffff;
">

    Los Angeles Fire Department

</div>


<div style="
    font-size:13px;
    line-height:20px;
    color:#ffecef;
    margin-top:4px;
">

    Emergency Alert System

</div>

</td>

</tr>


<!-- ================================= -->
<!-- ALERT TYPE -->
<!-- ================================= -->

<tr>

<td style="
    padding:18px 32px 0 32px;
">

<span style="
    display:inline-block;
    background:#fff1f2;
    border:1px solid #fecdd3;
    border-radius:5px;
    padding:7px 11px;
    font-size:11px;
    line-height:16px;
    font-weight:700;
    letter-spacing:.5px;
    text-transform:uppercase;
    color:#9f1239;
">

    ${escapeHtml(cleanAlertType)}

</span>

</td>

</tr>


<!-- ================================= -->
<!-- MAIN CONTENT -->
<!-- ================================= -->

<tr>

<td style="
    padding:18px 32px 28px 32px;
">


<h1 style="
    margin:0;
    font-size:26px;
    line-height:34px;
    font-weight:700;
    color:#111827;
">

    ${escapeHtml(cleanSubject)}

</h1>


<div style="
    height:1px;
    background:#e5e7eb;
    margin:22px 0;
">

</div>


<div style="
    font-size:15px;
    line-height:25px;
    color:#374151;
    white-space:pre-line;
">

    ${escapeHtml(cleanMessage)}

</div>


</td>

</tr>


<!-- ================================= -->
<!-- OFFICIAL LAFD INFORMATION -->
<!-- ================================= -->

<tr>

<td style="
    padding:0 32px 28px 32px;
">


<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        width:100%;
        background:#f9fafb;
        border:1px solid #e5e7eb;
        border-radius:6px;
    "
>

<tr>

<td style="
    padding:16px;
">


<div style="
    font-size:12px;
    line-height:18px;
    font-weight:700;
    color:#374151;
    margin-bottom:5px;
">

    Official LAFD Information

</div>


<div style="
    font-size:12px;
    line-height:19px;
    color:#6b7280;
    margin-bottom:12px;
">

    Visit the official Los Angeles Fire Department website
    for department information, public safety resources,
    alerts, and updates.

</div>


<a
    href="https://lafdi10.org"
    style="
        display:inline-block;
        background:#b5121b;
        color:#ffffff;
        text-decoration:none;
        font-size:12px;
        line-height:18px;
        font-weight:700;
        padding:9px 14px;
        border-radius:5px;
    "
>

    Visit lafdi10.org

</a>


</td>

</tr>

</table>


</td>

</tr>


<!-- ================================= -->
<!-- FOOTER -->
<!-- ================================= -->

<tr>

<td style="
    background:#111827;
    padding:22px 32px;
">


<div style="
    font-size:12px;
    line-height:18px;
    font-weight:700;
    color:#ffffff;
">

    Los Angeles Fire Department

</div>


<div style="
    font-size:11px;
    line-height:17px;
    color:#9ca3af;
    margin-top:3px;
">

    Emergency Alert System

</div>


<div style="
    height:1px;
    background:#374151;
    margin:15px 0;
">

</div>


<div style="
    font-size:10px;
    line-height:16px;
    color:#6b7280;
">

    Official website:

    <a
        href="https://lafdi10.org"
        style="
            color:#d1d5db;
            text-decoration:underline;
        "
    >

        lafdi10.org

    </a>

</div>


<div style="
    font-size:10px;
    line-height:16px;
    color:#6b7280;
    margin-top:5px;
">

    This is an automated notification.
    Please do not reply directly to this email.

</div>


</td>

</tr>


</table>


</td>

</tr>

</table>


</body>

</html>`

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
