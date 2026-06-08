const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const axios = require("axios");
const { Resend } = require("resend");

initializeApp();
const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;

// HELPER: Send SMS via Fast2SMS Quick SMS
async function sendSMS(phone, message) {
    try {
        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "q",
                message: message,
                language: "english",
                flash: 0,
                numbers: phone,
            },
            {
                headers: {
                    authorization: FAST2SMS_KEY,
                    "Content-Type": "application/json"
                }
            }
        );
        return { success: true, response: response.data };
    } catch (error) {
        console.error("SMS Error:", error.response ? error.response.data : error.message);
        return { success: false, error: error.message };
    }
}

// HELPER: Send Email via Resend
async function sendEmail(toEmail, subject, htmlContent) {
    try {
        const { data, error } = await resend.emails.send({
            from: "TCWA <updates@yourdomain.com>", // TODO: Change to verified domain email
            to: [toEmail],
            subject: subject,
            html: htmlContent,
        });
        if (error) throw new Error(error.message);
        return { success: true, data };
    } catch (err) {
        console.error("Email Error:", err.message);
        return { success: false, error: err.message };
    }
}

exports.dailyRenewalCheck = onSchedule("every day 09:00", async (event) => {
    console.log("Daily renewal check started at 9:00 AM");
    const membersSnapshot = await db.collection("members").get();
    
    // We will implement the actual logic for checking exactly 1 year and 3 years later.
    // This is the initial setup file.
});
