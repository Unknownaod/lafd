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

        const complaint = req.body;


        /* ================================
           BASIC VALIDATION
        ================================= */

        if (
            !complaint ||
            !complaint.reportingName ||
            !complaint.reportingEmail ||
            !complaint.incidentDate ||
            !complaint.incidentLocation ||
            !complaint.statement
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Required complaint information is missing."
            });

        }


        /* ================================
           WEBHOOK CHECK
        ================================= */

        const webhook =
            process.env.LAFD_COMPLAINT_WEBHOOK_URL;


        if (!webhook) {

            console.error(
                "LAFD_COMPLAINT_WEBHOOK_URL is not configured."
            );

            return res.status(500).json({
                success: false,
                message:
                    "Complaint service is not configured."
            });

        }


        /* ================================
           SANITIZE VALUES
        ================================= */

        const clean = (
            value,
            fallback = "Not provided"
        ) => {

            if (
                value === undefined ||
                value === null ||
                String(value).trim() === ""
            ) {

                return fallback;

            }

            return String(value)
                .replace(
                    /@everyone/gi,
                    "@\u200beveryone"
                )
                .replace(
                    /@here/gi,
                    "@\u200bhere"
                )
                .trim();

        };


        const reportingName =
            clean(complaint.reportingName);

        const reportingEmail =
            clean(complaint.reportingEmail);

        const incidentDate =
            clean(complaint.incidentDate);

        const incidentTime =
            clean(complaint.incidentTime);

        const incidentType =
            clean(complaint.incidentType);

        const incidentLocation =
            clean(complaint.incidentLocation);

        const employeeFirst =
            clean(complaint.employeeFirst);

        const employeeLast =
            clean(complaint.employeeLast);

        const employeeBadge =
            clean(complaint.employeeBadge);

        const unitNumber =
            clean(complaint.unitNumber);

        const station =
            clean(complaint.station);

        const statement =
            clean(complaint.statement);

        const complaintTypes =
            Array.isArray(complaint.complaintTypes)
                ? complaint.complaintTypes
                    .map(item => clean(item))
                    .join(", ")
                : "Not specified";



        /* ================================
           DISCORD EMBED
        ================================= */

        const embed = {

            title:
                "⚠️ New LAFD Complaint",

            description:
                "A new complaint has been submitted through the Los Angeles Fire Department Professional Standards portal.",

            color: 11801371,

            fields: [

                {
                    name:
                        "👤 Reporting Party",

                    value:
                        `**Name:** ${reportingName}\n` +
                        `**Email:** ${reportingEmail}`,

                    inline: false
                },


                {
                    name:
                        "🔥 Incident Information",

                    value:
                        `**Date:** ${incidentDate}\n` +
                        `**Time:** ${incidentTime}\n` +
                        `**Type:** ${incidentType}\n` +
                        `**Location:** ${incidentLocation}`,

                    inline: false
                },


                {
                    name:
                        "👨‍🚒 Employee / Unit",

                    value:
                        `**Employee:** ${employeeFirst} ${employeeLast}\n` +
                        `**Badge #:** ${employeeBadge}\n` +
                        `**Unit #:** ${unitNumber}\n` +
                        `**Station:** ${station}`,

                    inline: false
                },


                {
                    name:
                        "⚠️ Complaint Type",

                    value:
                        complaintTypes,

                    inline: false
                },


                {
                    name:
                        "📝 Complaint Details",

                    value:
                        statement.substring(0, 1024),

                    inline: false
                }

            ],


            footer: {

                text:
                    "LAFD Professional Standards • Complaint"

            },


            timestamp:
                complaint.submittedAt ||
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
                    "The complaint could not be delivered."

            });

        }



        /* ================================
           SUCCESS
        ================================= */

        console.log(
            "LAFD complaint submitted:",
            reportingName
        );


        return res.status(200).json({

            success: true,

            message:
                "Complaint submitted successfully."

        });


    } catch (error) {

        console.error(
            "Complaint API error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }

}

