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

  // Show a full screen loader overlay immediately on any button/action click to provide visual feedback
  window.showPageActionLoader = function(message = 'Securing Connection...') {
    let overlay = document.getElementById('netprime-action-loader-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'netprime-action-loader-overlay';
      overlay.className = 'page-loader-overlay';
      overlay.innerHTML = `
        <div class="loader-spinner"></div>
        <p>${message}</p>
      `;
      document.body.appendChild(overlay);
    } else {
      const p = overlay.querySelector('p');
      if (p) p.textContent = message;
      overlay.classList.remove('fade-out');
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
    }
  };

  // Open Clerk inside a responsive modal on the current page to avoid navigation lag
  window.showAuthModal = async function(view = 'sign-in', customRedirectUrl = null) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // If we are already on login or signup pages, we don't open modals
    if (currentPage === 'login.html' || currentPage === 'signup.html') {
      return;
    }

    let overlay = document.getElementById('clerk-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'clerk-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-content glass" style="max-width: 480px; padding: 0; background: transparent; border: none; box-shadow: none; display: flex; justify-content: center; align-items: center; position: relative;">
          <button id="clerk-modal-close-btn" class="modal-close-btn" style="position: absolute; top: -35px; right: 10px; z-index: 10001; color: #fff; font-size: 1.5rem; background: none; border: none; cursor: pointer; transition: transform 0.2s ease;">✕</button>
          <div id="clerk-modal-mount-container" style="width: 100%; min-height: 450px; display: flex; align-items: center; justify-content: center;"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      const closeBtn = overlay.querySelector('#clerk-modal-close-btn');
      closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        const mountContainer = overlay.querySelector('#clerk-modal-mount-container');
        if (mountContainer) mountContainer.innerHTML = '';
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          const mountContainer = overlay.querySelector('#clerk-modal-mount-container');
          if (mountContainer) mountContainer.innerHTML = '';
        }
      });
    }

    const mountContainer = overlay.querySelector('#clerk-modal-mount-container');
    mountContainer.innerHTML = '<div class="loader-spinner"></div>';
    overlay.classList.add('active');

    // Wait until Clerk is ready
    if (window.clerkReadyPromise) {
      await window.clerkReadyPromise;
    }

    if (!window.Clerk) {
      mountContainer.innerHTML = '<p style="color: #ff5252; text-align: center; padding: 20px; font-family: sans-serif;">Clerk authentication is currently offline. Please try again later.</p>';
      return;
    }

    mountContainer.innerHTML = ''; // Clear loader
    const redirectUrl = customRedirectUrl || window.location.href;

    if (view === 'sign-up' || view === 'signup') {
      window.Clerk.mountSignUp(mountContainer, {
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
    } else {
      window.Clerk.mountSignIn(mountContainer, {
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
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const ready = await initClerk();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const protectedPages = ['profile.html', 'account.html', 'dashboard.html', 'premium.html', 'watch.html', 'settings.html', 'admin.html', 'checkout.html'];

    if (ready) {
      // Setup dynamic auth listener
      window.Clerk.addListener(async ({ session }) => {
        if (session) {
          const localToken = localStorage.getItem('netprime_token');
          const localUser = window.NetPrimeState?.currentUser;
          if (!localToken || !localUser || localUser.username === 'Guest User') {
            await finalizeClerkLogin();
          } else {
            await window.NetPrimeState.refreshUserState();
          }

          // Close modal overlay on successful login
          const overlay = document.getElementById('clerk-modal-overlay');
          if (overlay) {
            overlay.classList.remove('active');
            const mountContainer = overlay.querySelector('#clerk-modal-mount-container');
            if (mountContainer) mountContainer.innerHTML = '';
          }
        } else {
          const localToken = localStorage.getItem('netprime_token');
          const localUser = window.NetPrimeState?.currentUser;
          if (localToken || (localUser && localUser.username !== 'Guest User')) {
            await window.NetPrimeState.logout();
          } else {
            await window.NetPrimeState.refreshUserState();
          }
        }

        // Resolve clerkReadyPromise so state.js state manager is unblocked
        if (window.resolveClerkReady) {
          window.resolveClerkReady();
        }
      });

      if (!window.Clerk.session) {
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
      if (window.NetPrimeState) {
        window.NetPrimeState.authStatus = 'CLERK_ERROR';
      }
      if (window.resolveClerkReady) {
        window.resolveClerkReady();
      }
      if (protectedPages.includes(currentPage) || currentPage === 'login.html' || currentPage === 'signup.html') {
        window.showClerkErrorBanner('Could not initialize Clerk authentication. Please ensure that you have configured your Clerk API keys in the backend .env configuration.', window.lastClerkError);
      }
    }
  });
})();