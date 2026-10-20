(() => {
  const gate = document.getElementById('loginGate');
  const app = document.getElementById('platformApp');
  const form = document.getElementById('loginForm');
  if (!gate || !app || !form) return;

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const confirmInput = document.getElementById('confirmPassword');
  const confirmWrap = document.getElementById('confirmPasswordWrap');
  const signupDetails = document.getElementById('signupDetails');
  const zoneInput = document.getElementById('railwayZone');
  const divisionInput = document.getElementById('railwayDivision');
  const mobileInput = document.getElementById('railwayMobile');
  const message = document.getElementById('loginMessage');
  const submit = document.getElementById('authSubmit');
  const subtitle = document.getElementById('authSubtitle');
  const signInTab = document.getElementById('showSignIn');
  const signUpTab = document.getElementById('showSignUp');
  let mode = 'signin';

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('platformflow.accounts') || '{}'); }
    catch { return {}; }
  };

  const setMode = (nextMode) => {
    mode = nextMode;
    const signingUp = mode === 'signup';
    confirmWrap.hidden = !signingUp;
    signupDetails.hidden = !signingUp;
    passwordInput.required = true;
    confirmInput.required = signingUp;
    zoneInput.required = signingUp;
    divisionInput.required = signingUp;
    mobileInput.required = signingUp;
    usernameInput.placeholder = 'Enter Railway ID card number';
    passwordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
    passwordInput.value = '';
    confirmInput.value = '';
    submit.textContent = signingUp ? 'Create account' : 'Sign in with password';
    subtitle.textContent = signingUp
      ? 'Create a local demo account using your Railway ID number and a password.'
      : 'Enter your Railway ID card number and password to open the station planning dashboard.';
    signInTab.classList.toggle('active', !signingUp);
    signUpTab.classList.toggle('active', signingUp);
    message.textContent = '';
    message.style.color = '';
  };

  signInTab.addEventListener('click', () => setMode('signin'));
  signUpTab.addEventListener('click', () => setMode('signup'));

  if (sessionStorage.getItem('platformflow.demoSignedIn') === 'yes') {
    gate.hidden = true;
    app.classList.remove('is-locked');
  }

  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('platformflow.demoSignedIn');
    gate.hidden = false;
    app.classList.add('is-locked');
    form.reset();
    setMode('signin');
  });

  function maskMobile(mobile) {
    if (!mobile) return 'the saved mobile number';
    return mobile.length > 4 ? `${'*'.repeat(Math.max(0, mobile.length - 4))}${mobile.slice(-4)}` : mobile;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = usernameInput.value.trim();
    const password = passwordInput.value;
    const users = getUsers();
    if (id.length < 3) { message.textContent = 'Enter a valid Railway ID card number.'; return; }

    if (mode === 'signup') {
      const mobile = mobileInput.value.trim();
      if (!zoneInput.value.trim() || !divisionInput.value.trim()) { message.textContent = 'Enter both railway zone and division.'; return; }
      if (!/^\+?[0-9\s()-]{10,16}$/.test(mobile)) { message.textContent = 'Enter a valid mobile number (10–16 digits, optionally with country code).'; return; }
      if (password.length < 6) { message.textContent = 'Password must contain at least 6 characters.'; return; }
      if (users[id]) { message.textContent = 'This Railway ID already has a local demo account. Please sign in.'; return; }
      if (password !== confirmInput.value) { message.textContent = 'Passwords do not match.'; return; }
      users[id] = { password, zone: zoneInput.value.trim(), division: divisionInput.value.trim(), mobile };
      try { localStorage.setItem('platformflow.accounts', JSON.stringify(users)); }
      catch { message.textContent = 'Could not save account in this browser. Check browser storage settings.'; return; }
      message.style.color = '#8df0e1';
      message.textContent = 'Local demo account created. You can now sign in using your Railway ID and password.';
      form.reset();
      setMode('signin');
      usernameInput.value = id;
      message.style.color = '#8df0e1';
      message.textContent = 'Account created. Enter your password and select Sign in.';
      return;
    }

    const user = users[id];
    if (!user) { message.textContent = 'No local demo account found for this Railway ID. Select Sign up first.'; return; }
    if (!password || password !== user.password) { message.textContent = 'Incorrect password. Please try again or create an account if you have not signed up.'; return; }
    sessionStorage.setItem('platformflow.demoSignedIn', 'yes');
    message.textContent = '';
    gate.hidden = true;
    app.classList.remove('is-locked');
  });
})();
