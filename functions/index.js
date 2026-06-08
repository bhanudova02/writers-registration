const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const axios = require("axios");
const { Resend } = require("resend");

initializeApp();
const db = getFirestore();

// Initialize with a fallback to prevent deployment errors when parsing
const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key");

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
    
    try {
        const membersSnapshot = await db.collection("members").get();
        const today = new Date();
        
        let processedCount = 0;

        membersSnapshot.forEach(async (doc) => {
            const member = doc.data();
            
            // Skip Life Time Members or already disabled accounts
            if (member.memberType === "Life Time Member" || member.disabled === true) {
                return; 
            }

            // Assume we check 'lastRenewalDate' or fallback to 'dateOfJoining'
            const referenceDateStr = member.lastRenewalDate || member.dateOfJoining;
            if (!referenceDateStr) return;

            const referenceDate = new Date(referenceDateStr);
            
            // Calculate exact difference in years, months, days
            // For simplicity in a daily cron job, we check if today's Month and Day match the reference Month and Day.
            // If they match, it means an exact year anniversary has hit.
            if (today.getMonth() === referenceDate.getMonth() && today.getDate() === referenceDate.getDate()) {
                
                const yearsPassed = today.getFullYear() - referenceDate.getFullYear();

                let message = "";
                let penalty = 0;

                if (yearsPassed === 1) {
                    // Exactly 1 year: Account expires today, becomes Inactive
                    await doc.ref.update({ status: "Inactive" });
                    message = `Dear ${member.fullName}, your TCWA membership has expired today. Please login to your account and renew to keep it active.`;
                
                } else if (yearsPassed === 2) {
                    // 2 years passed (1 year inactive) -> Add 500 penalty
                    penalty = 500;
                    message = `Dear ${member.fullName}, your TCWA membership expired 1 year ago. A late penalty of Rs.${penalty} has been added. Total renewal is now base amount + ${penalty}. Please renew soon.`;
                
                } else if (yearsPassed === 3) {
                    // 3 years passed (2 years inactive) -> Add 1000 penalty
                    penalty = 1000;
                    message = `Dear ${member.fullName}, your TCWA membership expired 2 years ago. A late penalty of Rs.${penalty} has been added. This is your final year before your account gets completely disabled.`;
                
                } else if (yearsPassed > 3) {
                    // More than 3 years -> Disable the account
                    await doc.ref.update({ 
                        disabled: true, 
                        status: "Disabled" 
                    });
                    // Skip sending SMS for disabled accounts, or send a final termination SMS
                    console.log(`Account ${doc.id} disabled due to 3+ years inactivity.`);
                    return;
                }

                if (message !== "") {
                    // 1. Send SMS
                    if (member.mobileNumber) {
                        const smsResult = await sendSMS(member.mobileNumber, message);
                        await db.collection("communication_logs").add({
                            memberId: doc.id,
                            type: "SMS",
                            date: new Date(),
                            status: smsResult.success ? "Success" : "Failed",
                            error: smsResult.error || null,
                            messageSent: message
                        });
                    }

                    // 2. Send Email
                    if (member.emailAddress) {
                        const emailResult = await sendEmail(member.emailAddress, "TCWA Membership Renewal Reminder", `<p>${message}</p>`);
                        await db.collection("communication_logs").add({
                            memberId: doc.id,
                            type: "Email",
                            date: new Date(),
                            status: emailResult.success ? "Success" : "Failed",
                            error: emailResult.error || null,
                            messageSent: message
                        });
                    }
                }
            }
            processedCount++;
        });

        console.log(`Daily check completed. Processed ${processedCount} members.`);
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
        const response = await axios.get("https://www.fast2sms.com/dev/wallet", {
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
            sentBy: request.auth.token.email
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
            sentBy: request.auth.token.email
        });
    }

    return { success: true, smsResult, emailResult };
});
