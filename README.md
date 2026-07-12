# 🍿 NetPrime

Welcome to NetPrime! A gorgeous, dark-themed mockup streaming platform designed to look premium, run fast, and offer a modern user experience. 

### 🌐 Live Deployments
- **Frontend App**: [https://venkat-portfolio-streaming.netlify.app](https://venkat-portfolio-streaming.netlify.app)
- **Backend API**: [https://netprime1.onrender.com](https://netprime1.onrender.com)

We built NetPrime to show off beautiful glassmorphic interfaces (using pure Vanilla CSS), custom media player controls, dual authentication choices (Clerk CDN SSO or a custom local OTP pipeline), and fully-functional Stripe & Razorpay checkouts. 

---

## 📂 Project Structure

Here is the complete, detailed project layout showcasing every directory and code file:

```
NETPRIMEORG/
├── client/                     # Frontend static files (No build step required!)
│   ├── assets/                 # Movie trailers, poster images, and SVGs
│   ├── css/
│   │   ├── components.css      # Core styles for cards, grids, buttons, & glassmorphism
│   │   └── main.css            # Base stylesheet (reset, variables, typography)
│   ├── js/
│   │   ├── auth.js             # Handles Clerk SSO & custom session authentication
│   │   ├── checkout.js         # Integration with Stripe & Razorpay SDKs
│   │   ├── main.js             # UI controls (sliders, watchlists, search filters)
│   │   ├── player.js           # HTML5 media player controls & keyboard shortcuts
│   │   └── state.js            # Global state manager & backend API route configuration
│   ├── admin.html              # Administrator portal dashboard
│   ├── checkout.html           # Stripe / Razorpay checkouts and plan selections
│   ├── contact.html            # Contact and support form
│   ├── index.html              # Main homepage and movie listings catalog
│   ├── login.html              # Custom OTP login and standard credentials page
│   ├── movie.html              # Specific movie details, reviews, and trailer view
│   ├── profile.html            # User account settings, billing invoices & sub info
│   ├── signup.html             # Custom OTP registration form
│   ├── verify.html             # OTP email verification verification code input
│   └── watch.html              # Immersive movie screening view with custom player
│
└── server/                     # Backend API server (Node.js)
    ├── src/
    │   ├── config/
    │   │   ├── clerk.js        # Backend verification mechanism for Clerk JWTs
    │   │   ├── db.js           # MongoDB connection configuration via Mongoose
    │   │   └── razorpay.js     # Razorpay payment gateway initializer
    │   ├── controllers/
    │   │   ├── adminController.js # Admin operations, database CRUD, & logs
    │   │   ├── authController.js  # Registration, login, and custom OTP controls
    │   │   ├── paymentController.js # General order verification and webhook endpoints
    │   │   ├── stripeController.js  # Stripe sessions, payment intents, and webhook parsing
    │   │   └── userController.js  # Profile retrieval, updates, and watchlist sync
    │   ├── middleware/
    │   │   ├── authMiddleware.js  # JWT verification guards for private routes
    │   │   ├── errorMiddleware.js # Centralized HTTP response error interceptor
    │   │   └── securityMiddleware.js # CORS, rate-limiters, & Helmet security headers
    │   ├── models/
    │   │   ├── Payment.js      # Mongoose schema for transaction tracking
    │   │   ├── Session.js      # Custom authentication session history logs
    │   │   ├── Subscription.js # User subscription active state and plans
    │   │   └── User.js         # User records, password hashing, and watchlist fields
    │   ├── routes/
    │   │   ├── adminRoutes.js  # Administrative control endpoints
    │   │   ├── authRoutes.js   # Custom and Clerk authorization routes
    │   │   ├── paymentRoutes.js # Orders, webhooks, checkout sessions
    │   │   └── userRoutes.js   # User information retrieval and update endpoints
    │   └── utils/
    │       ├── email.js        # Nodemailer OTP email dispatch helper
    │       ├── logger.js       # Winston logger setup (combined and error logs)
    │       ├── pdf.js          # Programmatic PDF invoice generator (via pdfkit)
    │       └── scheduler.js    # Subscription expiry checkers (cron jobs)
    ├── .env.example            # Environment variables starter guide template
    ├── server.js               # Express core application and routing router map
    └── package.json            # Node.js backend configuration and dependency tree
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
