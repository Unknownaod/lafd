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

        const application = req.body;


        /* ================================
           BASIC VALIDATION
        ================================= */

        if (
            !application ||
            !application.applicationNumber ||
            !application.position ||
            !application.firstName ||
            !application.lastName ||
            !application.email ||
            !application.phone
        ) {

            return res.status(400).json({
                success: false,
                message: "Required application information is missing."
            });

        }


        /* ================================
           WEBHOOK CHECK
        ================================= */

        const webhook =
            process.env.DISCORD_WEBHOOK_URL;


        if (!webhook) {

            console.error(
                "DISCORD_WEBHOOK_URL is not configured."
            );

            return res.status(500).json({
                success: false,
                message: "Application service is not configured."
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


        const applicationNumber =
            clean(application.applicationNumber);

        const position =
            clean(application.position);

        const firstName =
            clean(application.firstName);

        const lastName =
            clean(application.lastName);

        const dob =
            clean(application.dob);

        const phone =
            clean(application.phone);

        const email =
            clean(application.email);

        const address =
            clean(application.address);

        const city =
            clean(application.city);

        const state =
            clean(application.state);

        const employer =
            clean(application.employer);

        const previousPosition =
            clean(application.previousPosition);

        const experience =
            clean(application.experience);

        const education =
            clean(application.education);

        const relevantExperience =
            clean(application.relevantExperience);

        const license =
            clean(application.license);

        const eligible =
            clean(application.eligible);

        const motivation =
            clean(application.motivation);

        const additional =
            clean(application.additional);



        /* ================================
           DISCORD EMBED
        ================================= */

        const embed = {

            title: "🚒 New LAFD Employment Application",

            description:
                "A new application has been submitted through the Los Angeles Fire Department Career Portal.",

            color: 11801115,

            fields: [

                {
                    name: "📋 Application Information",

                    value:
                        `**Application #:** ${applicationNumber}\n` +
                        `**Position:** ${position}`,

                    inline: false
                },


                {
                    name: "👤 Applicant",

                    value:
                        `**Name:** ${firstName} ${lastName}\n` +
                        `**Date of Birth:** ${dob}`,

                    inline: false
                },


                {
                    name: "📞 Contact Information",

                    value:
                        `**Email:** ${email}\n` +
                        `**Phone:** ${phone}`,

                    inline: false
                },


                {
                    name: "📍 Address",

                    value:
                        `**Street:** ${address}\n` +
                        `**City:** ${city}\n` +
                        `**State:** ${state}`,

                    inline: false
                },


                {
                    name: "💼 Employment History",

                    value:
                        `**Employer:** ${employer}\n` +
                        `**Previous Position:** ${previousPosition}\n` +
                        `**Experience:** ${experience}\n` +
                        `**Education:** ${education}`,

                    inline: false
                },


                {
                    name: "🚗 Eligibility",

                    value:
                        `**Driver's License:** ${license}\n` +
                        `**Eligible to Work:** ${eligible}`,

                    inline: false
                },


                {
                    name: "📝 Relevant Experience",

                    value:
                        relevantExperience,

                    inline: false
                },


                {
                    name: "❓ Why do you want to join LAFD?",

                    value:
                        motivation,

                    inline: false
                },


                {
                    name: "ℹ️ Additional Information",

                    value:
                        additional,

                    inline: false
                }

            ],


            footer: {

                text:
                    "LAFD Career Portal • FiveM Roleplay"

            },


            timestamp:
                application.submittedAt ||
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
                                "LAFD Recruitment",

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
                    "The application could not be delivered."

            });

        }



        /* ================================
           SUCCESS
        ================================= */

        console.log(
            `LAFD application submitted: ${applicationNumber}`
        );


        return res.status(200).json({

            success: true,

            message:
                "Application submitted successfully.",

            applicationNumber:
                applicationNumber

        });


    } catch (error) {

        console.error(
            "Application API error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }

}
