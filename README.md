# TCWA Script Registration App (Telugu Cine Writers Association)

This repository contains the full source code for the TCWA Script Registration ecosystem, divided into two distinct portals:

1. **User Writers Registration Portal (`user-writers-registration/`)**: Allows TCWA members to securely register their movie scripts, calculate page numbers, upload PDFs, and complete payments via Razorpay.
2. **Admin Writers Dashboard (`admin-writers-registration/`)**: Enables administrators to manage script registrations, view member logs, edit membership data, and approve registrations.

## Technologies Used
- **Frontend**: React, Vite, TailwindCSS (for Admin), Vanilla CSS (for User)
- **Database & Authentication**: Firebase Firestore, Firebase Storage, Firebase Phone Authentication (OTP)
- **Payment Gateway**: Razorpay API

## Folder Structure
```
writers-registration/
├── admin-writers-registration/   # React Admin Portal
├── user-writers-registration/    # React User Script Portal
└── README.md                     # Root documentation
```

## Getting Started
To run either portal locally:
1. Navigate into the respective directory:
   ```bash
   cd admin-writers-registration
   # or
   cd user-writers-registration
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file containing the Firebase credentials.
4. Start the local server:
   ```bash
   npm run dev
   ```
