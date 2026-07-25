/* ============================================================================
   UI Kit — toasts, confirmaciones, loading, estados de error.
   Módulo independiente: NO depende de api.js ni de script.js.
   Requiere: css/ui-kit.css + fuente "Material Symbols Outlined" (ya cargada
   en tus páginas actuales).

   Uso:
     UIKit.toast('Bodega eliminada', 'success');
     const ok = await UIKit.confirmDialog({ title: '...', message: '...', danger: true });
     UIKit.showLoading('#panel'); UIKit.hideLoading('#panel');
     UIKit.renderErrorState('#panel', { title: '...', message: '...' });
   ============================================================================ */
(function (global) {
  'use strict';

  const ICONS = { success: 'check_circle', warning: 'warning', error: 'error', info: 'info' };
  const TITLES = { success: 'Éxito', warning: 'Advertencia', error: 'Error', info: 'Info' };

  function ensureToastContainer() {
    let container = document.querySelector('.uikit-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'uikit-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(message, type = 'info', duration = 4000) {
    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = `uikit-toast uikit-toast--${type}`;
    el.innerHTML = `
      <span class="material-symbols-outlined uikit-toast__icon">${ICONS[type] || ICONS.info}</span>
      <div class="uikit-toast__body">
        <p class="uikit-toast__title">${TITLES[type] || ''}</p>
        <p class="uikit-toast__message"></p>
      </div>
      <button class="uikit-toast__close" type="button" aria-label="Cerrar">
        <span class="material-symbols-outlined">close</span>
      </button>`;
    el.querySelector('.uikit-toast__message').textContent = message;

    function remove() {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 200);
    }
    el.querySelector('.uikit-toast__close').addEventListener('click', remove);
    container.appendChild(el);
    if (duration > 0) setTimeout(remove, duration);
    return { close: remove };
  }

  function confirmDialog({ title = '¿Está seguro?', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'uikit-modal-backdrop';
      backdrop.innerHTML = `
        <div class="uikit-modal" role="alertdialog" aria-modal="true">
          <div class="uikit-modal__header">
            <div class="uikit-modal__icon${danger ? ' uikit-modal__icon--danger' : ''}">
              <span class="material-symbols-outlined">${danger ? 'warning' : 'help'}</span>
            </div>
            <h3 class="uikit-modal__title"></h3>
          </div>
            <div class="uikit-modal__message"></div>
          <div class="uikit-modal__actions">
            <button class="uikit-btn uikit-btn--outline" data-role="cancel" type="button"></button>
            <button class="uikit-btn ${danger ? 'uikit-btn--danger' : 'uikit-btn--primary'}" data-role="confirm" type="button"></button>
          </div>
        </div>`;
      backdrop.querySelector('.uikit-modal__title').textContent = title;
      backdrop.querySelector('.uikit-modal__message').innerHTML = message;
      backdrop.querySelector('[data-role="cancel"]').textContent = cancelText;
      backdrop.querySelector('[data-role="confirm"]').textContent = confirmText;

      function close(result) {
        backdrop.classList.remove('is-open');
        document.removeEventListener('keydown', onKeydown);
        setTimeout(() => backdrop.remove(), 150);
        resolve(result);
      }
      function onKeydown(e) { if (e.key === 'Escape') close(false); }

      backdrop.querySelector('[data-role="cancel"]').addEventListener('click', () => close(false));
      backdrop.querySelector('[data-role="confirm"]').addEventListener('click', () => close(true));
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
      document.addEventListener('keydown', onKeydown);

      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('is-open'));
    });
  }

  function resolveTarget(target) {
    if (!target) return document.body;
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function showLoading(target, message = 'Cargando...') {
    const el = resolveTarget(target);
    if (!el) return;
    hideLoading(target);
    const isBody = el === document.body;
    if (!isBody && getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }
    const overlay = document.createElement('div');
    overlay.className = `uikit-loading-overlay${isBody ? ' uikit-loading-overlay--fixed' : ''}`;
    overlay.innerHTML = `<div class="uikit-spinner"></div><span class="uikit-loading-text"></span>`;
    overlay.querySelector('.uikit-loading-text').textContent = message;
    el.appendChild(overlay);
  }

  function hideLoading(target) {
    const el = resolveTarget(target);
    el?.querySelector(':scope > .uikit-loading-overlay')?.remove();
  }

  function renderErrorState(target, { icon = 'error_outline', title = 'Ocurrió un error', message = '', retryLabel, onRetry } = {}) {
    const el = resolveTarget(target);
    if (!el) return;
    el.innerHTML = `
      <div class="uikit-error-state">
        <span class="material-symbols-outlined">${icon}</span>
        <p class="uikit-error-state__title"></p>
        <p class="uikit-error-state__message"></p>
      </div>`;
    el.querySelector('.uikit-error-state__title').textContent = title;
    el.querySelector('.uikit-error-state__message').textContent = message;
    if (retryLabel && typeof onRetry === 'function') {
      const btn = document.createElement('button');
      btn.className = 'uikit-btn uikit-btn--primary';
      btn.style.marginTop = '0.5rem';
      btn.textContent = retryLabel;
      btn.addEventListener('click', onRetry);
      el.querySelector('.uikit-error-state').appendChild(btn);
    }
  }

  global.UIKit = { toast, confirmDialog, showLoading, hideLoading, renderErrorState };
})(window);