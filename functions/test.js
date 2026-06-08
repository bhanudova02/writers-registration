const axios = require('axios');
const nodemailer = require("nodemailer");

const key = 'A4foQwlupr92I1Tvd8skHB6hOGK7JYPaVX5qxbSgjzLEFNZeUmKjRbxCmkSd6qLD3OAGUhgsEPiuINHf';

// The user must put their Google App Password here for testing:
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "dummy_password";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "telugucinewritersassociation1@gmail.com",
        pass: GMAIL_APP_PASSWORD
    }
});

const testPhone = "6302715653";
const testEmail = "bhanudova02@gmail.com";

async function testSMS() {
    try {
        console.log(`Testing SMS to ${testPhone}...`);
        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "q",
                message: "Test message from TCWA Dashboard",
                language: "english",
                flash: 0,
                numbers: testPhone,
            },
            {
                headers: {
                    "authorization": key,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log("SMS OK:", response.data);
    } catch (e) {
        console.error("SMS Error:", e.response ? e.response.data : e.message);
    }
}

async function testEmailFunc() {
    try {
        console.log(`Testing Email to ${testEmail}...`);
        const info = await transporter.sendMail({
            from: '"TCWA Updates" <telugucinewritersassociation1@gmail.com>',
            to: testEmail,
            subject: "Test from TCWA",
            html: "<p>This is a test email sent using Nodemailer!</p>",
        });
        console.log("Email OK:", info.messageId);
    } catch (err) {
        console.error("Email Error:", err.message);
    }
}

async function run() {
    await testSMS();
    await testEmailFunc();
}

run();
