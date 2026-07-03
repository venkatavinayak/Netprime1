# NetPrime - Full-Stack Movie Streaming Platform 🍿

NetPrime is a premium, secure full-stack cinematic movie streaming and subscription platform. It delivers an immersive, dark-themed user experience (with glassmorphism aesthetics and 3D tilts) powered by a Node.js + Express backend, MongoDB database, Firebase Client/Admin OAuth, and Razorpay Checkout gateway integration.

---

## 🚀 Key Full-Stack Features

1. **🔐 Advanced Authentication (Access/Refresh Tokens)**
   - Implements JWT Access Tokens (15 min) and Refresh Tokens (30 days) stored securely in `HttpOnly` and `SameSite=Strict` cookies.
   - Restores sessions automatically.
   - Enforces Email verification before purchasing subscriptions.
2. **📱 Device Management (Netflix style)**
   - Users can view all active logged-in devices (browser, operating system, IP, last active date) in their profile dashboard.
   - Allows users to log out from individual sessions or revoke all other sessions.
3. **💳 Locked Backend Subscription Checkout**
   - Implements Razorpay Checkout overlays for Cards and UPI payments.
   - **Backend Price Locking**: Discards client pricing; amounts are evaluated solely on the backend (`TRIAL ➔ ₹1`, `MONTHLY ➔ ₹199`, `YEARLY ➔ ₹1499`) to prevent tampering.
   - Secure Razorpay webhook listener (`POST /api/payments/webhook`) activates plans even if user browser is closed post-transaction.
4. ** Gated Movie Streaming Authorization**
   - Requests for movie playback verify credentials, checking active subscription status in MongoDB before serving streams.
   - Keeps track of watch history and automatically loads previous playback resume positions.
5. **🧾 Automatic PDF Invoice Receipts**
   - Automatically compiles PDF invoices on the fly using `pdfkit` and dispatches them via SMTP Nodemailer on successful purchases.
   - Invoice displays breakdown of base prices, 18% GST, and unique transaction numbers.
6. **📊 Administrator Analytics Portal**
   - Dedicated glassmorphic panel at `/admin.html` for administrators (`admin@netprime.com`).
   - Computes daily, monthly, and annual revenue metrics, active/expired users, and popular plans.
   - Supports searching users and transactions by email, IDs, or plan types.
7. **⚙️ Hardened Security Middlewares**
   - Incorporates Helmet, express-rate-limit, CORS, query injection sanitizers, and XSS parameter filters.
8. ** Winston & Morgan Auditing**
   - Morgan routes HTTP request access logs directly through Winston logs to `logs/combined.log` and security errors to `logs/error.log`.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom properties), Vanilla Javascript
- **Backend**: Node.js + Express
- **Database**: MongoDB (via Mongoose ORM)
- **OAuth Providers**: Firebase Auth Client SDK
- **Payment Gateway**: Razorpay
- **Libraries**: JWT, BcryptJS, CookieParser, Nodemailer, PDFKit, Node-Cron, Winston, Morgan, Helmet, Express-Rate-Limit

---

## 📂 Folder Structure

```text
NETPRIMEORG/
│
├── public/                 # FRONTEND ASSETS
│   ├── assets/             # Brand logos, posters, thumbnails
│   ├── css/                # main.css, components.css
│   ├── js/
│   │   ├── state.js        # Wraps client states to backend /api/auth/me
│   │   ├── auth.js         # Backend logins & Firebase Google OAuth logic
│   │   ├── checkout.js     # Links Razorpay SDK & dynamic QR API
│   │   ├── main.js         # DOM render engines & theme toggle
│   │   └── player.js       # Playback settings and resume syncing
│   ├── index.html          # Landing view
│   ├── movie.html          # Details view
│   ├── watch.html          # Movie watch view
│   ├── profile.html        # Account profile, devices & invoice lists
│   ├── checkout.html       # Checkout portal
│   ├── contact.html        # bot chat help desk
│   ├── admin.html          # Admin analytics panel
│   └── verify.html         # Verification redirect
│
├── src/                    # BACKEND IMPLEMENTATION
│   ├── config/             # DB, Firebase Admin, Razorpay clients
│   ├── controllers/        # Route controllers (Auth, Payments, Users, Admin)
│   ├── middleware/         # Auth verify, premium gates, error middleware, security
│   ├── models/             # Mongoose schemas (User, Subscription, Payment, Session)
│   ├── routes/             # API routing maps
│   └── utils/              # Nodemailer helpers, pdfkit compilers, cron sweeps
│
├── logs/                   # Winston log files
├── .env.example
├── .env                    # local secrets
├── package.json
└── server.js               # Entry point
```

---

## 🔧 Installation & Local Setup

### Prerequisite
Ensure [Node.js](https://nodejs.org) and [MongoDB](https://www.mongodb.com/try/download/community) are installed and running on your local machine.

### 1. Install Dependencies
Run the command below in the root folder:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your details:
```bash
cp .env.example .env
```
Ensure you update the secrets:
- `MONGODB_URI`: Local MongoDB port or MongoDB Atlas cluster connection string.
- `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET`: Long cryptographic strings for token signatures.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`: Test keys from your Razorpay Dashboard.
- `EMAIL_USER` / `EMAIL_PASS`: Gmail App password or custom SMTP authentication to deliver verification emails.

### 3. Developer Fallbacks & Mock Mode
To streamline testing:
- **Google OAuth**: If Firebase Client/Service config is omitted, Google login falls back to Developer Mock Mode where entering any email simulates authentication.
- **Payments**: If Razorpay credentials are placeholder defaults, checking out TRIAL/MONTHLY/YEARLY plans runs in Developer Mock Mode. Checkout automatically activates premium tiers locally.
- **Emails**: If SMTP credentials are defaults, verification links and invoice receipts are outputted directly to the backend logs in `combined.log` instead of crashing.

---

## 🏃 Running the Application

### Start Development Server (with nodemon)
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```
The server will bind to `http://localhost:5000`.

---

## 🔑 Administrative Privileges
To access the Admin Analytics Panel:
1. Sign up on the portal with the email `admin@netprime.com`.
2. Grab the activation link printed in your terminal or backend combined logs:
   `[MOCK EMAIL DISPATCH] To: admin@netprime.com`
3. Load the link in your browser to verify the email.
4. Log in as `admin@netprime.com`. You will be automatically redirected to `/admin.html`.
5. The Admin dashboard allows tracking total earnings, cancelling user plans, searching records, and deleting user accounts.
