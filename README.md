# 🍿 NetPrime

Welcome to NetPrime! A gorgeous, dark-themed mockup streaming platform designed to look premium, run fast, and offer a modern user experience. 

We built NetPrime to show off beautiful glassmorphic interfaces (using pure Vanilla CSS), custom media player controls, dual authentication choices (Clerk CDN SSO or a custom local OTP pipeline), and fully-functional Stripe & Razorpay checkouts. 

---

## 📂 Project Structure

At a high level, the project is organized into two primary folders:

```
NETPRIMEORG/
├── client/          # Frontend website (HTML, CSS, JS) — Zero build steps needed!
│   ├── assets/      # Movie images, posters, and icons
│   ├── css/         # Styling files (glassmorphism design & animations)
│   ├── js/          # Browser scripts (auth handlers, video player, Stripe payment flow)
│   └── *.html       # HTML pages (home screen, login, user profile, custom video player)
│
└── server/          # Backend API (Node.js & Express)
    ├── src/         # Database models, API routes, and helper functions
    └── server.js    # Express server entry point (runs on http://localhost:5000)
```

- **`client/`**: The frontend static website. Since it is written in vanilla HTML, CSS, and JS, there is **no build step required**. You can serve it using any simple static file server or host it directly on Netlify or Vercel.
- **`server/`**: The Node.js + Express backend API. It handles user registration, database records (via MongoDB), security, scheduled subscription tasks, and payment webhooks.

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
