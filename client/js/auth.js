(function() {
  let clerkReady = false;

  async function initClerk() {
    if (clerkReady) return true;
    try {
      const res = await fetch('/api/config/clerk?_t=' + Date.now());
      if (!res.ok) throw new Error('Failed to get Clerk key');
      const { publishableKey } = await res.json();
      if (!publishableKey || publishableKey === 'your_clerk_publishable_key') return false;

      const parts = publishableKey.split('_');
      let frontendApi = '';
      try {
        frontendApi = atob(parts[2]).replace(/\$$/, '');
      } catch (e) {
        frontendApi = 'cdn.jsdelivr.net';
      }

      const scriptUrl = frontendApi === 'cdn.jsdelivr.net'
        ? 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js'
        : `https://${frontendApi}/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;

      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = scriptUrl;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

      let checks = 0;
      while (typeof window.Clerk !== 'function' && checks < 60) {
        await new Promise(r => setTimeout(r, 50));
        checks++;
      }

      if (typeof window.Clerk === 'function') {
        const instance = new window.Clerk(publishableKey);
        await instance.load();
        window.Clerk = instance;
        clerkReady = true;
        return true;
      }
      console.warn('Clerk SDK did not become available');
      return false;
    } catch (err) {
      console.error('Clerk init failed:', err);
      return false;
    }
  }

  async function finalizeClerkLogin() {
    if (!window.Clerk?.session) return;
    const token = await window.Clerk.session.getToken();
    if (!token) return;
    try {
      await window.NetPrimeState.loginWithClerk(token);
    } catch (err) {
      console.error('Backend Clerk sync failed:', err);
    }
  }

  // Error Banner Renderer
  window.showClerkErrorBanner = function(message) {
    const container = document.getElementById('clerk-auth-container');
    if (container) {
      container.innerHTML = `
        <div style="background: rgba(255, 0, 127, 0.1); border: 1px solid var(--accent-magenta); border-radius: 12px; padding: 35px; max-width: 460px; margin: 40px auto; text-align: center; font-family: var(--font-display); box-shadow: 0 10px 30px rgba(255, 0, 127, 0.25);">
          <i class="fa fa-exclamation-triangle fa-3x" style="color: var(--accent-magenta); margin-bottom: 20px;"></i>
          <h2 style="color: #fff; font-size: 1.5rem; font-weight: 800; margin-bottom: 12px;">Authentication Offline</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px;">
            ${message}
          </p>
          <button onclick="window.location.reload()" class="btn-premium" style="width: 100%; height: 44px; font-size: 0.95rem; border-radius: 8px;">
            <i class="fa fa-sync"></i> Retry Connection
          </button>
        </div>
      `;
    }
  };

  // Toast notification utility
  window.showToastMessage = function(message) {
    let toast = document.getElementById('netprime-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'netprime-toast';
      toast.style.cssText = 'position:fixed;bottom:30px;right:30px;background:linear-gradient(135deg,var(--accent-magenta) 0%,#b0005a 100%);color:#fff;padding:12px 24px;border-radius:8px;font-family:var(--font-display);font-weight:600;font-size:0.95rem;box-shadow:0 10px 30px rgba(255,0,127,0.4);z-index:9999;transform:translateY(100px);opacity:0;transition:transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275),opacity 0.4s ease;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 100);
    setTimeout(() => { toast.style.transform = 'translateY(100px)'; toast.style.opacity = '0'; }, 4500);
  };

  // Redirect to custom local embedded Sign-In / Sign-Up pages
  window.showAuthModal = async function(view = 'sign-in', customRedirectUrl = null) {
    let redirectUrl = customRedirectUrl;
    if (!redirectUrl) {
      const params = new URLSearchParams(window.location.search);
      redirectUrl = params.get('redirect') || (window.location.origin + '/index.html');
    }
    
    const url = (view === 'sign-up' || view === 'signup') 
      ? `./signup.html?redirect=${encodeURIComponent(redirectUrl)}`
      : `./login.html?redirect=${encodeURIComponent(redirectUrl)}`;
    
    window.location.href = url;
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const ready = await initClerk();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const protectedPages = ['profile.html', 'account.html', 'dashboard.html', 'premium.html', 'watch.html', 'settings.html', 'admin.html', 'checkout.html'];

    if (ready) {
      // Setup dynamic auth listener
      window.Clerk.addListener(async ({ session }) => {
        if (session) {
          await finalizeClerkLogin();
        } else {
          // Sync sign-out to local and backend state
          const u = window.NetPrimeState?.currentUser;
          if (u && u.username !== 'Guest User') {
            await window.NetPrimeState.logout();
          }
        }
      });

      if (window.Clerk.session) {
        // Logged in with Clerk - finalize local sync
        window.NetPrimeState.onInitialized(async () => {
          const u = window.NetPrimeState.currentUser;
          if (!u || u.username === 'Guest User') {
            await finalizeClerkLogin();
          }
        });
      } else {
        // Logged out / guest user
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || (window.location.origin + '/index.html');

        if (protectedPages.includes(currentPage)) {
          window.showAuthModal('login', window.location.href);
        } else if (currentPage === 'login.html') {
          // Mount Clerk Sign-In component directly on the page
          const container = document.getElementById('clerk-auth-container');
          if (container) {
            container.innerHTML = ''; // clear loading spinner
            window.Clerk.mountSignIn(container, {
              signUpUrl: './signup.html',
              afterSignInUrl: redirectUrl,
              appearance: {
                variables: {
                  colorPrimary: '#ff007f',
                  colorBackground: '#121212',
                  colorText: '#ffffff',
                  colorTextSecondary: '#a0a0a0',
                  colorInputBackground: '#1d1d1d',
                  colorInputText: '#ffffff',
                  colorButtonText: '#ffffff'
                },
                elements: {
                  card: {
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                    background: 'rgba(18, 18, 18, 0.95)'
                  }
                }
              }
            });
          }
        } else if (currentPage === 'signup.html') {
          // Mount Clerk Sign-Up component directly on the page
          const container = document.getElementById('clerk-auth-container');
          if (container) {
            container.innerHTML = ''; // clear loading spinner
            window.Clerk.mountSignUp(container, {
              signInUrl: './login.html',
              afterSignUpUrl: redirectUrl,
              appearance: {
                variables: {
                  colorPrimary: '#ff007f',
                  colorBackground: '#121212',
                  colorText: '#ffffff',
                  colorTextSecondary: '#a0a0a0',
                  colorInputBackground: '#1d1d1d',
                  colorInputText: '#ffffff',
                  colorButtonText: '#ffffff'
                },
                elements: {
                  card: {
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                    background: 'rgba(18, 18, 18, 0.95)'
                  }
                }
              }
            });
          }
        }
      }
    } else {
      // Clerk failed to load (e.g. missing keys)
      if (protectedPages.includes(currentPage) || currentPage === 'login.html' || currentPage === 'signup.html') {
        window.showClerkErrorBanner('Could not initialize Clerk authentication. Please ensure that you have configured your Clerk API keys in the backend .env configuration.');
      }
    }
  });
})();