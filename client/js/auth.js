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

  // Redirect-based auth — used by navbar buttons
  window.showAuthModal = async function(view = 'sign-in') {
    const ready = await initClerk();
    if (!ready) return;
    const redirectUrl = window.location.origin + '/index.html';
    if (view === 'sign-up' || view === 'signup') {
      window.Clerk.redirectToSignUp({ redirectUrl });
    } else {
      window.Clerk.redirectToSignIn({ redirectUrl });
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const ready = await initClerk();
    if (ready) {
      window.Clerk.addListener(async ({ session }) => {
        if (session) await finalizeClerkLogin();
      });
      if (window.Clerk.session) {
        window.NetPrimeState.onInitialized(async () => {
          const u = window.NetPrimeState.currentUser;
          if (!u || u.username === 'Guest User') await finalizeClerkLogin();
        });
      }
    }
  });
})();