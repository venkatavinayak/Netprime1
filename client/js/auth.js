/* public/js/auth.js */

(function() {
  let firebaseInitialized = false;

  // Dynamically load Firebase SDK via CDN
  async function loadFirebaseSDK() {
    if (window.firebase) return;
    
    const loadScript = (url) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js');
  }

  // Initialize Firebase client instance dynamically
  async function initFirebase() {
    if (firebaseInitialized) return true;
    try {
      await loadFirebaseSDK();
      const res = await fetch('/api/config/firebase');
      if (!res.ok) throw new Error('Failed to retrieve client credentials');
      
      const config = await res.json();
      if (!config.apiKey || config.apiKey === 'placeholder') {
        throw new Error('Placeholder key detected');
      }

      if (firebase.apps.length === 0) {
        firebase.initializeApp(config);
      }
      firebaseInitialized = true;
      return true;
    } catch (err) {
      console.warn('Firebase auth SDK configuration incomplete. Google Login will run in Developer Mock Mode.', err.message);
      return false;
    }
  }

  // Inject Auth Modals (Login, Signup, Google OAuth) directly into DOM
  function injectAuthModals() {
    if (document.getElementById('netprime-auth-modals-container')) return;

    const container = document.createElement('div');
    container.id = 'netprime-auth-modals-container';
    container.innerHTML = `
      <div id="auth-modal" class="modal-overlay">
        <div class="modal-content glass">
          <button id="auth-close-btn" class="modal-close-btn">✕</button>
          
          <!-- LOGIN VIEW -->
          <div id="login-view">
            <div class="modal-header">
              <h2>Welcome Back</h2>
              <p>Enter your details to access NetPrime</p>
            </div>
            <form id="login-form">
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <div class="form-input-wrapper">
                  <input type="email" id="login-email" class="form-input" placeholder="you@example.com" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <div class="form-input-wrapper">
                  <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                </div>
              </div>
              <div class="form-options">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #ccc; cursor: pointer;">
                  <input type="checkbox" id="login-remember" style="accent-color: var(--accent-magenta);"> Remember Me
                </label>
                <span id="forgot-password-link" style="font-size: 0.85rem; color: var(--accent-magenta); cursor: pointer; hover: underline;">Forgot Password?</span>
              </div>
              <button type="submit" class="btn-form-submit" style="margin-top: 15px;">Sign In</button>
            </form>
            
            <div class="oauth-divider" style="margin: 20px 0; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); line-height: 0.1em;"><span style="background: #111; padding: 0 10px; color: #666; font-size: 0.85rem;">or</span></div>
            <button type="button" id="google-login-btn" class="btn-form-submit" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 10px;">
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.72v2.24h2.9c1.7-1.57 2.7-3.87 2.7-6.59z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.24c-.8.54-1.84.87-3.05.87-2.35 0-4.33-1.59-5.04-3.73H.95v2.3C2.43 15.89 5.5 18 9 18z" fill="#34A853"/><path d="M3.96 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5.01H.95C.35 6.2.01 7.56.01 9s.34 2.8 1.04 3.99l3.01-2.29z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.05C13.46.6 11.43 0 9 0 5.5 0 2.43 2.11.95 5.01l3.01 2.29c.71-2.14 2.69-3.72 5.04-3.72z" fill="#EA4335"/></svg>
              Sign In with Google
            </button>

            <p class="form-toggle-link">New to NetPrime? <span id="switch-to-signup" style="color: var(--accent-magenta); cursor: pointer; font-weight: bold;">Sign up now</span></p>
          </div>
          
          <!-- SIGNUP VIEW -->
          <div id="signup-view" style="display: none;">
            <div class="modal-header">
              <h2>Create Account</h2>
              <p>Join NetPrime and start streaming</p>
            </div>
            <form id="signup-form">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <div class="form-input-wrapper">
                  <input type="text" id="signup-name" class="form-input" placeholder="John Doe" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <div class="form-input-wrapper">
                  <input type="email" id="signup-email" class="form-input" placeholder="you@example.com" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <div class="form-input-wrapper">
                  <input type="password" id="signup-password" class="form-input" placeholder="••••••••" required>
                </div>
              </div>
              <button type="submit" class="btn-form-submit" style="margin-top: 15px;">Create Account</button>
            </form>
            
            <div class="oauth-divider" style="margin: 20px 0; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); line-height: 0.1em;"><span style="background: #111; padding: 0 10px; color: #666; font-size: 0.85rem;">or</span></div>
            <button type="button" id="google-signup-btn" class="btn-form-submit" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 10px;">
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.72v2.24h2.9c1.7-1.57 2.7-3.87 2.7-6.59z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.24c-.8.54-1.84.87-3.05.87-2.35 0-4.33-1.59-5.04-3.73H.95v2.3C2.43 15.89 5.5 18 9 18z" fill="#34A853"/><path d="M3.96 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5.01H.95C.35 6.2.01 7.56.01 9s.34 2.8 1.04 3.99l3.01-2.29z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.05C13.46.6 11.43 0 9 0 5.5 0 2.43 2.11.95 5.01l3.01 2.29c.71-2.14 2.69-3.72 5.04-3.72z" fill="#EA4335"/></svg>
              Sign Up with Google
            </button>

            <p class="form-toggle-link" style="margin-top: 20px;">Already have an account? <span id="switch-to-login" style="color: var(--accent-magenta); cursor: pointer; font-weight: bold;">Sign in</span></p>
          </div>

          <!-- FORGOT PASSWORD VIEW -->
          <div id="forgot-view" style="display: none;">
            <div class="modal-header">
              <h2>Forgot Password</h2>
              <p>Enter email to receive password reset link</p>
            </div>
            <form id="forgot-form">
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <div class="form-input-wrapper">
                  <input type="email" id="forgot-email" class="form-input" placeholder="you@example.com" required>
                </div>
              </div>
              <button type="submit" class="btn-form-submit" style="margin-top: 15px;">Send Reset Link</button>
            </form>
            <p class="form-toggle-link" style="margin-top: 20px;">Back to <span id="forgot-back-to-login" style="color: var(--accent-magenta); cursor: pointer; font-weight: bold;">Sign In</span></p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    setupAuthListeners();
  }

  // Setup click triggers and handlers for the injected modals
  function setupAuthListeners() {
    const authModal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('auth-close-btn');
    
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const forgotView = document.getElementById('forgot-view');
    
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToLogin = document.getElementById('switch-to-login');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotBackToLogin = document.getElementById('forgot-back-to-login');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const forgotForm = document.getElementById('forgot-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const googleSignupBtn = document.getElementById('google-signup-btn');

    closeBtn.addEventListener('click', hideAuthModal);

    switchToSignup.addEventListener('click', () => {
      loginView.style.display = 'none';
      signupView.style.display = 'block';
      forgotView.style.display = 'none';
    });

    switchToLogin.addEventListener('click', () => {
      signupView.style.display = 'none';
      loginView.style.display = 'block';
      forgotView.style.display = 'none';
    });

    forgotPasswordLink.addEventListener('click', () => {
      loginView.style.display = 'none';
      signupView.style.display = 'none';
      forgotView.style.display = 'block';
    });

    forgotBackToLogin.addEventListener('click', () => {
      forgotView.style.display = 'none';
      loginView.style.display = 'block';
      signupView.style.display = 'none';
    });

    // Email/Password Login Submission
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const rememberMe = document.getElementById('login-remember').checked;
      
      const submitBtn = loginForm.querySelector('.btn-form-submit');
      submitBtn.textContent = 'Signing in...';
      submitBtn.disabled = true;

      try {
        await window.NetPrimeState.login(email, password, rememberMe);
        hideAuthModal();
        showToast('Login successful! Welcome back.');
        setTimeout(() => {
          // If admin logs in, redirect to admin console
          if (email === 'admin@netprime.com') {
            window.location.href = './admin.html';
          } else {
            window.location.reload();
          }
        }, 800);
      } catch (err) {
        showToast(err.message);
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled = false;
      }
    });

    // Signup Submission (email verification dispatched)
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      
      const submitBtn = signupForm.querySelector('.btn-form-submit');
      submitBtn.textContent = 'Creating account...';
      submitBtn.disabled = true;

      try {
        await window.NetPrimeState.register(name, email, password);
        hideAuthModal();
        showToast('Success! A verification link has been sent to your email.');
      } catch (err) {
        showToast(err.message);
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
      }
    });

    // Forgot Password Submit
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value;
      
      const submitBtn = forgotForm.querySelector('.btn-form-submit');
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        hideAuthModal();
        showToast(data.message || 'If registered, a reset link was sent.');
      } catch (err) {
        showToast('Reset request failed. Try again.');
        submitBtn.textContent = 'Send Reset Link';
        submitBtn.disabled = false;
      }
    });

    // Google Auth Action helper
    const processGoogleAuth = async (btnElement) => {
      const isFirebaseAvailable = await initFirebase();
      
      if (isFirebaseAvailable) {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          const result = await firebase.auth().signInWithPopup(provider);
          const idToken = await result.user.getIdToken();
          
          btnElement.textContent = 'Verifying account...';
          await window.NetPrimeState.loginWithGoogle(idToken);
          hideAuthModal();
          showToast('Google Sign In successful!');
          const path = window.location.pathname.toLowerCase();
          const isAuthPage = path.includes('login') || path.includes('signup');
          if (isAuthPage) {
            setTimeout(() => window.location.href = './index.html', 800);
          } else {
            setTimeout(() => window.location.reload(), 800);
          }
        } catch (error) {
          console.error('Firebase OAuth error:', error);
          showToast(error.message || 'Google Login failed.');
          btnElement.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.72v2.24h2.9c1.7-1.57 2.7-3.87 2.7-6.59z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.24c-.8.54-1.84.87-3.05.87-2.35 0-4.33-1.59-5.04-3.73H.95v2.3C2.43 15.89 5.5 18 9 18z" fill="#34A853"/><path d="M3.96 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5.01H.95C.35 6.2.01 7.56.01 9s.34 2.8 1.04 3.99l3.01-2.29z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.05C13.46.6 11.43 0 9 0 5.5 0 2.43 2.11.95 5.01l3.01 2.29c.71-2.14 2.69-3.72 5.04-3.72z" fill="#EA4335"/></svg>
            Google Sign In
          `;
        }
      } else {
        const mockEmail = prompt("Developer Mode: Firebase config not found.\nEnter any email to mock verify Google authentication:", "developer@gmail.com");
        if (mockEmail) {
          try {
            btnElement.textContent = 'Verifying mock account...';
            const mockHeader = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
            const mockPayload = btoa(JSON.stringify({ 
              email: mockEmail, 
              name: mockEmail.split('@')[0], 
              picture: 'avatar3.png' 
            }));
            const mockIdToken = `${mockHeader}.${mockPayload}.mocksignature`;

            await window.NetPrimeState.loginWithGoogle(mockIdToken);
            hideAuthModal();
            showToast('Mock Google Login successful!');
            const path = window.location.pathname.toLowerCase();
            const isAuthPage = path.includes('login') || path.includes('signup');
            if (isAuthPage) {
              setTimeout(() => window.location.href = './index.html', 800);
            } else {
              setTimeout(() => window.location.reload(), 800);
            }
          } catch (error) {
            showToast('Mock Google Login failed.');
            btnElement.innerHTML = 'Google Sign In';
          }
        }
      }
    };

    googleLoginBtn.addEventListener('click', () => processGoogleAuth(googleLoginBtn));
    if (googleSignupBtn) {
      googleSignupBtn.addEventListener('click', () => processGoogleAuth(googleSignupBtn));
    }
  }

  // Toast notifications UI utility
  function showToast(message) {
    let toast = document.getElementById('netprime-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'netprime-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, var(--accent-magenta) 0%, #b0005a 100%);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 0.95rem;
        box-shadow: 0 10px 30px rgba(255, 0, 127, 0.4);
        z-index: 9999;
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    
    // Slide In
    setTimeout(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    }, 100);

    // Slide Out
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 4500);
  }

  // Handle password reset token queries from URL if present
  function checkUrlPasswordReset() {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('resetToken');
    if (resetToken) {
      const newPassword = prompt("Enter your new secure password:");
      if (newPassword) {
        fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, password: newPassword })
        })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
          if (status === 200) {
            showToast('Success! Password updated. Log in with your new password.');
            // Clean up address bar
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            showToast(`Reset failed: ${data.error}`);
          }
        })
        .catch(() => showToast('Network connection failed.'));
      }
    }
  }

  // Global methods attached to window
  window.showAuthModal = function(view = 'login') {
    injectAuthModals();
    const modal = document.getElementById('auth-modal');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const forgotView = document.getElementById('forgot-view');

    if (view === 'login') {
      loginView.style.display = 'block';
      signupView.style.display = 'none';
      forgotView.style.display = 'none';
    } else {
      loginView.style.display = 'none';
      signupView.style.display = 'block';
      forgotView.style.display = 'none';
    }

    modal.classList.add('active');
  };

  window.hideAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  };

  window.showToastMessage = function(msg) {
    showToast(msg);
  };

  // Wait for state initialization and automatically inject on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    injectAuthModals();
    checkUrlPasswordReset();
    
    // Auto-open login modal if redirected with showLogin flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showLogin') === 'true') {
      setTimeout(() => {
        window.showAuthModal('login');
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 400);
    }
  });

})();
