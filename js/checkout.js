/* js/checkout.js */

document.addEventListener('DOMContentLoaded', () => {
  // Plan Selection States
  let selectedPlan = 'TRIAL';
  let selectedPrice = 1;
  let selectedGateway = 'UPI Static QR Scan';

  // Pricing elements
  const pricingCards = document.querySelectorAll('.pricing-card');
  const summaryTotalPrice = document.getElementById('summary-total-price');

  // Payment Tabs Switcher
  const tabCardBtn = document.getElementById('tab-card-btn');
  const tabUpiBtn = document.getElementById('tab-upi-btn');
  const paymentCardPanel = document.getElementById('payment-card-panel');
  const paymentUpiPanel = document.getElementById('payment-upi-panel');

  // Credit Card Elements
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
  const creditCardForm = document.getElementById('checkout-form');

  // UPI Elements
  const upiProviders = document.querySelectorAll('.upi-provider-btn');
  let selectedUpiProvider = 'Google Pay';
  const upiVpaInput = document.getElementById('upi-vpa-id');
  const upiPaymentForm = document.getElementById('upi-payment-form');

  // Billing Views
  const billingSection = document.getElementById('billing-section');
  const successSection = document.getElementById('success-section');

  // Ensure user is logged in
  function verifyUserLogin() {
    const user = window.NetPrimeState.getCurrentUser();
    if (!user || user.username === 'Guest User') {
      billingSection.innerHTML = `
        <div class="glass" style="padding: 40px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,0,127,0.15); max-width: 600px; margin: 0 auto;">
          <i class="fa fa-user-lock" style="font-size: 3.5rem; color: var(--accent-magenta); text-shadow: var(--shadow-magenta); margin-bottom: 20px;"></i>
          <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 12px;">Sign In Required</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;">
            Please log in or register a NetPrime account before subscribing to our Premium packages.
          </p>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button class="btn-outline" onclick="window.location.href='./login.html'">Sign In</button>
            <button class="btn-premium" onclick="window.location.href='./signup.html'">Register Account</button>
          </div>
        </div>
      `;
      return false;
    }
    return true;
  }

  const loggedIn = verifyUserLogin();
  if (!loggedIn) return;

  // 1. Plan Selector Event Handlers
  pricingCards.forEach(card => {
    card.addEventListener('click', () => {
      pricingCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      selectedPlan = card.getAttribute('data-plan');
      selectedPrice = parseInt(card.getAttribute('data-price'));
      
      // Update Billed Total Display
      if (summaryTotalPrice) {
        summaryTotalPrice.textContent = `₹${selectedPrice}`;
      }

      // Update the QR Code for the new plan price
      updateDynamicQrCode();
    });
  });

  // Dynamic QR code generator based on price and payee VPA
  function updateDynamicQrCode() {
    const qrImg = document.getElementById('upi-qr-image');
    if (!qrImg) return;

    const payeeVpa = 'netprime@ybl';
    const payeeName = 'NetPrime';
    const upiUri = `upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${selectedPrice}&cu=INR`;

    // Fetch and render the QR code dynamically
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUri)}`;
    qrImg.src = qrApiUrl;
  }

  // Generate default QR code on page initialize
  updateDynamicQrCode();

  // 2. Tab Switcher Event Handlers
  if (tabCardBtn && tabUpiBtn) {
    tabCardBtn.addEventListener('click', () => {
      tabCardBtn.classList.add('active');
      tabUpiBtn.classList.remove('active');
      paymentCardPanel.style.display = 'flex';
      paymentUpiPanel.style.display = 'none';
      selectedGateway = '3D Secure Card';
    });

    tabUpiBtn.addEventListener('click', () => {
      tabUpiBtn.classList.add('active');
      tabCardBtn.classList.remove('active');
      paymentUpiPanel.style.display = 'block';
      paymentCardPanel.style.display = 'none';
      selectedGateway = 'UPI Static QR Scan';
    });
  }

  // 3. Credit Card input formatting and syncer
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

  // 4. UPI Provider buttons selectors
  upiProviders.forEach(btn => {
    btn.addEventListener('click', () => {
      upiProviders.forEach(p => p.classList.remove('selected'));
      btn.classList.add('selected');
      
      const providerId = btn.getAttribute('data-provider');
      if (providerId === 'gpay') selectedUpiProvider = 'Google Pay';
      if (providerId === 'phonepe') selectedUpiProvider = 'PhonePe';
      if (providerId === 'paytm') selectedUpiProvider = 'Paytm';
      if (providerId === 'bhim') selectedUpiProvider = 'BHIM UPI';

      selectedGateway = `UPI Mobile - ${selectedUpiProvider}`;
    });
  });

  // 5. Unified Submit Authorizations
  if (creditCardForm) {
    creditCardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = creditCardForm.querySelector('.btn-form-submit');
      
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing Secure 3D Card Gateway...';
      
      triggerCheckoutActivation(submitBtn);
    });
  }

  if (upiPaymentForm) {
    upiPaymentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = upiPaymentForm.querySelector('.btn-form-submit');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifying scan transaction with Bank API...';

      selectedGateway = 'UPI Static QR Scan';
      triggerCheckoutActivation(submitBtn);
    });
  }

  // Transaction successful activation workflow
  function triggerCheckoutActivation(btn) {
    setTimeout(() => {
      // 1. Upgrade in state manager
      window.NetPrimeState.upgradeToPremium(selectedPlan);

      // 2. Set receipt details
      const user = window.NetPrimeState.getCurrentUser();
      document.getElementById('invoice-user').textContent = user.username;
      
      const today = new Date();
      document.getElementById('invoice-date').textContent = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('invoice-id').textContent = 'NP-' + Math.floor(100000 + Math.random() * 900000);

      // Label Plan Tier in Invoice
      const invoiceTier = document.getElementById('invoice-tier');
      if (selectedPlan === 'TRIAL') invoiceTier.textContent = '₹1 FREE TRIAL ACTIVATED';
      if (selectedPlan === 'MONTHLY') invoiceTier.textContent = '₹199 MONTHLY PREMIUM';
      if (selectedPlan === 'YEARLY') invoiceTier.textContent = '₹1499 ANNUAL SAVER';

      document.getElementById('invoice-gateway').textContent = selectedGateway;
      document.getElementById('invoice-amount').textContent = `₹${selectedPrice} INR`;

      // 3. Show Success Section
      billingSection.style.display = 'none';
      successSection.style.display = 'block';

      // 4. Toast notification & celebratory confetti
      window.showToastMessage(`Payment Authorized via ${selectedGateway}! Tier updated.`);
      injectConfettiParticles();

      // Reset button
      btn.disabled = false;
    }, 2500);
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
