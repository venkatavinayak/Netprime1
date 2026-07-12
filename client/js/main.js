/* js/main.js */

document.addEventListener('DOMContentLoaded', () => {
  // Select DOM Elements
  const searchInput = document.getElementById('search-box');
  const searchDropdown = document.getElementById('result-box');
  const profileNavContainer = document.getElementById('profile-nav-container');
  const profileDropdown = document.getElementById('profile-dropdown');
  const navBar = document.querySelector('.navbar');

  // Track scroll position to add/remove scrolled class on Navbar
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navBar.classList.add('scrolled');
    } else {
      navBar.classList.remove('scrolled');
    }
  });

  // Dynamic Mobile Navbar Hamburger Toggle Injection and Events
  if (navBar && !document.querySelector('.navbar-toggle-btn')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'navbar-toggle-btn';
    toggleBtn.setAttribute('title', 'Toggle Navigation Menu');
    toggleBtn.innerHTML = '<i class="fa fa-bars"></i>';

    const navbarActions = navBar.querySelector('.navbar-actions');
    if (navbarActions) {
      navbarActions.appendChild(toggleBtn);
    } else {
      navBar.appendChild(toggleBtn);
    }

    const navbarMenu = navBar.querySelector('.navbar-menu');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = navbarMenu.classList.toggle('active');
      const icon = toggleBtn.querySelector('i');
      
      if (isActive) {
        icon.className = 'fa fa-times';
        document.body.style.overflow = 'hidden'; // Lock body scroll when open
      } else {
        icon.className = 'fa fa-bars';
        document.body.style.overflow = ''; // Unlock body scroll
      }
    });

    // Close menu when selecting a link
    const navLinks = navbarMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navbarMenu.classList.remove('active');
        toggleBtn.querySelector('i').className = 'fa fa-bars';
        document.body.style.overflow = ''; // Unlock body scroll
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navbarMenu.classList.contains('active') && !navbarMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navbarMenu.classList.remove('active');
        toggleBtn.querySelector('i').className = 'fa fa-bars';
        document.body.style.overflow = ''; // Unlock body scroll
      }
    });
  }

  // Initialize Navbar User State
  function renderNavbarUser() {
    const user = window.NetPrimeState.getCurrentUser();
    const actionsContainer = document.getElementById('navbar-actions-dynamic');
    if (!actionsContainer) return;

    if (!user || user.username === 'Guest User') {
      actionsContainer.innerHTML = `
        <button class="btn-outline" onclick="window.showAuthModal('login')">Sign In</button>
        <button class="btn-premium" onclick="window.showAuthModal('signup')">Join Now</button>
      `;
      if (profileNavContainer) profileNavContainer.style.display = 'none';
    } else {
      // User is logged in
      if (profileNavContainer) profileNavContainer.style.display = 'block';
      actionsContainer.innerHTML = ''; // Hide auth buttons

      // Render Dropdown content
      const avatarImg = document.getElementById('nav-avatar-img');
      if (avatarImg) {
        avatarImg.src = getAvatarPath(user.avatar);
      }

      const dropdownUserBlock = document.getElementById('dropdown-user-block');
      if (dropdownUserBlock) {
        const isPrem = window.NetPrimeState.isPremium();
        dropdownUserBlock.innerHTML = `
          <h4>${user.username}</h4>
          <p>${user.email}</p>
          <span class="badge ${isPrem ? 'badge-premium' : 'badge-free'}">
            ${isPrem ? '<i class="fa fa-star"></i> Premium' : 'Free Tier'}
          </span>
        `;
      }
    }
  }

  // Helper to map avatar string to asset files
  window.getAvatarPath = function(avatarName) {
    if (!avatarName) return './assets/prof.png';
    if (avatarName.startsWith('data:image/') || avatarName.startsWith('http://') || avatarName.startsWith('https://')) {
      return avatarName;
    }
    if (avatarName.startsWith('avatar')) {
      // Custom avatars map to prof.png or generic placeholders
      if (avatarName === 'avatar1.png') return './assets/prof.png';
      if (avatarName === 'avatar2.png') return 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80';
      if (avatarName === 'avatar3.png') return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
      if (avatarName === 'avatar4.png') return 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80';
      return 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80';
    }
    return './assets/prof.png';
  };

  // Toggle user profile dropdown
  const avatarBtn = document.getElementById('nav-avatar-btn');
  if (avatarBtn) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('active');
    });
  }

  document.addEventListener('click', () => {
    if (profileDropdown) profileDropdown.classList.remove('active');
    if (searchDropdown) searchDropdown.classList.remove('active');
  });

  // Global Logout Action
  window.handleLogout = function() {
    window.NetPrimeState.logout();
  };

  // Listen to State Change Events
  window.addEventListener('netprime_userChange', renderNavbarUser);
  renderNavbarUser();

  // Search Logic
  if (searchInput && searchDropdown) {
    searchInput.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.classList.add('active');
    });

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      searchDropdown.innerHTML = '';

      if (query.length > 0) {
        searchDropdown.classList.add('active');
        const matches = window.NetPrimeState.movies.filter(movie => 
          movie.title.toLowerCase().includes(query) || 
          movie.language.toLowerCase().includes(query) ||
          movie.cast.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
          matches.forEach(movie => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
              <img class="search-result-img" src="${movie.poster}" onerror="this.src='./assets/prime.png'">
              <div class="search-result-info">
                <h4>${movie.title}</h4>
                <p>${movie.language} • ${movie.year} • ${movie.rating} ⭐</p>
                <span class="badge ${movie.isFree ? 'badge-free' : 'badge-premium'}">${movie.isFree ? 'Free' : 'Premium'}</span>
              </div>
            `;
            div.addEventListener('click', () => {
              window.location.href = `./movie.html?id=${movie.id}`;
            });
            searchDropdown.appendChild(div);
          });
        } else {
          searchDropdown.innerHTML = '<div style="padding:15px; color:var(--text-secondary); text-align:center;">No results found</div>';
        }
      } else {
        searchDropdown.classList.remove('active');
      }
    });
  }

  // Unified Movie Card Click Handler (Free/Premium Gating)
  window.handleMovieClick = function(movieId) {
    const movie = window.NetPrimeState.getMovieById(movieId);
    if (!movie) return;

    const isPrem = window.NetPrimeState.isPremium();
    if (movie.isFree || isPrem) {
      // Allow watching
      window.location.href = `./watch.html?id=${movie.id}`;
    } else {
      // Gate premium content - show upgrade alert modal!
      showUpgradeModal(movie);
    }
  };

  // Dynamic Upgrade Modal creation and injection
  function showUpgradeModal(movie) {
    let overlay = document.getElementById('upgrade-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'upgrade-modal';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-content glass" style="max-width: 440px; text-align: center;">
        <button onclick="document.getElementById('upgrade-modal').classList.remove('active')" class="modal-close-btn">✕</button>
        <i class="fa fa-lock" style="font-size: 3.5rem; color: var(--accent-gold); text-shadow: var(--accent-gold-glow); margin-bottom: 20px;"></i>
        <h2 style="font-family: var(--font-display); font-size: 1.7rem; font-weight: 800; color: #fff; margin-bottom: 10px;">Premium Content</h2>
        <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">
          <strong>"${movie.title}"</strong> is a Premium title. Free accounts can access up to 7 FREE movies. Upgrade to our Premium Plan to unlock the entire catalog!
        </p>
        
        <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 15px; margin-bottom: 25px; border: 1px solid rgba(255,0,127,0.1); text-align: left;">
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; font-size: 0.9rem;">
            <span style="color: var(--accent-magenta);">✔</span> Access 30+ Blockbusters (Tamil, Telugu, Malayalam, Kannada)
          </div>
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; font-size: 0.9rem;">
            <span style="color: var(--accent-magenta);">✔</span> Full Ultra HD 4K Quality streaming
          </div>
          <div style="display: flex; gap: 10px; align-items: center; font-size: 0.9rem;">
            <span style="color: var(--accent-magenta);">✔</span> Dynamic 3D Immersive Sound and Offline Downloads
          </div>
        </div>

        <button onclick="window.location.href='./checkout.html'" class="btn-premium" style="width: 100%; height: 50px; font-size: 1.05rem;">
          Get Premium - ₹1 Trial / ₹199 Month
        </button>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">Cancel anytime. Secure checkout powered by UPI & Card gateway.</p>
      </div>
    `;

    setTimeout(() => {
      overlay.classList.add('active');
    }, 50);
  }

  // Dynamic Movie Card Builder with 3D Tilt Integration
  window.renderMovieGrid = function(trackElementId, categoryName) {
    const track = document.getElementById(trackElementId);
    if (!track) return;

    const movies = window.NetPrimeState.getMoviesByCategory(categoryName);
    track.innerHTML = '';

    movies.forEach(movie => {
      const cardWrapper = document.createElement('div');
      cardWrapper.className = 'movie-card-wrapper';
      
      const isWishlisted = window.NetPrimeState.isInWishlist(movie.id);

      cardWrapper.innerHTML = `
        <div class="movie-card ${!movie.isFree && !window.NetPrimeState.isPremium() ? 'locked-badge' : ''}" data-id="${movie.id}">
          <img class="movie-card-poster" src="${movie.poster}" alt="${movie.title}" onerror="this.src='./assets/prime.png'">
          
          <div class="movie-card-badge">
            <span class="badge ${movie.isFree ? 'badge-free' : 'badge-premium'}">
              ${movie.isFree ? 'Free' : '<i class="fa fa-lock"></i> Premium'}
            </span>
          </div>

          <!-- Free Gated lock screen overlay -->
          ${!movie.isFree ? `
            <div class="movie-card-locked-screen">
              <i class="fa fa-lock"></i>
              <span>Premium</span>
            </div>
          ` : ''}

          <div class="movie-card-overlay">
            <div class="movie-card-details">
              <h4 class="movie-card-title">${movie.title}</h4>
              <div class="movie-card-meta">
                <span class="rating">★ ${movie.rating}</span>
                <span>${movie.year}</span>
                <span>${movie.duration}</span>
              </div>
              <p style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4; margin-top: 2px;">
                ${movie.desc.substring(0, 50)}...
              </p>
              <div class="movie-card-actions">
                <button class="movie-card-play-btn" onclick="event.stopPropagation(); window.location.href='./movie.html?id=${movie.id}'">▶</button>
                <button class="movie-card-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlistClick('${movie.id}', this)">
                  ${isWishlisted ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Attach Card mouse events
      const cardInner = cardWrapper.querySelector('.movie-card');
      cardInner.addEventListener('click', () => {
        window.location.href = `./movie.html?id=${movie.id}`;
      });

      // High-performance dynamic 3D Card Hover Tilts (binds mousemove only when hovered, preventing scroll lag)
      let handleTilt = null;
      cardInner.addEventListener('mouseenter', () => {
        handleTilt = (e) => {
          const rect = cardInner.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const width = rect.width;
          const height = rect.height;
          
          const rotateY = ((x / width) - 0.5) * 20; // -10deg to 10deg
          const rotateX = ((y / height) - 0.5) * -20; // -10deg to 10deg
          
          cardInner.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        };
        cardInner.addEventListener('mousemove', handleTilt);
      });

      cardInner.addEventListener('mouseleave', () => {
        if (handleTilt) {
          cardInner.removeEventListener('mousemove', handleTilt);
          handleTilt = null;
        }
        cardInner.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
      });

      track.appendChild(cardWrapper);
    });
  };

  // Toggle wishlist state from cards
  window.toggleWishlistClick = function(movieId, btnElement) {
    if (window.NetPrimeState.isInWishlist(movieId)) {
      window.NetPrimeState.removeFromWishlist(movieId);
      btnElement.classList.remove('active');
      btnElement.textContent = '🤍';
      window.showToastMessage('Removed from wishlist');
    } else {
      window.NetPrimeState.addToWishlist(movieId);
      btnElement.classList.add('active');
      btnElement.textContent = '❤️';
      window.showToastMessage('Added to wishlist');
    }
  };

  // Initialize carousels scroll arrows
  window.initCarouselsArrows = function() {
    const carousels = document.querySelectorAll('.carousel-container');
    carousels.forEach(container => {
      const track = container.querySelector('.carousel-track');
      const arrowLeft = container.parentElement.querySelector('.carousel-arrow.left');
      const arrowRight = container.parentElement.querySelector('.carousel-arrow.right');

      if (track && arrowLeft && arrowRight) {
        arrowLeft.addEventListener('click', () => {
          track.scrollBy({ left: -600, behavior: 'smooth' });
        });
        arrowRight.addEventListener('click', () => {
          track.scrollBy({ left: 600, behavior: 'smooth' });
        });
      }
    });
  };

});
