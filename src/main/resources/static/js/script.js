// ============================================================================
// LogiTrack — script.js (compartido por todas las páginas)
// JavaScript puro, sin dependencias.
//
// - Lo genérico (animación de entrada, menú móvil, cerrar modales con Esc)
//   corre en cualquier página que tenga esos elementos.
// - Cada pantalla (login, dashboard, bodegas, ...) tiene su propio
//   inicializador que se sale de inmediato si sus elementos no existen.
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initEntranceAnimations();
  initAppShellMobileMenu();
  initModalEscapeHandling();

  initLoginPage();
  initDashboardWidgets();
  initBodegasPage();
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================================
   Genérico — corre en cualquier página
   ============================================================================ */

// Animación de entrada escalonada para cualquier elemento con [data-animate].
// El "stagger" entre elementos se define con animation-delay inline en el HTML.
function initEntranceAnimations() {
  const els = document.querySelectorAll('[data-animate]');
  if (!els.length) return;

  if (prefersReducedMotion) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  requestAnimationFrame(() => {
    els.forEach((el) => el.classList.add('is-visible'));
  });
}

// Menú lateral en móvil (abrir/cerrar con botón hamburguesa + overlay)
function initAppShellMobileMenu() {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;

  const sidebar = shell.querySelector('.sidebar');
  const overlay = shell.querySelector('.mobile-overlay');
  const menuBtn = shell.querySelector('.topbar__menu-btn');
  if (!sidebar || !overlay || !menuBtn) return;

  function open() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-visible');
  }
  function close() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
  }

  menuBtn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

// Cierra cualquier modal abierto con la tecla Escape (no-op si no hay modales)
function initModalEscapeHandling() {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop.is-open').forEach((modal) => {
      modal.classList.remove('is-open');
    });
  });
}

/* ============================================================================
   Login
   ============================================================================ */
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const card = document.getElementById('login-card');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password-btn');
  const toggleIcon = document.getElementById('toggleIcon');
  const errorMessage = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnLabel = document.getElementById('btn-label');
  const btnIcon = document.getElementById('btn-icon');

  // La card "se asienta" (sombra sutil) justo después de que termina la
  // secuencia de entrada escalonada.
  if (prefersReducedMotion) {
    card.classList.add('is-settled');
  } else {
    setTimeout(() => card.classList.add('is-settled'), 280 + 550);
  }

  // Mostrar / ocultar contraseña
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

  function setFieldsErrorState(hasError) {
    [usernameInput, passwordInput].forEach((input) => input.classList.toggle('has-error', hasError));
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
    setTimeout(() => {
      setLoadingState(false);
      showError();
    }, 900);
  });
}

/* ============================================================================
   Dashboard
   ============================================================================ */
function initDashboardWidgets() {
  const bars = document.querySelectorAll('.chart-bar__fill');
  const refreshBtn = document.querySelector('.btn-refresh');
  if (!bars.length && !refreshBtn) return;

  function animateBars() {
    bars.forEach((bar) => {
      const finalHeight = bar.style.getPropertyValue('--bar-height') || bar.style.height;
      if (prefersReducedMotion) {
        bar.style.height = finalHeight;
        return;
      }
      bar.style.height = '0%';
      requestAnimationFrame(() => {
        setTimeout(() => {
          bar.style.height = finalHeight;
        }, 100);
      });
    });
  }
  animateBars();

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (refreshBtn.classList.contains('is-loading')) return;
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;

      setTimeout(() => {
        refreshBtn.classList.remove('is-loading');
        refreshBtn.disabled = false;
        animateBars();
      }, 700);
    });
  }
}

/* ============================================================================
   Bodegas (listado + modal crear/editar + modal eliminar + búsqueda)
   ============================================================================ */
function initBodegasPage() {
  const table = document.getElementById('bodegas-table');
  if (!table) return;

  const rows = () => Array.from(table.querySelectorAll('tbody tr'));

  // ---------------------------------------------------------------------
  // Búsqueda en vivo por nombre o ubicación
  // ---------------------------------------------------------------------
  const searchInput = document.getElementById('bodega-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.trim().toLowerCase();
      rows().forEach((row) => {
        const name = (row.dataset.name || '').toLowerCase();
        const location = (row.dataset.location || '').toLowerCase();
        const matches = !term || name.includes(term) || location.includes(term);
        row.classList.toggle('is-hidden', !matches);
      });
    });
  }

  // ---------------------------------------------------------------------
  // Modal crear / editar bodega
  // ---------------------------------------------------------------------
  const bodegaModal = document.getElementById('bodega-modal-backdrop');
  const bodegaForm = document.getElementById('bodega-form');
  const bodegaModalTitle = document.getElementById('bodega-modal-title');
  const openCreateBtn = document.getElementById('open-create-modal-btn');

  function openBodegaModal(mode, data) {
    if (!bodegaModal) return;
    bodegaModalTitle.textContent = mode === 'edit' ? 'Editar Bodega' : 'Crear Nueva Bodega';
    bodegaForm.reset();
    bodegaForm.classList.remove('has-error');

    if (data) {
      bodegaForm.elements.nombre.value = data.name || '';
      bodegaForm.elements.ubicacion.value = data.location || '';
      bodegaForm.elements.capacidad.value = data.capacity || '';
      bodegaForm.elements.encargado.value = data.manager || '';
    }

    bodegaModal.classList.add('is-open');
    requestAnimationFrame(() => bodegaForm.elements.nombre.focus());
  }

  function closeBodegaModal() {
    if (bodegaModal) bodegaModal.classList.remove('is-open');
  }

  if (openCreateBtn) openCreateBtn.addEventListener('click', () => openBodegaModal('create'));

  if (bodegaModal) {
    bodegaModal.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
      btn.addEventListener('click', closeBodegaModal);
    });
    bodegaModal.addEventListener('click', (event) => {
      if (event.target === bodegaModal) closeBodegaModal();
    });
  }

  if (bodegaForm) {
    bodegaForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!bodegaForm.checkValidity()) {
        bodegaForm.reportValidity();
        return;
      }
      // Aquí se conectaría la llamada real al backend (POST/PUT /bodegas).
      closeBodegaModal();
    });
  }

  rows().forEach((row) => {
    const editBtn = row.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openBodegaModal('edit', {
          name: row.dataset.name,
          location: row.dataset.location,
          capacity: row.dataset.capacity,
          manager: row.dataset.manager,
        });
      });
    }
  });

  // ---------------------------------------------------------------------
  // Modal de confirmación para eliminar
  // ---------------------------------------------------------------------
  const deleteModal = document.getElementById('delete-modal-backdrop');
  const deleteModalName = document.getElementById('delete-modal-name');
  const deleteConfirmBtn = document.getElementById('delete-modal-confirm');
  let rowPendingDelete = null;

  rows().forEach((row) => {
    const deleteBtn = row.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        rowPendingDelete = row;
        if (deleteModalName) deleteModalName.textContent = row.dataset.name || 'esta bodega';
        if (deleteModal) deleteModal.classList.add('is-open');
      });
    }
  });

  function closeDeleteModal() {
    if (deleteModal) deleteModal.classList.remove('is-open');
    rowPendingDelete = null;
  }

  if (deleteModal) {
    deleteModal.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
      btn.addEventListener('click', closeDeleteModal);
    });
    deleteModal.addEventListener('click', (event) => {
      if (event.target === deleteModal) closeDeleteModal();
    });
  }

  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', () => {
      if (!rowPendingDelete) {
        closeDeleteModal();
        return;
      }
      const row = rowPendingDelete;
      closeDeleteModal();

      // Aquí se conectaría la llamada real al backend (DELETE /bodegas/{id}).
      if (prefersReducedMotion) {
        row.remove();
      } else {
        row.classList.add('is-removing');
        row.addEventListener('animationend', () => row.remove(), { once: true });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Paginación (demo visual: alterna la página activa)
  // ---------------------------------------------------------------------
  const pageButtons = table.closest('.table-card')?.querySelectorAll('[data-page]') || [];
  pageButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      pageButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
}