export default async function handler(req, res) {

    /* ================================
       METHOD CHECK
    ================================= */

    if (req.method !== "POST") {

        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });

    }


    try {

        const commendation = req.body;


        /* ================================
           BASIC VALIDATION
        ================================= */

        if (
            !commendation ||
            !commendation.incidentDate ||
            !commendation.location ||
            !commendation.reportingName ||
            !commendation.reportingEmail ||
            !commendation.statement
        ) {

            return res.status(400).json({
                success: false,
                message: "Required commendation information is missing."
            });

        }


        /* ================================
           WEBHOOK CHECK
        ================================= */

        const webhook =
            process.env.LAFD_COMMENDATION_WEBHOOK_URL;


        if (!webhook) {

            console.error(
                "LAFD_COMMENDATION_WEBHOOK_URL is not configured."
            );

            return res.status(500).json({
                success: false,
                message: "Commendation service is not configured."
            });

        }


        /* ================================
           SANITIZE DISCORD VALUES
        ================================= */

        const clean = (value, fallback = "Not provided") => {

            if (
                value === undefined ||
                value === null ||
                String(value).trim() === ""
            ) {

                return fallback;

            }

            return String(value)
                .replace(/@everyone/gi, "@\u200beveryone")
                .replace(/@here/gi, "@\u200bhere")
                .trim();

        };


        const incidentDate =
            clean(commendation.incidentDate);

        const incidentTime =
            clean(commendation.incidentTime);

        const incidentType =
            clean(commendation.incidentType);

        const location =
            clean(commendation.location);

        const reportNumber =
            clean(commendation.reportNumber);

        const employeeLast =
            clean(commendation.employeeLast);

        const employeeFirst =
            clean(commendation.employeeFirst);

        const employeeBadge =
            clean(commendation.employeeBadge);

        const unitNumber =
            clean(commendation.unitNumber);

        const station =
            clean(commendation.station);

        const unitType =
            clean(commendation.unitType);

        const reasons =
            clean(commendation.reasons);

        const statement =
            clean(commendation.statement);

        const reportingName =
            clean(commendation.reportingName);

        const reportingEmail =
            clean(commendation.reportingEmail);

        const contactMethod =
            clean(commendation.contactMethod);

        const signature =
            clean(commendation.signature);



        /* ================================
           DISCORD EMBED
        ================================= */

        const embed = {

            title: "⭐ New LAFD Commendation",

            description:
                "A new commendation has been submitted through the Los Angeles Fire Department Professional Standards portal.",

            color: 11801371,

            fields: [

                {
                    name: "👤 Reporting Party",

                    value:
                        `**Name:** ${reportingName}\n` +
                        `**Email:** ${reportingEmail}\n` +
                        `**Preferred Contact:** ${contactMethod}`,

                    inline: false
                },


                {
                    name: "🔥 Incident Information",

                    value:
                        `**Date:** ${incidentDate}\n` +
                        `**Time:** ${incidentTime}\n` +
                        `**Type:** ${incidentType}\n` +
                        `**Location:** ${location}\n` +
                        `**Report #:** ${reportNumber}`,

                    inline: false
                },


                {
                    name: "👨‍🚒 Employee / Unit",

                    value:
                        `**Employee:** ${employeeFirst} ${employeeLast}\n` +
                        `**Badge #:** ${employeeBadge}\n` +
                        `**Unit #:** ${unitNumber}\n` +
                        `**Station:** ${station}\n` +
                        `**Unit Type:** ${unitType}`,

                    inline: false
                },


                {
                    name: "🏆 Commendation Reason",

                    value:
                        reasons,

                    inline: false
                },


                {
                    name: "📝 Statement",

                    value:
                        statement.substring(0, 1024),

                    inline: false
                },


                {
                    name: "✍️ Signature",

                    value:
                        signature,

                    inline: false
                }

            ],


            footer: {

                text:
                    "LAFD Professional Standards • Commendation"

            },


            timestamp:
                commendation.submittedAt ||
                new Date().toISOString()

        };



        /* ================================
           SEND TO DISCORD
        ================================= */

        const discordResponse =
            await fetch(
                webhook,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            username:
                                "LAFD Professional Standards",

                            embeds: [
                                embed
                            ],

                            allowed_mentions: {
                                parse: []
                            }

                        })

                }
            );



        /* ================================
           DISCORD ERROR
        ================================= */

        if (!discordResponse.ok) {

            const discordError =
                await discordResponse.text();

            console.error(
                "Discord webhook error:",
                discordError
            );

            return res.status(500).json({

                success: false,

                message:
                    "The commendation could not be delivered."

            });

        }



        /* ================================
           SUCCESS
        ================================= */

        console.log(
            "LAFD commendation submitted:",
            reportingName
        );


        return res.status(200).json({

            success: true,

            message:
                "Commendation submitted successfully."

        });


    } catch (error) {

        console.error(
            "Commendation API error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }

}

