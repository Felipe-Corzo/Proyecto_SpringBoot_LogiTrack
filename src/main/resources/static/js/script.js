// ============================================================================
// LogiTrack — Login
// Interacciones: animación de entrada, toggle de contraseña, envío de formulario
// (JavaScript puro, sin dependencias)
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const card = document.getElementById('login-card');
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password-btn');
  const toggleIcon = document.getElementById('toggleIcon');
  const errorMessage = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnLabel = document.getElementById('btn-label');
  const btnIcon = document.getElementById('btn-icon');

  // --------------------------------------------------------------------
  // 1. Animación de entrada escalonada (respeta prefers-reduced-motion)
  // --------------------------------------------------------------------
  const animatedEls = document.querySelectorAll('[data-animate]');

  if (prefersReducedMotion) {
    animatedEls.forEach((el) => el.classList.add('is-visible'));
    card.classList.add('is-settled');
  } else {
    requestAnimationFrame(() => {
      animatedEls.forEach((el) => el.classList.add('is-visible'));
    });
    // La card "se asienta" (sombra sutil) justo después de que termina la
    // secuencia de entrada, para no competir visualmente con ella.
    const lastDelay = 280 + 550; // último elemento + duración de su animación
    setTimeout(() => card.classList.add('is-settled'), lastDelay);
  }

  // --------------------------------------------------------------------
  // 2. Mostrar / ocultar contraseña
  // --------------------------------------------------------------------
  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    if (!prefersReducedMotion) {
      toggleIcon.classList.add('is-flipped');
      setTimeout(() => toggleIcon.classList.remove('is-flipped'), 250);
    }

    toggleIcon.textContent = isPassword ? 'visibility' : 'visibility_off';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  // --------------------------------------------------------------------
  // 3. Envío del formulario (simulado) + estado de error
  // --------------------------------------------------------------------
  function setFieldsErrorState(hasError) {
    [usernameInput, passwordInput].forEach((input) => {
      input.classList.toggle('has-error', hasError);
    });
  }

  function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    btnSpinner.classList.toggle('hidden', !isLoading);
    btnIcon.classList.toggle('hidden', isLoading);
    btnLabel.textContent = isLoading ? 'Verificando…' : 'Ingresar';
  }

  function showError() {
    errorMessage.classList.remove('hidden');
    setFieldsErrorState(true);

    if (!prefersReducedMotion) {
      card.classList.remove('shake-on-error');
      // Forzar reflow para poder reiniciar la animación si se dispara de nuevo
      void card.offsetWidth;
      card.classList.add('shake-on-error');
    }

    usernameInput.focus();
  }

  function clearErrorOnInput() {
    if (errorMessage.classList.contains('hidden')) return;
    errorMessage.classList.add('hidden');
    setFieldsErrorState(false);
  }

  usernameInput.addEventListener('input', clearErrorOnInput);
  passwordInput.addEventListener('input', clearErrorOnInput);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    clearErrorOnInput();
    setLoadingState(true);

    // Aquí se conectaría la llamada real al backend (POST /auth/login).
    // Se simula la latencia de red para dar contexto de la interacción.
    setTimeout(() => {
      setLoadingState(false);
      showError();
    }, 900);
  });
});
