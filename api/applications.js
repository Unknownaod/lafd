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


        /* ================================
           SPLIT LONG DISCORD CONTENT
           
           Discord embed field values:
           MAX = 1024 characters

           This automatically splits longer
           application answers into multiple
           fields.
        ================================= */

        const splitText = (text, maxLength = 1000) => {

            text = String(text || "Not provided");

            if (text.length <= maxLength) {
                return [text];
            }

            const chunks = [];

            let remaining = text;

            while (remaining.length > maxLength) {

                let splitAt =
                    remaining.lastIndexOf(
                        "\n",
                        maxLength
                    );

                if (splitAt < 100) {

                    splitAt =
                        remaining.lastIndexOf(
                            " ",
                            maxLength
                        );

                }

                if (splitAt < 100) {
                    splitAt = maxLength;
                }

                chunks.push(
                    remaining
                        .slice(0, splitAt)
                        .trim()
                );

                remaining =
                    remaining
                        .slice(splitAt)
                        .trim();

            }

            if (remaining.length > 0) {
                chunks.push(remaining);
            }

            return chunks;

        };


        /* ================================
           ADD LONG ANSWER FIELDS
        ================================= */

        const addLongField = (
            fields,
            name,
            value
        ) => {

            const chunks =
                splitText(
                    clean(value),
                    1000
                );

            chunks.forEach((chunk, index) => {

                fields.push({

                    name:
                        index === 0
                            ? name
                            : `${name} (continued)`,

                    value: chunk,

                    inline: false

                });

            });

        };


        /* ================================
           APPLICATION VALUES
        ================================= */

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
           BUILD DISCORD FIELDS
        ================================= */

        const fields = [

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
                    `**Previous Position:** ${previousPosition}`,

                inline: false
            }

        ];


        /* ================================
           LONG ANSWERS
        ================================= */

        addLongField(
            fields,
            "💼 Experience",
            experience
        );


        addLongField(
            fields,
            "🎓 Education",
            education
        );


        addLongField(
            fields,
            "🚗 Eligibility",
            `**Driver's License:** ${license}\n` +
            `**Eligible to Work:** ${eligible}`
        );


        addLongField(
            fields,
            "📝 Relevant Experience",
            relevantExperience
        );


        addLongField(
            fields,
            "❓ Why do you want to join LAFD?",
            motivation
        );


        addLongField(
            fields,
            "ℹ️ Additional Information",
            additional
        );


        /* ================================
           DISCORD LIMIT SAFETY
           
           Discord allows:
           - 25 fields per embed
           - 1024 chars per field
           - 6000 chars per embed

           If the application is extremely
           long, split it into multiple embeds.
        ================================= */

        const embeds = [];

        let currentFields = [];
        let currentCharacters = 0;

        const EMBED_CHARACTER_LIMIT = 5500;
        const EMBED_FIELD_LIMIT = 25;


        for (const field of fields) {

            const fieldCharacters =
                field.name.length +
                field.value.length;

            if (
                currentFields.length >= EMBED_FIELD_LIMIT ||
                currentCharacters + fieldCharacters >
                    EMBED_CHARACTER_LIMIT
            ) {

                embeds.push({

                    title:
                        embeds.length === 0
                            ? "🚒 New LAFD Employment Application"
                            : "🚒 LAFD Application — Continued",

                    description:
                        embeds.length === 0
                            ? "A new application has been submitted through the Los Angeles Fire Department Career Portal."
                            : `Application #${applicationNumber} — Continued`,

                    color: 11801115,

                    fields: currentFields

                });

                currentFields = [];
                currentCharacters = 0;

            }

            currentFields.push(field);

            currentCharacters += fieldCharacters;

        }


        /* ================================
           PUSH FINAL EMBED
        ================================= */

        if (currentFields.length > 0) {

            embeds.push({

                title:
                    embeds.length === 0
                        ? "🚒 New LAFD Employment Application"
                        : "🚒 LAFD Application — Continued",

                description:
                    embeds.length === 0
                        ? "A new application has been submitted through the Los Angeles Fire Department Career Portal."
                        : `Application #${applicationNumber} — Continued`,

                color: 11801115,

                fields: currentFields,

                footer: {

                    text:
                        "LAFD Career Portal • FiveM Roleplay"

                },

                timestamp:
                    application.submittedAt ||
                    new Date().toISOString()

            });

        }


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

                            embeds,

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

