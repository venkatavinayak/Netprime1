# NetPrime - Full-Stack Movie Streaming Platform 🍿

NetPrime is a premium, secure, and visually stunning full-stack cinematic movie streaming and subscription platform. The codebase is organized into a clean split-folder architecture (separated Frontend Client and Node.js + Express Backend Server) optimized for instant cloud deployments.

---

## 🔗 Live Deployments

*   **Frontend (Netlify)**: [https://netprime-venkatavinayak.netlify.app](https://netprime-venkatavinayak.netlify.app)
*   **Backend API (Render)**: [https://netprime1.onrender.com](https://netprime1.onrender.com)

---

## 🚀 Key Full-Stack Features

1. **🔐 Advanced Authentication (Access/Refresh Tokens)**
   * Implements secure JWT Access Tokens (15 min) and Refresh Tokens (30 days) stored inside `HttpOnly` and `SameSite` cross-origin cookies.
   * Restores sessions automatically and supports Google OAuth/Sign-in natively.
   * Enforces email verification before allowing subscription purchases.
2. **📱 Device Management (Netflix style)**
   * Users can view all active logged-in device sessions (browser, operating system, IP, last active date) in their profile dashboard.
   * Allows users to log out from individual sessions or revoke all other sessions.
3. **💳 Dual Payment Integration (Stripe & Razorpay)**
   * **Stripe Checkout**: Integrated for secure international credit card checkouts and webhook processing (`POST /api/payments/stripe/webhook`).
   * **Razorpay Gateway**: Integrated for local card checkouts and dynamic peer-to-peer UPI QR code generators.
   * **Backend Price Locking**: Discards client pricing; amounts are evaluated solely on the backend to prevent tampering.
4. **🔒 Gated Movie Streaming Authorization**
   * Verifies credentials and checks active subscription validity in MongoDB before authorizing video streams.
   * Tracks watch history and automatically restores playback positions.
5. **🧾 Automatic PDF Invoice Receipts**
   * Compiles professional PDF receipts on the fly using `pdfkit` and dispatches them via SMTP Nodemailer on successful purchases.
6. **📊 Admin Analytics Portal**
   * Glassmorphic panel at `/admin.html` for administrators (`admin@netprime.com`) to track revenue, active users, popular plans, search details, and terminate plans.
7. **⚙️ Hardened Security Middlewares**
   * Incorporates Helmet, express-rate-limit, CORS, query injection sanitizers, and XSS parameter filters.
8. **📝 Auditing Logs**
   * Winston logs HTTP request entries to `server/logs/combined.log` and security errors to `server/logs/error.log`.

---

## 📂 Folder Structure

```text
NETPRIMEORG/
│
├── client/                 # FRONTEND STATIC FILES (Deployed to Netlify)
│   ├── assets/             # Brand logos, posters, thumbnails
│   ├── css/                # main.css, components.css
│   ├── js/
│   │   ├── state.js        # Global state manager & API redirection wrapper
│   │   ├── auth.js         # Firebase Auth client login & Google OAuth
│   │   ├── checkout.js     # Stripe Checkout & Razorpay payment bindings
│   │   ├── main.js         # DOM render engines & theme toggle
│   │   └── player.js       # Playback syncing & history restore
│   ├── index.html          # Landing view
│   ├── movie.html          # Movie details view
│   ├── watch.html          # Video player screen
│   ├── profile.html        # Account profile, devices & invoice lists
│   ├── checkout.html       # Subscriptions billing portal
│   ├── contact.html        # Support desk
│   ├── admin.html          # Admin panel
│   └── verify.html         # Email verification redirect callback
│
└── server/                 # Express BACKEND API (Deployed to Render)
    ├── src/
    │   ├── config/         # Database, Firebase Admin, and Stripe clients
    │   ├── controllers/    # Route controllers (Auth, Payments, Users, Admin)
    │   ├── middleware/     # Auth checks, premium gates, security
    │   ├── models/         # Mongoose schemas (User, Subscription, Payment, Session)
    │   ├── routes/         # API endpoints mapping
    │   └── utils/          # Nodemailer helpers, pdfkit compilers, cron sweeps
    ├── logs/               # Winston runtime log files
    ├── .env.example
    ├── package.json        # Server packages & runtime scripts
    └── server.js           # Server startup entry point
```

---

## 🔧 Installation & Local Setup

### Prerequisites
Ensure [Node.js](https://nodejs.org) and [MongoDB](https://www.mongodb.com/try/download/community) are installed and running locally.

### 1. Install Server Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment Variables
Copy `server/.env.example` to `server/.env` and update the keys:
*   `MONGODB_URI`: Local MongoDB port or MongoDB Atlas cluster connection string.
*   `CLIENT_URL`: URL of the client frontend (e.g. `http://localhost:5000` or Netlify URL).
*   `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET`: Long cryptographic strings for token signatures.
*   `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`: Developer keys from your Stripe dashboard.

### 3. Developer Mock Mode Fallbacks
To facilitate testing without third-party accounts:
*   **Google OAuth**: If Firebase credentials are omitted, Google authentication falls back to developer mock mode (entering any email simulates login).
*   **Stripe / Razorpay**: If payment gateway credentials are left empty, checking out plans runs in mock mode, automatically activating premium tiers locally.
*   **Emails**: If SMTP credentials are left empty, verification links and invoice receipts are outputted directly to the backend terminal logs instead of crashing.

---

## 🏃 Running the Application

### Start Development Server (Nodemon)
```bash
cd server
npm run dev
```

### Start Production Server
```bash
cd server
npm start
```
The local server will run on `http://localhost:5000`.

---

## ☁️ Cloud Deployments

### 🌐 Frontend (Netlify)
Deploy the `client/` folder as a static site.
*   Update the `BACKEND_URL` at the top of `client/js/state.js` to point to your live Render backend API URL.

### ⚙️ Backend (Render)
Deploy the `server/` folder as a Web Service.
*   **Root Directory**: Set to `server`.
*   **Build Command**: `npm install`
*   **Start Command**: `npm start`
*   **Environment Variables**: Configure variables matching your `.env` settings (set `NODE_ENV` to `production` and add your `FIREBASE_SERVICE_ACCOUNT_JSON` configuration string).
