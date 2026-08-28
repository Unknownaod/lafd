export default async function handler(req, res) {

    // ================================
    // CORS
    // ================================

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
    // CHECK RESEND CONFIGURATION
    // ================================

    const resendKey =
        process.env.RESEND_API_KEY;

    const fromEmail =
        process.env.ALERT_FROM_EMAIL;

    const alertRecipients =
        process.env.ALERT_RECIPIENTS;


    if (!resendKey || !fromEmail || !alertRecipients) {

        console.error(
            "Missing Resend alert environment variables."
        );

        return res.status(500).json({
            success: false,
            message: "Alert service is not configured."
        });

    }


    try {

        const alert = req.body;


        // ================================
        // BASIC VALIDATION
        // ================================

        if (
            !alert ||
            typeof alert !== "object"
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid alert data."
            });

        }


        const clean = value => {

            if (
                value === undefined ||
                value === null
            ) {
                return "N/A";
            }

            return String(value)
                .trim()
                .slice(0, 2000);

        };


        const title =
            clean(alert.title);

        const message =
            clean(alert.message);

        const location =
            clean(alert.location);

        const alertType =
            clean(alert.type);

        const severity =
            clean(alert.severity);

        const instructions =
            clean(alert.instructions);


        if (!title || title === "N/A") {

            return res.status(400).json({
                success: false,
                message: "Alert title is required."
            });

        }


        if (!message || message === "N/A") {

            return res.status(400).json({
                success: false,
                message: "Alert message is required."
            });

        }


        // ================================
        // ALERT ID
        // ================================

        const alertId =
            "LAFD-" +
            Date.now()
                .toString(36)
                .toUpperCase();


        // ================================
        // TIME
        // ================================

        const submittedAt =
            new Date();


        const formattedDate =
            submittedAt.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "America/Los_Angeles",

                    dateStyle: "full",

                    timeStyle: "long"
                }
            );


        // ================================
        // EMAIL HTML
        // ================================

        const emailHtml = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

</head>

<body style="
    margin:0;
    padding:0;
    background:#f4f4f4;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:700px;
    margin:30px auto;
    background:#ffffff;
    border:1px solid #ddd;
">

    <div style="
        background:#b5121b;
        color:#ffffff;
        padding:25px;
    ">

        <div style="
            font-size:12px;
            opacity:.9;
            margin-bottom:8px;
        ">
            LOS ANGELES FIRE DEPARTMENT
        </div>

        <div style="
            font-size:26px;
            font-weight:bold;
        ">
            ${escapeHtml(title)}
        </div>

    </div>


    <div style="padding:30px;">

        <div style="
            background:#f7f7f7;
            border-left:4px solid #b5121b;
            padding:18px;
            margin-bottom:25px;
        ">

            <strong>Emergency / Public Safety Alert</strong>

            <div style="
                margin-top:8px;
                color:#555;
                font-size:13px;
            ">
                ${escapeHtml(message)}
            </div>

        </div>


        <table
            width="100%"
            cellpadding="8"
            cellspacing="0"
            style="
                border-collapse:collapse;
                font-size:13px;
            "
        >

            <tr>
                <td style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                ">
                    Alert ID
                </td>

                <td style="
                    border-bottom:1px solid #ddd;
                ">
                    ${escapeHtml(alertId)}
                </td>
            </tr>


            <tr>
                <td style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                ">
                    Type
                </td>

                <td style="
                    border-bottom:1px solid #ddd;
                ">
                    ${escapeHtml(alertType)}
                </td>
            </tr>


            <tr>
                <td style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                ">
                    Severity
                </td>

                <td style="
                    border-bottom:1px solid #ddd;
                ">
                    ${escapeHtml(severity)}
                </td>
            </tr>


            <tr>
                <td style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                ">
                    Location
                </td>

                <td style="
                    border-bottom:1px solid #ddd;
                ">
                    ${escapeHtml(location)}
                </td>
            </tr>


            <tr>
                <td style="
                    font-weight:bold;
                ">
                    Issued
                </td>

                <td>
                    ${escapeHtml(formattedDate)}
                </td>
            </tr>

        </table>


        ${
            instructions !== "N/A"
            ?
            `
            <div style="
                margin-top:25px;
            ">

                <h3 style="
                    margin-bottom:8px;
                ">
                    Instructions
                </h3>

                <div style="
                    color:#555;
                    font-size:13px;
                    line-height:1.7;
                ">
                    ${escapeHtml(instructions)}
                </div>

            </div>
            `
            :
            ""
        }


        <div style="
            margin-top:30px;
            padding-top:18px;
            border-top:1px solid #ddd;
            color:#888;
            font-size:11px;
        ">

            Los Angeles Fire Department<br>

            Public Safety Alert System<br><br>

            Alert ID: ${escapeHtml(alertId)}

        </div>

    </div>

</div>

</body>

</html>

`;


        // ================================
        // RESEND REQUEST
        // ================================

        const resendResponse =
            await fetch(
                "https://api.resend.com/emails",
                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${resendKey}`,

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        from: fromEmail,

                        to: alertRecipients
                            .split(",")
                            .map(email =>
                                email.trim()
                            )
                            .filter(Boolean),

                        subject:
                            `[LAFD ALERT] ${title}`,

                        html:
                            emailHtml

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
                message:
                    "Unable to deliver alert."
            });

        }


        const resendData =
            await resendResponse.json();


        // ================================
        // SUCCESS
        // ================================

        return res.status(200).json({

            success: true,

            message:
                "Alert sent successfully.",

            alertId,

            emailId:
                resendData.id || null

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


// ========================================
// HTML ESCAPE
// ========================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
