/* public/js/auth.js */

(function() {
  let clerkInitialized = false;

  // Dynamically load ClerkJS via CDN
  async function loadClerkSDK(publishableKey) {
    if (window.Clerk) return;
    
    // Extract frontend API domain from publishable key
    let frontendApi = '';
    try {
      const parts = publishableKey.split('_');
      // A publishable key splits into ['pk', 'test'/'live', 'base64EncodedDomain']
      const encodedDomain = parts[2];
      // Decode base64 and remove the trailing '$' sign
      frontendApi = atob(encodedDomain).replace(/\$$/, '');
      console.log('Parsed Clerk Frontend API domain:', frontendApi);
    } catch (e) {
      console.error('Failed to parse Clerk Frontend API domain:', e);
      // Fallback to jsdelivr CDN if parsing fails
      frontendApi = 'cdn.jsdelivr.net';
    }

    const loadScript = (url) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-clerk-publishable-key', publishableKey);
      s.onload = () => {
        console.log('Clerk SDK script tag loaded successfully.');
        resolve();
      };
      s.onerror = (e) => {
        console.error('Clerk SDK script tag failed to load:', e);
        reject(new Error('Clerk SDK script load error'));
      };
      document.head.appendChild(s);
    });

    const cdnUrl = frontendApi === 'cdn.jsdelivr.net'
      ? 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js'
      : `https://${frontendApi}/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;

    console.log('Loading Clerk SDK from URL:', cdnUrl);
    await loadScript(cdnUrl);
  }

  // Initialize Clerk client instance dynamically
  async function initClerk() {
    if (clerkInitialized && window.Clerk && typeof window.Clerk.mountSignIn === 'function') return true;
    try {
      const res = await fetch('/api/config/clerk?_t=' + Date.now());
      if (!res.ok) throw new Error('Failed to retrieve Clerk credentials');
      
      const { publishableKey } = await res.json();
      console.log('initClerk retrieved publishableKey:', publishableKey);
      
      if (!publishableKey || publishableKey === 'your_clerk_publishable_key') {
        throw new Error('CLERK_PUBLISHABLE_KEY is not configured');
      }

      await loadClerkSDK(publishableKey);

      // Wait up to 3 seconds for window.Clerk to be populated on the window object
      let checks = 0;
      while (!window.Clerk && checks < 60) {
        await new Promise(r => setTimeout(r, 50));
        checks++;
      }

      console.log('After script load, typeof window.Clerk:', typeof window.Clerk);

      // If window.Clerk is the constructor (class), instantiate it
      if (typeof window.Clerk === 'function') {
        const clerkInstance = new window.Clerk(publishableKey);
        await clerkInstance.load();
        window.Clerk = clerkInstance; // Bind instance to window.Clerk
        console.log('Clerk instance instantiated and loaded successfully.');
      } else if (window.Clerk && typeof window.Clerk.load === 'function') {
        await window.Clerk.load();
        console.log('Clerk instance loaded successfully.');
      } else {
        throw new Error('Clerk JS SDK failed to load correctly or timed out.');
      }

      clerkInitialized = true;
      return true;
    } catch (err) {
      console.error('Clerk initialization failed with error:', err);
      return false;
    }
  }

  const finalizeClerkLogin = async () => {
    if (!window.Clerk?.session) return;

    const sessionToken = await window.Clerk.session.getToken();
    if (!sessionToken) return;

    try {
      await window.NetPrimeState.loginWithClerk(sessionToken);
    } catch (err) {
      console.error('Failed to sync session with NetPrime backend:', err);
    }
  };

  // Inject Auth Modals (Clerk Auth Overlay Modal) directly into DOM
  function injectAuthModals() {
    if (document.getElementById('netprime-auth-modals-container')) return;

    const container = document.createElement('div');
    container.id = 'netprime-auth-modals-container';
    container.innerHTML = `
      <div id="auth-modal" class="modal-overlay">
        <div class="modal-content glass" style="max-width: 480px; padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <button id="auth-close-btn" class="modal-close-btn" style="z-index: 9999;">✕</button>
          <div id="clerk-modal-container" style="min-height: 400px; display: flex; align-items: center; justify-content: center; width: 100%;">
            <div class="loading-spinner-wrapper" style="text-align: center; color: #fff;">
              <i class="fa fa-spinner fa-spin fa-2x" style="color: var(--accent-magenta);"></i>
              <p style="margin-top: 15px; font-family: var(--font-display); font-size: 0.9rem;">Loading Clerk...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    
    const closeBtn = document.getElementById('auth-close-btn');
    closeBtn.addEventListener('click', window.hideAuthModal);
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

  // Global methods attached to window
  window.showAuthModal = async function(view = 'login') {
    const isClerkAvailable = await initClerk();
    if (!isClerkAvailable) return;

    const redirectUrl = window.location.origin + '/index.html';
    if (view === 'signup') {
      window.Clerk.redirectToSignUp({ redirectUrl });
    } else {
      window.Clerk.redirectToSignIn({ redirectUrl });
    }
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

  async function mountClerkInPage() {
    const container = document.getElementById('clerk-auth-container');

    const isClerkAvailable = await initClerk();
    if (!isClerkAvailable) {
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; color: #fff; padding: 30px;">
            <i class="fa fa-exclamation-triangle fa-3x" style="color: #ffcc00; margin-bottom: 20px;"></i>
            <h3 style="font-family: var(--font-display); margin-bottom: 12px; font-size: 1.4rem;">Authentication Unconfigured</h3>
            <p style="font-size: 0.9rem; color: #ccc; line-height: 1.6; max-width: 320px; margin: 0 auto 20px;">
              Please configure your <code>CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code> in the <code>server/.env</code> file to enable sign-in and sign-up.
            </p>
          </div>
        `;
      }
      return;
    }

    const redirectUrl = window.location.origin + '/index.html';
    const isSignUp = window.location.pathname.toLowerCase().includes('signup');

    if (isSignUp) {
      window.Clerk.redirectToSignUp({ redirectUrl });
    } else {
      window.Clerk.redirectToSignIn({ redirectUrl });
    }
  }

  // Automatically setup listeners on page load
  document.addEventListener('DOMContentLoaded', async () => {
    injectAuthModals();
    await mountClerkInPage();

    const isClerkAvailable = await initClerk();
    if (isClerkAvailable) {
      window.Clerk.addListener(async ({ session }) => {
        if (session) {
          await finalizeClerkLogin();
        }
      });
      
      if (window.Clerk.session) {
        window.NetPrimeState.onInitialized(async () => {
          const currentUser = window.NetPrimeState.getCurrentUser();
          const isGuest = !currentUser || currentUser.username === 'Guest User';
          if (isGuest) {
            await finalizeClerkLogin();
          }
        });
      }
    }
  });

})();
