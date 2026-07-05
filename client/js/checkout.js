/* public/js/checkout.js */

document.addEventListener('DOMContentLoaded', () => {
  // Plan Selection States
  let selectedPlan = 'TRIAL';
  let selectedPrice = 1;
  let selectedGateway = 'Razorpay Gateway';

  // Pricing elements
  const pricingCards = document.querySelectorAll('.pricing-card');
  const summaryTotalPrice = document.getElementById('summary-total-price');

  // Payment Tabs Switcher
  const tabCardBtn = document.getElementById('tab-card-btn');
  const tabUpiBtn = document.getElementById('tab-upi-btn');
  const paymentCardPanel = document.getElementById('payment-card-panel');
  const paymentUpiPanel = document.getElementById('payment-upi-panel');

  // Forms
  const creditCardForm = document.getElementById('checkout-form');
  const upiPaymentForm = document.getElementById('upi-payment-form');

  // Billing Views
  const billingSection = document.getElementById('billing-section');
  const successSection = document.getElementById('success-section');

  // Dynamically load Razorpay SDK
  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Ensure user is logged in & email is verified
  function verifyUserLogin() {
    const user = window.NetPrimeState.getCurrentUser();
    
    if (!user || user.username === 'Guest User') {
      billingSection.innerHTML = `
        <div class="glass" style="padding: 40px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,0,127,0.15); max-width: 600px; margin: 0 auto;">
          <i class="fa fa-lock" style="font-size: 3.5rem; color: var(--accent-magenta); text-shadow: var(--shadow-magenta); margin-bottom: 20px;"></i>
          <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 12px;">Sign In Required</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;">
            Please log in or register a NetPrime account before subscribing to our Premium packages.
          </p>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button class="btn-outline" onclick="window.showAuthModal('login')">Sign In</button>
            <button class="btn-premium" onclick="window.showAuthModal('signup')">Register Account</button>
          </div>
        </div>
      `;
      return false;
    }

    if (!user.isEmailVerified) {
      billingSection.innerHTML = `
        <div class="glass" style="padding: 40px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,0,127,0.15); max-width: 600px; margin: 0 auto;">
          <i class="fa fa-envelope" style="font-size: 3.5rem; color: var(--accent-magenta); text-shadow: var(--shadow-magenta); margin-bottom: 20px;"></i>
          <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 12px;">Email Verification Required</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;">
            Your account email <strong>${user.email}</strong> is not verified yet. Please verify your email using the link sent during registration before subscribing.
          </p>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button class="btn-premium" onclick="window.location.reload()">I have verified, Refresh Page</button>
          </div>
        </div>
      `;
      return false;
    }

    return true;
  }

  // Bind listeners only after NetPrimeState is fully resolved
  window.NetPrimeState.onInitialized(() => {
    const loggedIn = verifyUserLogin();
    if (!loggedIn) return;

    // Load initial QR code
    updateDynamicQrCode();
  });

  // 1. Plan Selector Event Handlers
  pricingCards.forEach(card => {
    card.addEventListener('click', () => {
      pricingCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      selectedPlan = card.getAttribute('data-plan');
      selectedPrice = parseInt(card.getAttribute('data-price'));
      
      if (summaryTotalPrice) {
        summaryTotalPrice.textContent = `₹${selectedPrice}`;
      }

      updateDynamicQrCode();
    });
  });

  // Dynamic QR code generator based on price and payee VPA (Peer-to-Peer display)
  function updateDynamicQrCode() {
    const qrImg = document.getElementById('upi-qr-image');
    if (!qrImg) return;

    const payeeVpa = '8374971945@ibl';
    const payeeName = 'NetPrime';
    const upiUri = `upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${selectedPrice}&cu=INR&tn=NetPrime%20Premium%20Subscription`;

    // Fetch and render the QR code dynamically
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUri)}`;
    qrImg.src = qrApiUrl;
  }

  // 2. Tab Switcher Event Handlers
  if (tabCardBtn && tabUpiBtn) {
    tabCardBtn.addEventListener('click', () => {
      tabCardBtn.classList.add('active');
      tabUpiBtn.classList.remove('active');
      paymentCardPanel.style.display = 'flex';
      paymentUpiPanel.style.display = 'none';
    });

    tabUpiBtn.addEventListener('click', () => {
      tabUpiBtn.classList.add('active');
      tabCardBtn.classList.remove('active');
      paymentUpiPanel.style.display = 'block';
      paymentCardPanel.style.display = 'none';
    });
  }

  // 3. Initiate Checkout via Razorpay
  const handleRazorpayPayment = async (submitBtn, methodType) => {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Contacting payment gateway...';

    try {
      const user = window.NetPrimeState.getCurrentUser();
      
      // Step A: Load SDK
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        throw new Error('Failed to load payment gateway SDK.');
      }

      // Step B: Create order on backend (Price locked strictly on backend)
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create transaction order.');

      // Check if backend returned mock orders (Developer mode fallback)
      if (orderData.orderId.startsWith('order_mock_')) {
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Activating trial subscription (mock gateway)...';
        
        // Directly hit mock verification
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: 'mock_pay_id',
            razorpaySignature: 'mock_signature'
          })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Mock verification failed.');

        showSuccessScreen('Mock Payment Gateway', orderData.orderId, selectedPrice);
        return;
      }

      // Step C: Trigger Razorpay Overlay
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'NetPrime',
        description: `Premium Subscription (${selectedPlan})`,
        order_id: orderData.orderId,
        prefill: {
          name: user.username,
          email: user.email
        },
        theme: {
          color: '#ff007f'
        },
        handler: async function (response) {
          submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifying transaction signature...';
          
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification signature mismatch.');

            showSuccessScreen(methodType, response.razorpay_payment_id, selectedPrice);
          } catch (err) {
            window.showToastMessage(`Verification failed: ${err.message}`);
            resetButtonState();
          }
        },
        modal: {
          ondismiss: function () {
            window.showToastMessage('Payment transaction was cancelled by user.');
            resetButtonState();
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

    } catch (err) {
      window.showToastMessage(err.message);
      resetButtonState();
    }

    function resetButtonState() {
      isSubmitting = false;
      submitBtn.disabled = false;
      if (methodType === 'Credit Card') {
        submitBtn.textContent = 'Pay Now';
      } else {
        submitBtn.textContent = 'Verify Payment & Activate';
      }
    }
  };

  // Initiate Checkout via Stripe
  const handleStripePayment = async (submitBtn) => {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Contacting payment gateway...';

    try {
      const res = await fetch('/api/payments/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment session.');

      // Redirect to Stripe's secure hosted page
      window.location.href = data.url;
    } catch (err) {
      window.showToastMessage(err.message);
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Authorize Secure Payment';
    }
  };

  // Render Success Receipt view
  function showSuccessScreen(gateway, paymentId, price) {
    isSubmitting = false;
    // Refresh user state in state manager
    window.NetPrimeState.refreshUserState();

    const user = window.NetPrimeState.getCurrentUser();
    document.getElementById('invoice-user').textContent = user.username || user.email.split('@')[0];
    
    const today = new Date();
    document.getElementById('invoice-date').textContent = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('invoice-id').textContent = paymentId.substring(0, 12).toUpperCase();

    const invoiceTier = document.getElementById('invoice-tier');
    if (selectedPlan === 'TRIAL') invoiceTier.textContent = '₹1 FREE TRIAL ACTIVATED';
    if (selectedPlan === 'MONTHLY') invoiceTier.textContent = '₹199 MONTHLY PREMIUM';
    if (selectedPlan === 'YEARLY') invoiceTier.textContent = '₹1499 ANNUAL SAVER';

    document.getElementById('invoice-gateway').textContent = gateway;
    document.getElementById('invoice-amount').textContent = `₹${price} INR`;

    // Show Success UI
    billingSection.style.display = 'none';
    successSection.style.display = 'block';

    window.showToastMessage(`Payment Authorized via ${gateway}! Premium Activated.`);
    injectConfettiParticles();
  }

  // Bind form submissions to Stripe or Razorpay initiates
  let isSubmitting = false;
  if (creditCardForm) {
    creditCardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;
      const submitBtn = creditCardForm.querySelector('.btn-form-submit');
      handleStripePayment(submitBtn);
    });
  }

  if (upiPaymentForm) {
    upiPaymentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;
      const submitBtn = upiPaymentForm.querySelector('.btn-form-submit');
      handleRazorpayPayment(submitBtn, 'UPI Gateway');
    });
  }

  // Card UI flipping details (keeping original aesthetics)
  const cardNumberInput = document.getElementById('card-number');
  const cardHolderInput = document.getElementById('card-holder');
  const cardExpiryInput = document.getElementById('card-expiry');
  const cardCvvInput = document.getElementById('card-cvv');
  const card = document.querySelector('.credit-card');
  const cardNumberDisplay = document.getElementById('card-number-display');
  const cardHolderDisplay = document.getElementById('card-holder-display');
  const cardExpiryDisplay = document.getElementById('card-expiry-display');
  const cardCvvDisplay = document.getElementById('card-cvv-display');
  const cardBrandLogo = document.getElementById('card-brand-logo');

  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      let formattedValue = '';
      for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formattedValue += ' ';
        formattedValue += value[i];
      }
      e.target.value = formattedValue.substring(0, 19);
      cardNumberDisplay.textContent = e.target.value || '•••• •••• •••• ••••';

      if (value.startsWith('4')) {
        cardBrandLogo.innerHTML = '<i class="fab fa-cc-visa" style="color: #1a1f71; font-size: 1.8rem; text-shadow: 0 0 5px #fff;"></i>';
      } else if (value.startsWith('5')) {
        cardBrandLogo.innerHTML = '<i class="fab fa-cc-mastercard" style="color: #eb001b; font-size: 1.8rem; text-shadow: 0 0 5px #fff;"></i>';
      } else {
        cardBrandLogo.textContent = 'NETPRIME';
      }
    });

    cardHolderInput.addEventListener('input', (e) => {
      cardHolderDisplay.textContent = e.target.value.toUpperCase() || 'CARDHOLDER NAME';
    });

    cardExpiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\//g, '').replace(/[^0-9]/gi, '');
      let formatted = '';
      if (value.length > 0) {
        formatted += value.substring(0, 2);
        if (value.length > 2) formatted += '/' + value.substring(2, 4);
      }
      e.target.value = formatted.substring(0, 5);
      cardExpiryDisplay.textContent = e.target.value || 'MM/YY';
    });

    cardCvvInput.addEventListener('focus', () => card.classList.add('flipped'));
    cardCvvInput.addEventListener('blur', () => card.classList.remove('flipped'));
    cardCvvInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^0-9]/gi, '');
      e.target.value = value.substring(0, 4);
      cardCvvDisplay.textContent = e.target.value || '•••';
    });
  }

  // Confetti celebrations
  function injectConfettiParticles() {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1500;
      overflow: hidden;
    `;
    document.body.appendChild(container);

    const colors = ['#ff007f', '#ffffff', '#ffaa00', '#00ff66', '#007bc1'];
    
    for (let i = 0; i < 75; i++) {
      const p = document.createElement('div');
      const left = Math.random() * 100;
      const size = Math.random() * 8 + 6;
      const delay = Math.random() * 3;
      const duration = Math.random() * 3 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      p.style.cssText = `
        position: absolute;
        top: -10px;
        left: ${left}vw;
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        opacity: ${Math.random() * 0.7 + 0.3};
        transform: rotate(${Math.random() * 360}deg);
        animation: confettiFall ${duration}s linear ${delay}s infinite;
      `;
      container.appendChild(p);
    }
  }

});
