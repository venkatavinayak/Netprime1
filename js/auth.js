/* js/auth.js */

(function() {
  
  // Inject Auth Modals (Login, Signup, Google OAuth) directly into DOM
  function injectAuthModals() {
    // Check if modals are already in the DOM
    if (document.getElementById('netprime-auth-modals-container')) return;

    const container = document.createElement('div');
    container.id = 'netprime-auth-modals-container';
    container.innerHTML = `
      <!-- Standard Login/Signup Modal Overlay -->
      <div id="auth-modal" class="modal-overlay">
        <div class="modal-content glass">
          <button id="auth-close-btn" class="modal-close-btn"><i class="fa fa-times"></i>✕</button>
          
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
                  <i class="fa fa-envelope"></i>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <div class="form-input-wrapper">
                  <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                  <i class="fa fa-lock"></i>
                </div>
              </div>
              <button type="submit" class="btn-form-submit">Sign In</button>
            </form>
            

            
            <p class="form-toggle-link">New to NetPrime? <span id="switch-to-signup">Sign up now</span></p>
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
                  <i class="fa fa-user"></i>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <div class="form-input-wrapper">
                  <input type="email" id="signup-email" class="form-input" placeholder="you@example.com" required>
                  <i class="fa fa-envelope"></i>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <div class="form-input-wrapper">
                  <input type="password" id="signup-password" class="form-input" placeholder="••••••••" required>
                  <i class="fa fa-lock"></i>
                </div>
              </div>
              <button type="submit" class="btn-form-submit">Create Account</button>
            </form>
            

            
            <p class="form-toggle-link">Already have an account? <span id="switch-to-login">Sign in</span></p>
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
    
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToLogin = document.getElementById('switch-to-login');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Toggle Close
    closeBtn.addEventListener('click', hideAuthModal);

    // Toggle Login <-> Signup
    switchToSignup.addEventListener('click', () => {
      loginView.style.display = 'none';
      signupView.style.display = 'block';
    });

    switchToLogin.addEventListener('click', () => {
      signupView.style.display = 'none';
      loginView.style.display = 'block';
    });

    // Form Submissions
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const name = email.split('@')[0];
      // Generate a nice random avatar prefix
      const randomAvatar = `avatar${Math.floor(Math.random() * 5) + 1}.png`;
      window.NetPrimeState.login(name, email, randomAvatar);
      hideAuthModal();
      showToast(`Welcome back, ${name}!`);
    });

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const randomAvatar = `avatar${Math.floor(Math.random() * 5) + 1}.png`;
      window.NetPrimeState.login(name, email, randomAvatar);
      hideAuthModal();
      showToast(`Account successfully created! Welcome ${name}.`);
    });
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
    }, 4000);
  }

  // Global methods attached to window
  window.showAuthModal = function(view = 'login') {
    injectAuthModals();
    const modal = document.getElementById('auth-modal');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');

    if (view === 'login') {
      loginView.style.display = 'block';
      signupView.style.display = 'none';
    } else {
      loginView.style.display = 'none';
      signupView.style.display = 'block';
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
  });

})();
