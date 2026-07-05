# NetPrime - Agent Context

## Architecture

- **Frontend**: Vanilla HTML/CSS/JS static site in `client/` (deployed to Netlify or Vercel)
- **Backend**: Node.js + Express API in `server/` (deployed to Render)
- **Database**: MongoDB (Mongoose), local or Atlas
- **Auth**: **Clerk** (OAuth + OTP via ClerkJS CDN). `CLERK_PUBLISHABLE_KEY` is served to the backend to frontend via `GET /api/config/clerk`.
- **Payments**: Stripe (webhooks) + Razorpay
- **Server Entry**: `server/server.js`
- **Client Entry**: `client/index.html` (static, loads `client/js/state.js`, `auth.js`, `main.js`)

## Vercel Deployment (Frontend)

- **Deploy Platform**: [Vercel](https://vercel.com)
- **Build Command**: No build step required (pure HTML/CSS/JS)
- **Output Directory**: `client/`
- **Important**: Update the `BACKEND_URL` in `client/js/state.js` to point to your live Render backend URL before deploying.

## Netlify Deployment (Frontend)

- **Deploy Platform**: [Netlify](https://netlify.com)
- **Build Command**: No build step required
- **Publish Directory**: `client/`

## Developer Commands

```bash
# Start dev server (nodemon)
cd server && npm run dev

# Start production server
cd server && npm start
```

Server runs on `http://localhost:5000`.

## Clerk Setup

### Where to paste Clerk API Keys:

1. **`server/.env`** file:
   ```
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   CLERK_SECRET_KEY=your_clerk_secret_key_here
   ```

2. **Render Dashboard** (if deployed):
   - Add `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` as environment variables.

## Authentication Flow

- `client/js/auth.js` loads `ClerkJS` from CDN dynamically.
- It fetches `/api/config/clerk` to get the `publishableKey`.
- Backend session verification: `server/src/config/clerk.js` verifies Clerk JWTs using JWKS.
- Backend endpoint: `POST /api/auth/clerk` processes login/signup.

## Env Variables (server/.env)

```
PORT=5000
MONGODB_URI=...
ACCESS_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...

# Clerk Auth (REQUIRED)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payment Gateways (Optional for dev)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Email (Optional for dev)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...

# Frontend URL
CLIENT_URL=https://your-frontend-url.netlify.app
```

## Key Gotchas

- **No build step for frontend** — it's pure static HTML/CSS/JS.
- **Update `BACKEND_URL`** in `client/js/state.js` for production deployments.
- Payment webhooks (`/api/payments/webhook`, `/api/payments/stripe/webhook`) must be registered **before** `express.json()` middleware.
- If Clerk keys are missing, the "Continue with Clerk" buttons will gracefully degrade and show a warning in the console.
