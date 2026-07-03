# NetPrime 🍿

NetPrime is a premium, client-side mock movie streaming and subscription platform. It delivers an immersive, dark-themed user experience (with a toggleable light mode) designed with modern CSS features, glassmorphism aesthetics, fluid transitions, and a micro-interactive UI/UX.

---

## ✨ Key Features

- **🎬 Full Streaming Simulation**: Rich catalog of movies categorized by language (Telugu, Tamil, Malayalam, Kannada) and genre, complete with ratings, durations, and casts.
- **💳 Interactive Subscription Gateway (`checkout.html`)**:
  - Supports multiple tiers (₹1 Free Trial, ₹199 Monthly, ₹1499 Yearly).
  - Interactive credit card flipping animation.
  - Unified UPI payment switcher with providers (GPay, PhonePe, Paytm, BHIM).
  - **Dynamic UPI QR Code Generation**: Generates real-time static UPI QR codes based on selected package pricing using live QR APIs.
- **🤖 Virtual Support Agent (`contact.html`)**:
  - Fully interactive virtual chatbot powered by client-side response trees.
  - Quick-answer paths for UPI billing, package benefits, and free/premium catalog limits.
- **⏱️ Local Subscription Expiry Tracker**:
  - Premium tiers (specifically the 1-minute validity for the ₹1 Free Trial) auto-expire on a background check interval to test transition states and prompt user demotion/subscription alerts.
- **❤️ Wishlist & Accounts Management (`profile.html`)**:
  - Real-time cross-tab synchronization of user authentication states and movie wishlists using `localStorage`.
- **🌗 Dark / Light Mode**: Seamless theme switcher that stores preference instantly.

---

## 🛠️ Tech Stack

- **Frontend Core**: Semantic HTML5, CSS3 Custom Properties (Vanilla CSS)
- **Scripting Logic**: Vanilla JavaScript (ES5/ES6 namespace module structures ensuring strict local `file://` protocol compatibility without cross-origin file hosting constraints)
- **Icons**: FontAwesome v6.4.0 (CDN)
- **QR API**: QRserver API Integration

---

## 📂 Project Structure

```text
NETPRIMEORG/
│
├── css/
│   ├── main.css            # Base styles, global typography, layouts, and themes
│   └── components.css      # Reusable UI elements (buttons, modals, cards, toast)
│
├── js/
│   ├── state.js            # Core state manager, movie database, local storage
│   ├── auth.js             # Auth injection, modals listener, signup/login
│   ├── checkout.js         # Payment switcher, card flipping, dynamic QR API
│   ├── player.js           # Custom HTML5 video player overrides
│   └── main.js             # DOM renderers, category sliders, wishlist synchronizer
│
├── assets/                 # Brand logos, posters, thumbnails, and design resources
│
├── index.html              # Main Landing page & movie listings
├── movie.html              # Detailed movie description & trailer page
├── watch.html              # Dedicated cinema mode player layout
├── profile.html            # User account settings & saved watchlist
├── checkout.html           # Plan selector & checkout gateway
├── contact.html            # Help tickets & interactive support bot
├── login.html              # Quick Sign In
├── signup.html             # Quick Sign Up
├── .gitignore              # Pre-configured rules excluding large assets & keys
└── README.md               # Project documentation
```

---

## 🔒 Security & Performance Guidelines

To comply with GitHub best practices:
1. **Credentials Cleansed**: All personal contact details and real-world payment UPI addresses have been sanitized and replaced with mock business details (`+91 800-NET-PRIME` / `netprime@ybl`).
2. **Media Asset Omission**: Large `.mp4` video files (totaling over 500MB) and payment QR graphics are ignored using `.gitignore` to avoid repository bloat and speed up git actions.
