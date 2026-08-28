export default async function handler(req, res) {

    // ================================
    // CORS
    // ================================

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // ================================
    // ONLY ALLOW POST
    // ================================

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    // ================================
    // ENVIRONMENT VARIABLES
    // ================================

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.ALERT_FROM_EMAIL;

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

        const {
            email,
            subject,
            message
        } = req.body || {};

        // ================================
        // VALIDATION
        // ================================

        if (!email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Email, subject, and message are required."
            });
        }

        // Basic email validation
        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email address."
            });
        }

        // ================================
        // SANITIZE
        // ================================

        const clean = value => {
            return String(value)
                .trim()
                .slice(0, 5000);
        };

        const cleanEmail = clean(email);
        const cleanSubject = clean(subject);
        const cleanMessage = clean(message);

        // ================================
        // SEND EMAIL THROUGH RESEND
        // ================================

        const resendResponse = await fetch(
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

                    to: [cleanEmail],

                    subject: cleanSubject,

                    text: cleanMessage,

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

                                <h3 style="
                                    margin-top: 0;
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

        // ================================
        // RESEND ERROR
        // ================================

        if (!resendResponse.ok) {

            const errorText =
                await resendResponse.text();

            console.error(
                "Resend error:",
                errorText
            );

            return res.status(502).json({
                success: false,
                message: "Unable to send alert."
            });
        }

        const resendData =
            await resendResponse.json();

        // ================================
        // SUCCESS
        // ================================

        return res.status(200).json({

            success: true,

            message: "Alert sent successfully.",

            id: resendData.id || null

        });

    } catch (error) {

        console.error(
            "Alert error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "An unexpected error occurred."

        });

    }

}


// ======================================
// HTML ESCAPING
// ======================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
