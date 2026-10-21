(() => {
  const gate = document.getElementById('loginGate');
  const app = document.getElementById('platformApp');
  const form = document.getElementById('loginForm');
  if (!gate || !app || !form) return;

  const client = window.platformFlowSupabase;
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

  function railwayIdToEmail(value) {
    const id = value.trim().toLowerCase();
    return id.replace(/[^a-z0-9._+-]/g, '') + '@platformflow.app';
  }

  function showMessage(text, isSuccess = false) {
    message.textContent = text;
    message.style.color = isSuccess ? '#8df0e1' : '';
  }

  function unlockApp() {
    gate.hidden = true;
    app.classList.remove('is-locked');
  }

  function lockApp() {
    gate.hidden = false;
    app.classList.add('is-locked');
  }

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
      ? 'Create your PlatformFlow account using a Railway ID label and password.'
      : 'Enter the same Railway ID and password on each device.';
    signInTab.classList.toggle('active', !signingUp);
    signUpTab.classList.toggle('active', signingUp);
    showMessage('');
  };

  signInTab.addEventListener('click', () => setMode('signin'));
  signUpTab.addEventListener('click', () => setMode('signup'));

  async function restoreSession() {
    if (!client) {
      showMessage('Cloud login could not start. Refresh the page and check the Supabase connection.');
      lockApp();
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (!error && data.session) unlockApp();
    else lockApp();
  }
  restoreSession();

  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) logoutButton.addEventListener('click', async () => {
    if (client) await client.auth.signOut();
    lockApp();
    form.reset();
    setMode('signin');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client) {
      showMessage('Cloud login is unavailable. Please refresh the page.');
      return;
    }
    const id = usernameInput.value.trim();
    const password = passwordInput.value;
    if (id.length < 3) { showMessage('Enter a valid Railway ID card number.'); return; }
    if (password.length < 6) { showMessage('Password must contain at least 6 characters.'); return; }

    submit.disabled = true;
    submit.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…';
    try {
      const email = railwayIdToEmail(id);
      if (mode === 'signup') {
        const mobile = mobileInput.value.trim();
        if (!zoneInput.value.trim() || !divisionInput.value.trim()) {
          showMessage('Enter both railway zone and division.');
          return;
        }
        if (!/^\+?[0-9\s()-]{10,16}$/.test(mobile)) {
          showMessage('Enter a valid mobile number (10–16 digits, optionally with country code).');
          return;
        }
        if (password !== confirmInput.value) {
          showMessage('Passwords do not match.');
          return;
        }
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: {
            railway_id_label: id,
            railway_zone: zoneInput.value.trim(),
            railway_division: divisionInput.value.trim(),
            railway_mobile: mobile
          }}
        });
        if (error) throw error;
        if (!data.session) {
          showMessage('Account request created. Supabase email confirmation is enabled; disable email confirmation in Supabase Auth settings for this Railway-ID-only demo, or configure a real email sign-in.', false);
          return;
        }
        showMessage('Account created. Your cloud account is ready.', true);
        unlockApp();
        return;
      }

      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showMessage('');
      unlockApp();
    } catch (error) {
      showMessage(error.message || 'Authentication failed. Check your Railway ID and password.');
    } finally {
      submit.disabled = false;
      submit.textContent = mode === 'signup' ? 'Create account' : 'Sign in with password';
    }
  });
})();
