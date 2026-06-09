const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const axios = require("axios");
const nodemailer = require("nodemailer");

initializeApp();
const db = getFirestore();

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "telugucinewritersassociation1@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD || "dummy_password"
    }
});

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
                    authorization: process.env.FAST2SMS_API_KEY || "dummy",
                    "Content-Type": "application/json"
                }
            }
        );
        // Fast2SMS returns { return: true/false, request_id, message[] }
        const apiSuccess = response.data && response.data.return === true;
        console.log("Fast2SMS response:", JSON.stringify(response.data));
        if (!apiSuccess) {
            const errMsg = (response.data?.message || []).join(", ") || "Fast2SMS rejected the request";
            return { success: false, error: errMsg };
        }
        return { success: true, response: response.data };
    } catch (error) {
        const errDetail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("SMS Error:", errDetail);
        return { success: false, error: errDetail };
    }
}

// HELPER: Send Email via Nodemailer (Gmail)
async function sendEmail(toEmail, subject, htmlContent) {
    try {
        const info = await transporter.sendMail({
            from: '"TCWA Updates" <telugucinewritersassociation1@gmail.com>',
            to: toEmail,
            subject: subject,
            html: htmlContent,
        });
        return { success: true, data: info };
    } catch (err) {
        console.error("Email Error:", err.message);
        return { success: false, error: err.message };
    }
}

exports.dailyRenewalCheck = onSchedule("every day 09:00", async (event) => {
    console.log("Daily renewal check started at 9:00 AM");

    try {
        const membersSnapshot = await db.collection("members").get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const doc of membersSnapshot.docs) {
            const member = doc.data();

            // Skip Life Time Members or disabled accounts
            if (member.memberType === "Life Time Member" || member.disabled === true) continue;

            const referenceDateStr = member.lastRenewalDate || member.dateOfJoining;
            if (!referenceDateStr) continue;

            const referenceDate = new Date(referenceDateStr);
            referenceDate.setHours(0, 0, 0, 0);

            // Calculate next expiry = referenceDate + 1 year (anniversary)
            const nextExpiry = new Date(referenceDate);
            nextExpiry.setFullYear(referenceDate.getFullYear() + 1);

            // Days until expiry
            const msPerDay = 24 * 60 * 60 * 1000;
            const daysUntilExpiry = Math.round((nextExpiry - today) / msPerDay);

            let message = "";
            let logType = "Reminder";

            // ─── CASE 1: 7 days before expiry ───
            if (daysUntilExpiry === 7) {
                message = `Dear ${member.fullName}, your TCWA membership will expire in 7 days (on ${nextExpiry.toDateString()}). Please visit the TCWA office to renew your membership before the due date. - TCWA`;
                logType = "7-Day Reminder";
            }

            // ─── CASE 2: Expiry day ───
            else if (daysUntilExpiry === 0) {
                await doc.ref.update({ status: "Inactive" });
                message = `Dear ${member.fullName}, your TCWA membership has expired today. Please visit the TCWA office as soon as possible to renew your membership and restore your active status. - TCWA`;
                logType = "Expiry Notice";
            }

            // ─── CASE 3: Penalty years (existing logic) ───
            else {
                const yearsPassed = today.getFullYear() - referenceDate.getFullYear();
                const sameMonthDay = today.getMonth() === referenceDate.getMonth() && today.getDate() === referenceDate.getDate();

                if (sameMonthDay) {
                    if (yearsPassed === 2) {
                        message = `Dear ${member.fullName}, your TCWA membership expired 1 year ago. A late penalty of Rs.500 has been added to your renewal amount. Please visit the TCWA office immediately to renew your membership. - TCWA`;
                    } else if (yearsPassed === 3) {
                        message = `Dear ${member.fullName}, your TCWA membership expired 2 years ago. A late penalty of Rs.1000 has been added. This is your final reminder. Please visit the TCWA office urgently before your account is permanently closed. - TCWA`;
                    } else if (yearsPassed > 3) {
                        await doc.ref.update({ disabled: true, status: "Disabled" });
                        console.log(`Account ${doc.id} disabled due to 3+ years inactivity.`);
                    }
                }
            }

            // ─── Send SMS + Email if message exists ───
            if (message) {
                const smsResult = member.mobileNumber ? await sendSMS(member.mobileNumber, message) : null;
                const emailResult = member.emailAddress ? await sendEmail(member.emailAddress, `TCWA Membership - ${logType}`, `<p>${message}</p>`) : null;

                const hasPhone = !!member.mobileNumber;
                const hasEmail = !!member.emailAddress;
                const bothAvailable = hasPhone && hasEmail;

                if (bothAvailable) {
                    const bothStatus = (smsResult.success && emailResult.success) ? "Success"
                        : (!smsResult.success && !emailResult.success) ? "Failed" : "Partial";
                    await db.collection("communication_logs").add({
                        memberId: doc.id,
                        type: "Both",
                        date: new Date(),
                        status: bothStatus,
                        smsStatus: smsResult.success ? "Success" : "Failed",
                        emailStatus: emailResult.success ? "Success" : "Failed",
                        smsError: smsResult.error || null,
                        emailError: emailResult.error || null,
                        messageSent: message,
                        isCustom: false,
                        logType,
                        smsRecipient: member.mobileNumber,
                        emailRecipient: member.emailAddress,
                        recipient: member.mobileNumber
                    });
                } else {
                    if (smsResult) {
                        await db.collection("communication_logs").add({
                            memberId: doc.id, type: "SMS", date: new Date(),
                            status: smsResult.success ? "Success" : "Failed",
                            error: smsResult.error || null, messageSent: message,
                            isCustom: false, logType, recipient: member.mobileNumber
                        });
                    }
                    if (emailResult) {
                        await db.collection("communication_logs").add({
                            memberId: doc.id, type: "Email", date: new Date(),
                            status: emailResult.success ? "Success" : "Failed",
                            error: emailResult.error || null, messageSent: message,
                            isCustom: false, logType, recipient: member.emailAddress
                        });
                    }
                }
                console.log(`[${logType}] Sent to ${member.fullName} (${doc.id})`);
            }
        }

        console.log("Daily renewal check completed.");
    } catch (error) {
        console.error("Error in daily renewal check:", error);
    }
});


const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.getCommunicationBalances = onCall(async (request) => {
    if (!request.auth || !request.auth.token.email) {
        throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const adminDoc = await db.collection("admins").doc(request.auth.token.email).get();
    if (!adminDoc.exists) {
        throw new HttpsError('permission-denied', 'Must be an admin');
    }

    try {
        const response = await axios.post("https://www.fast2sms.com/dev/wallet", {}, {
            headers: {
                authorization: process.env.FAST2SMS_API_KEY || "dummy"
            }
        });
        const walletBalance = response.data.wallet;
        return { 
            smsWalletBalance: walletBalance,
            emailBalance: "Unlimited"
        };
    } catch (error) {
        console.error("Wallet Error:", error.message);
        throw new HttpsError('internal', 'Failed to fetch balances');
    }
});

exports.sendCustomMessage = onCall(async (request) => {
    if (!request.auth || !request.auth.token.email) {
        throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const adminDoc = await db.collection("admins").doc(request.auth.token.email).get();
    if (!adminDoc.exists) {
        throw new HttpsError('permission-denied', 'Must be an admin');
    }

    const { memberId, phone, emailAddress, message, sendToSms, sendToEmail } = request.data;
    
    if (!message) {
        throw new HttpsError('invalid-argument', 'Message is required');
    }

    let smsResult = null;
    let emailResult = null;

    if (sendToSms && sendToEmail && phone && emailAddress) {
        // BOTH selected → send both, create ONE log document
        smsResult = await sendSMS(phone, message);
        emailResult = await sendEmail(emailAddress, "TCWA Notification", `<p>${message}</p>`);
        const bothStatus = (smsResult.success && emailResult.success) ? "Success"
            : (!smsResult.success && !emailResult.success) ? "Failed" : "Partial";
        await db.collection("communication_logs").add({
            memberId: memberId || "Custom",
            type: "Both",
            date: new Date(),
            status: bothStatus,
            smsStatus: smsResult.success ? "Success" : "Failed",
            emailStatus: emailResult.success ? "Success" : "Failed",
            smsError: smsResult.error || null,
            emailError: emailResult.error || null,
            messageSent: message,
            isCustom: true,
            sentBy: request.auth.token.email,
            smsRecipient: phone,
            emailRecipient: emailAddress,
            recipient: phone
        });
    } else {
        if (sendToSms && phone) {
            smsResult = await sendSMS(phone, message);
            await db.collection("communication_logs").add({
                memberId: memberId || "Custom",
                type: "SMS",
                date: new Date(),
                status: smsResult.success ? "Success" : "Failed",
                error: smsResult.error || null,
                messageSent: message,
                isCustom: true,
                sentBy: request.auth.token.email,
                recipient: phone
            });
        }
        if (sendToEmail && emailAddress) {
            emailResult = await sendEmail(emailAddress, "TCWA Notification", `<p>${message}</p>`);
            await db.collection("communication_logs").add({
                memberId: memberId || "Custom",
                type: "Email",
                date: new Date(),
                status: emailResult.success ? "Success" : "Failed",
                error: emailResult.error || null,
                messageSent: message,
                isCustom: true,
                sentBy: request.auth.token.email,
                recipient: emailAddress
            });
        }
    }

    return { success: true, smsResult, emailResult };

});
