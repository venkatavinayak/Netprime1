(function() {
  let clerkReady = false;
  window.lastClerkError = null;

  async function initClerk() {
    if (clerkReady) return true;
    try {
      let publishableKey = '';
      try {
        const res = await fetch('/api/config/clerk?_t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          publishableKey = data.publishableKey;
        } else {
          throw new Error(`Server returned status code ${res.status}`);
        }
      } catch (err) {
        console.warn('Failed to fetch Clerk key from backend, using production fallback:', err);
        window.lastClerkError = err;
      }

      if (!publishableKey || publishableKey === 'your_clerk_publishable_key') {
        publishableKey = 'pk_test_dGlkeS1zcGFycm93LTY2LmNsZXJrLmFjY291bnRzLmRldiQ';
      }

      const parts = publishableKey.split('_');
      let frontendApi = '';
      try {
        frontendApi = atob(parts[2]).replace(/\$$/, '');
      } catch (e) {
        frontendApi = 'tidy-sparrow-66.clerk.accounts.dev';
      }

      const scriptUrl = `https://${frontendApi}/npm/@clerk/clerk-js@4/dist/clerk.browser.js`;

      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.setAttribute('data-clerk-publishable-key', publishableKey);
        s.src = scriptUrl;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load Clerk JS SDK script from: ${scriptUrl}`));
        document.head.appendChild(s);
      });

      // Wait for window.Clerk to be defined (as either a function or an object)
      let checks = 0;
      while (!window.Clerk && checks < 150) {
        await new Promise(r => setTimeout(r, 50));
        checks++;
      }

      if (window.Clerk) {
        if (typeof window.Clerk === 'function') {
          // If it is the constructor class, instantiate and load it
          const instance = new window.Clerk(publishableKey);
          await instance.load();
          window.Clerk = instance;
        } else if (typeof window.Clerk === 'object') {
          // If it is already instantiated (Clerk wrapper object), just trigger load
          if (typeof window.Clerk.load === 'function') {
            await window.Clerk.load();
          }
        }
        clerkReady = true;
        return true;
      }
      throw new Error(`Clerk JS SDK script loaded but window.Clerk was undefined (checked for 7.5s). typeof window.Clerk = ${typeof window.Clerk}`);
    } catch (err) {
      console.error('Clerk init failed:', err);
      window.lastClerkError = err;
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

  // Error Banner Renderer with detailed error log
  window.showClerkErrorBanner = function(message, error = null) {
    const container = document.getElementById('clerk-auth-container') || document.querySelector('main') || document.querySelector('.admin-container') || document.body;
    if (container) {
      let details = '';
      if (error) {
        details = `<div style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; font-family: monospace; font-size: 0.8rem; color: #ff5252; text-align: left; word-break: break-all; border: 1px solid rgba(255, 82, 82, 0.2); line-height: 1.4;"><strong>Error details:</strong><br>${error.message || error}</div>`;
      }
      container.innerHTML = `
        <div style="background: rgba(255, 0, 127, 0.1); border: 1px solid var(--accent-magenta); border-radius: 12px; padding: 35px; max-width: 460px; margin: 40px auto; text-align: center; font-family: var(--font-display); box-shadow: 0 10px 30px rgba(255, 0, 127, 0.25);">
          <i class="fa fa-exclamation-triangle fa-3x" style="color: var(--accent-magenta); margin-bottom: 20px;"></i>
          <h2 style="color: #fff; font-size: 1.5rem; font-weight: 800; margin-bottom: 12px;">Authentication Offline</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 15px;">
            ${message}
          </p>
          ${details}
          <button onclick="window.location.reload()" class="btn-premium" style="width: 100%; height: 44px; font-size: 0.95rem; border-radius: 8px; margin-top: 15px;">
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

    if (ready) {
      let initialCheckDone = false;
      
      // Setup dynamic auth listener
      window.Clerk.addListener(async ({ session }) => {
        if (!initialCheckDone) {
          initialCheckDone = true;
          // Unblock StateManager's initial refreshUserState
          if (window.resolveClerkReady) {
            window.resolveClerkReady();
          }
          return;
        }

        // Handle dynamic session changes after initial load
        if (session) {
          const localToken = localStorage.getItem('netprime_token');
          const localUser = window.NetPrimeState?.currentUser;
          if (!localToken || !localUser || localUser.username === 'Guest User') {
            await finalizeClerkLogin();
          } else {
            await window.NetPrimeState.refreshUserState();
          }
        } else {
          if (window.NetPrimeState) {
            await window.NetPrimeState.logout();
          }
        }
      });

      // Handle mounting components on auth pages
      if (!window.Clerk.session) {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || (window.location.origin + '/index.html');

        if (currentPage === 'login.html') {
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
      if (window.NetPrimeState) {
        window.NetPrimeState.authStatus = 'CLERK_ERROR';
      }
      if (window.resolveClerkReady) {
        window.resolveClerkReady();
      }
      
      const protectedPages = ['profile.html', 'account.html', 'dashboard.html', 'premium.html', 'watch.html', 'settings.html', 'admin.html', 'checkout.html'];
      if (protectedPages.includes(currentPage) || currentPage === 'login.html' || currentPage === 'signup.html') {
        window.showClerkErrorBanner('Could not initialize Clerk authentication. Please ensure that you have configured your Clerk API keys in the backend .env configuration.', window.lastClerkError);
      }
    }

    // Set up central redirect listeners on initialization
    if (window.NetPrimeState) {
      window.NetPrimeState.onInitialized(() => {
        window.NetPrimeState.redirectIfUnauthorized();
      });
    }
  });
})();