# TCWA Script Registration - Final End-to-End SOP

## 1. Login & Security Validation (Strict Login)
- **Login Process:** User valla Mobile Number mariyu "Membership ID" enter cheyyali.
- **Validation:** Ee rendu details mana database lo unna (800 members list) details tho exact ga match ayithe matrame OTP velli login avutharu. Match avvakapothe login asalu avvadu (Only approved members matrame login avvagalagali).

## 2. Types of Members & Validity Rules (Membership Rules)
Database lo unna 800 members rendu rakalu. Valla details (Name, Email, Phone, ID, Status) munduge admin upload chestaru.

### A. Life Time Members
- Vellaki expiry undadu, account permanent ga valid untundi.

### B. Associate Members (Strict 5-Years Rule)
- Associate members prathi samvatsaram (every year) manual ga certain amount pay chesi renew chesukovali. (Deeniki online payment ledu, offline lone jaruguthundi).
- **Expiry Warning Modal:** Valla 1 year validity daggara paduthunappudu leda aipoyaka, vallu login ayinappudu oka pedda "Warning Modal" vasthundi. Admin backend nunchi permission (renew status) iche varaku user ah modal ni close cheyaleru.
- **SMS Alerts:** Validity expire aipoyaka, vallaki prathi nela automatically oka text message (SMS) velthundi.
- **5 Years Continuous Non-Renewal Rule:** Oka Associate member varusaga (continuously) 5 yella patu membership renew chesukokapothe (ante 5 years payment cheyakunda unte), appudu matrame valla account completely "Inactive" aipothundi. Vallu prathi samvatsaram renew chesukunte, account eppatiki Inactive kaadu.
- **Upgrade to Life Member:** Okavela Associate member future lo Life Member ga maralante, Admin dashboard lo oka **"Upgrade to Life Member"** option untundi. Admin ah button click chesthe, valla account permanent ga Life Member account la maripothundi (Inka 5-years limit/renewals undavu).

---

## 3. User Dashboard (Single Page UI)
User login ayyaka confuse avvakunda antha okate page (Single Page) lo kanipisthundi:
- **Top Section:** User Name, Membership ID, mariyu Status (Associate a / Life member a) ani display avuthundi.
- **Registration Form:** Kindhane kotha script register chesukune form untundi.
- **Categories:** "Story", "Screenplay", "Songs", "Dialogues" ani 4 options untayi. User ki em kavaalo (e.g., Screenplay) adi select chesukuni PDF upload chestaru.

---

## 4. Privacy, Payment & Automatic Approval
Idi website loni chala main feature (100% Privacy for Writers):
- **Razorpay Payment:** PDF loni pages batti calculate ayyina amount ni user Razorpay dwara pay chestaru.
- **Automatic Approval:** Payment success ayyina ventane automatic ga "Approve" aipoyi, Signature & Stamp thoti receipt ready aipothundi (Admin manually approve cheyalsina avasaram ledu).
- **Admin Cannot Read PDF:** User upload chesina Script/PDF ni Admin kuda chadavaleru! Admin dashboard lo kevalam Receipt details (Member peru, Script title, enni pages, ye time ki pay chesaru) matrame record avuthayi. Asalu ah file ni database nunchi evaru open cheyaleru.

---

## 5. One-Time Download Restriction (Re-Payment Logic)
- **Warning Message:** Payment ayyaka user ki stamped receipt kanipisthundi. Kani download chese mundu oka warning vasthundi: *"Idi meeru okkasari matrame download chesukogalaru"*.
- **Lock System:** Okkasari download click chesi theesukunnaka, ah button "Locked" aipothundi.
- **Re-Download Payment:** Okavela ah signature/stamp unna receipt vallaki malli kavalante, vallu **malli Razorpay dwara full amount pay cheyalsinde**. Pay chesteనే malli download unlock avuthundi.

---

## 6. Development Phases (Coding Plan)

**Phase 1: Basic Setup & Strict Auth**
- React + Vite folder create cheyyadam.
- Firebase lo Phone + Membership ID strict verification auth logic rayadam.

**Phase 2: Database & Expiry Logic**
- Life & Associate members (800 members) Excel data upload.
- Associate members ki 5-years strict rule, Yearly Expiry Warning Modal, mariyu SMS cron jobs setup cheyyadam.

**Phase 3: Single Page User Dashboard**
- Okate page lo User Profile, 4 Category Options, mariyu PDF upload section design cheyyadam.
- PDF pages calculate chesi Razorpay ki link cheyyadam.

**Phase 4: Automatic Approval & Privacy System**
- Payment success avvagane automatic ga TCWA Stamp & Sign tho receipt generate cheyyadam.
- PDF file ni encrypt chesi leda admin ki kanipinchakunda privacy rules rayadam.

**Phase 5: Download Restrictions**
- One-time download warning mariyu Lock logic implement cheyyadam.
- Re-download ki malli Razorpay payment popup ochela rayadam.

**Phase 6: Live on Vercel**
- Project ni Vercel lo host chesi Hostinger domain connect cheyyadam.
