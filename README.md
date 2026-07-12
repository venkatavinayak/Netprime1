# 🍿 NetPrime

Welcome to NetPrime! A gorgeous, dark-themed mockup streaming platform designed to look premium, run fast, and offer a modern user experience. 

### 🌐 Live Deployments
- **Frontend App**: [https://venkat-portfolio-streaming.netlify.app](https://venkat-portfolio-streaming.netlify.app)
- **Backend API**: [https://netprime1.onrender.com](https://netprime1.onrender.com)

We built NetPrime to show off beautiful glassmorphic interfaces (using pure Vanilla CSS), custom media player controls, dual authentication choices (Clerk CDN SSO or a custom local OTP pipeline), and fully-functional Stripe & Razorpay checkouts. 

---

## 📂 Project Structure

Here is a simplified layout covering all key directories and files in the project:

```
NETPRIMEORG/
├── client/                     # Frontend website (HTML, CSS, JS) — No build step required!
│   ├── assets/                 # SVGs, images, and video assets
│   ├── css/                    # Custom CSS stylesheets (layout, themes, & animations)
│   ├── js/                     # Client-side JavaScript logic:
│   │   ├── auth.js             # Clerk authentication & user login state
│   │   ├── checkout.js         # Stripe & Razorpay SDK interactions
│   │   ├── main.js             # UI scripts (sliders, search, and page actions)
│   │   ├── player.js           # Custom HTML5 media player controls
│   │   └── state.js            # Global state management & backend base URLs
│   ├── index.html              # Homepage & main movie list catalog
│   ├── login.html / signup.html # Authenticaton views (Login, Signup, OTP Verification)
│   ├── movie.html / watch.html # Movie detail views & video player window
│   └── profile.html            # User settings, billing invoices, & subscriptions
│
└── server/                     # Backend API server (Node.js & Express)
    ├── src/                    # Backend source code:
    │   ├── config/             # Database connection & Clerk auth initializers
    │   ├── controllers/        # Logic handlers (payments, user data, auth endpoints)
    │   ├── middleware/         # Security headers, CORS, & rate-limiters
    │   ├── models/             # Mongoose schemas (User, Subscription, Payment, Session)
    │   ├── routes/             # Express API endpoints mapping
    │   └── utils/              # PDF invoice generator, mailer, & cron schedulers
    └── server.js               # Express application gateway (runs on http://localhost:5000)
```

---

## ✨ Features We Love
- **Glassmorphic & Responsive Design**: Visually stunning cards, carousels, and responsive layouts designed directly in custom CSS.
- **Two Auth Options**: Connect using standard social buttons via ClerkJS, or try the custom email OTP passwordless flow.
- **Stripe & Razorpay Checkout**: Fully functional payment test-flows, complete with webhooks to activate user subscriptions.
- **Custom HTML5 Player**: Built-in video player supporting custom scrubbers, resolution selectors, and keyboard shortcuts.
- **Security-First API**: Pre-integrated with Helmet headers, XSS sanitizers, database query protection, and endpoint rate-limiting.

---

## ⚙️ How to Get Started

### 1. Configure the Environment
Create a `.env` file inside the `server/` directory. Here is a starter template:

```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/netprime

# Tokens
ACCESS_TOKEN_SECRET=your_jwt_access_secret_here
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret_here

# Clerk Auth Keys (Required if using Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Nodemailer Settings (For custom signup OTPs)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Client Base Domain
CLIENT_URL=http://localhost:5000
```

### 2. Install and Run Locally
Open your terminal and run the following commands:

```bash
# Go to server directory & install packages
cd server
npm install

# Run the app in development mode
npm run dev
```
The application will launch on `http://localhost:5000`, automatically serving your static frontend files from the `client/` folder.

---

## 🌐 Production Deployments

- **Frontend Hosting (Netlify / Vercel)**: Point your deploy settings to publish the `client/` directory. Remember to update the backend api base URL inside `client/js/state.js` to point to your live hosted API before deploying.
- **Backend Hosting (Render / Heroku)**: Host the `server/` folder and copy your environment variables over. Ensure your payment webhook secrets match the live environment.
