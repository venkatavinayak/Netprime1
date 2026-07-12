# 🍿 NetPrime

Welcome to NetPrime! A gorgeous, dark-themed mockup streaming platform designed to look premium, run fast, and offer a modern user experience. 

### 🌐 Live Deployments
- **Frontend App**: [https://venkat-portfolio-streaming.netlify.app](https://venkat-portfolio-streaming.netlify.app)
- **Backend API**: [https://netprime1.onrender.com](https://netprime1.onrender.com)

We built NetPrime to show off beautiful glassmorphic interfaces (using pure Vanilla CSS), custom media player controls, dual authentication choices (Clerk CDN SSO or a custom local OTP pipeline), and fully-functional Stripe & Razorpay checkouts. 

---

## 📂 Project Structure

Here is a mid-sized layout of the project covering all files at a glance:

```
NETPRIMEORG/
├── client/                     # Frontend (Static site, zero build step)
│   ├── assets/                 # Movie trailers, poster images, and SVGs
│   ├── css/                    # components.css, main.css
│   ├── js/                     # auth.js, checkout.js, main.js, player.js, state.js
│   └── *.html                  # admin, checkout, contact, index, login, movie, profile, signup, verify, watch
│
└── server/                     # Backend API (Node.js)
    ├── src/
    │   ├── config/             # clerk.js, db.js, razorpay.js
    │   ├── controllers/        # adminController, authController, paymentController, stripeController, userController
    │   ├── middleware/         # authMiddleware, errorMiddleware, securityMiddleware
    │   ├── models/             # Payment.js, Session.js, Subscription.js, User.js
    │   ├── routes/             # adminRoutes, authRoutes, paymentRoutes, userRoutes
    │   └── utils/              # email.js, logger.js, pdf.js, scheduler.js
    ├── .env.example            # Environment setup template
    ├── server.js               # Backend server entry point
    └── package.json            # Backend packages and scripts
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
