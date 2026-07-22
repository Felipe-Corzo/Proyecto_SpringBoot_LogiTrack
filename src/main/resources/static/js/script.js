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
  initProductosPage();
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

/* ============================================================================
   Productos (listado + filtros combinados + modal crear/editar + eliminar)
   ============================================================================ */
function initProductosPage() {
  const table = document.getElementById('products-table');
  if (!table) return;

  const rows = () => Array.from(table.querySelectorAll('tbody tr'));
  const emptyState = document.getElementById('products-empty-state');

  // ---------------------------------------------------------------------
  // Filtros combinados: búsqueda + categoría + solo stock bajo
  // ---------------------------------------------------------------------
  const searchInputs = [
    document.getElementById('product-search-desktop'),
    document.getElementById('product-search-mobile'),
  ].filter(Boolean);
  const categorySelect = document.getElementById('product-category-filter');
  const lowStockCheckbox = document.getElementById('product-low-stock-filter');

  function applyFilters() {
    const term = (searchInputs.find((i) => i.value)?.value || '').trim().toLowerCase();
    const category = categorySelect ? categorySelect.value : '';
    const onlyLowStock = lowStockCheckbox ? lowStockCheckbox.checked : false;

    let visibleCount = 0;

    rows().forEach((row) => {
      const name = (row.dataset.name || '').toLowerCase();
      const id = (row.dataset.id || '').toLowerCase();
      const rowCategory = row.dataset.category || '';
      const isLowStock = row.classList.contains('is-low-stock');

      const matchesTerm = !term || name.includes(term) || id.includes(term);
      const matchesCategory = !category || rowCategory === category;
      const matchesStock = !onlyLowStock || isLowStock;

      const visible = matchesTerm && matchesCategory && matchesStock;
      row.classList.toggle('is-hidden-by-filter', !visible);
      if (visible) visibleCount += 1;
    });

    if (emptyState) emptyState.classList.toggle('is-visible', visibleCount === 0);
  }

  // Mantiene sincronizados los dos campos de búsqueda (desktop y mobile)
  searchInputs.forEach((input) => {
    input.addEventListener('input', () => {
      searchInputs.forEach((other) => {
        if (other !== input) other.value = input.value;
      });
      applyFilters();
    });
  });
  if (categorySelect) categorySelect.addEventListener('change', applyFilters);
  if (lowStockCheckbox) lowStockCheckbox.addEventListener('change', applyFilters);

  // ---------------------------------------------------------------------
  // Modal crear / editar producto
  // ---------------------------------------------------------------------
  const productModal = document.getElementById('product-modal-backdrop');
  const productForm = document.getElementById('product-form');
  const productModalTitle = document.getElementById('product-modal-title');
  const openCreateBtn = document.getElementById('open-create-product-modal-btn');

  function openProductModal(mode, data) {
    if (!productModal) return;
    productModalTitle.textContent = mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto';
    productForm.reset();

    if (data) {
      productForm.elements.nombre.value = data.name || '';
      productForm.elements.categoria.value = data.category || '';
      productForm.elements.stock.value = data.stock ?? '';
      productForm.elements.precio.value = data.price ?? '';
    }

    productModal.classList.add('is-open');
    requestAnimationFrame(() => productForm.elements.nombre.focus());
  }

  function closeProductModal() {
    if (productModal) productModal.classList.remove('is-open');
  }

  if (openCreateBtn) openCreateBtn.addEventListener('click', () => openProductModal('create'));

  if (productModal) {
    productModal.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
      btn.addEventListener('click', closeProductModal);
    });
    productModal.addEventListener('click', (event) => {
      if (event.target === productModal) closeProductModal();
    });
  }

  if (productForm) {
    productForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!productForm.checkValidity()) {
        productForm.reportValidity();
        return;
      }
      // Aquí se conectaría la llamada real al backend (POST/PUT /productos).
      closeProductModal();
    });
  }

  rows().forEach((row) => {
    const editBtn = row.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openProductModal('edit', {
          name: row.dataset.name,
          category: row.dataset.category,
          stock: row.dataset.stock,
          price: row.dataset.price,
        });
      });
    }
  });

  // ---------------------------------------------------------------------
  // Modal de confirmación para eliminar
  // ---------------------------------------------------------------------
  const deleteModal = document.getElementById('delete-product-modal-backdrop');
  const deleteModalName = document.getElementById('delete-product-modal-name');
  const deleteConfirmBtn = document.getElementById('delete-product-modal-confirm');
  let rowPendingDelete = null;

  rows().forEach((row) => {
    const deleteBtn = row.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        rowPendingDelete = row;
        if (deleteModalName) deleteModalName.textContent = row.dataset.name || 'este producto';
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

      // Aquí se conectaría la llamada real al backend (DELETE /productos/{id}).
      if (prefersReducedMotion) {
        row.remove();
      } else {
        row.classList.add('is-removing');
        row.addEventListener('animationend', () => row.remove(), { once: true });
      }
    });
  }
}

/* ============================================================================
   Movimientos (Historial)
   ============================================================================ */
   function initMovimientosPage() {
    const table = document.querySelector('.data-table');
    // Verifica si estamos en la página correcta (por si usas el mismo script.js en todas)
    if (!table || document.querySelector('#movement-form')) return; 
    
    // Aquí puedes agregar en el futuro la lógica de los filtros de la grilla de arriba,
    // similar a lo que ya tienes en initProductosPage().
  }
  
  /* ============================================================================
     Registrar Movimiento
     ============================================================================ */
  function initNuevoMovimientoPage() {
    const form = document.getElementById('movement-form');
    if (!form) return;
  
    const fechaInput = document.getElementById('fecha');
    const typeSelect = document.getElementById('movement-type');
    const warehouseSection = document.getElementById('warehouse-section');
    const origenContainer = document.getElementById('bodega-origen-container');
    const destinoContainer = document.getElementById('bodega-destino-container');
    
    const btnAddProduct = document.getElementById('btn-add-product');
    const tbody = document.getElementById('products-tbody');
    const emptyState = document.getElementById('empty-state');
  
    // 1. Setear fecha actual
    if (fechaInput) {
      fechaInput.valueAsDate = new Date();
    }
  
    // 2. Lógica para mostrar/ocultar bodegas
    typeSelect.addEventListener('change', () => {
      const type = typeSelect.value;
      
      warehouseSection.classList.remove('hidden');
      origenContainer.classList.add('hidden');
      destinoContainer.classList.add('hidden');
  
      if (type === 'ENTRADA') {
        destinoContainer.classList.remove('hidden');
        document.getElementById('bodega-destino').required = true;
        document.getElementById('bodega-origen').required = false;
      } else if (type === 'SALIDA') {
        origenContainer.classList.remove('hidden');
        document.getElementById('bodega-origen').required = true;
        document.getElementById('bodega-destino').required = false;
      } else if (type === 'TRANSFERENCIA') {
        origenContainer.classList.remove('hidden');
        destinoContainer.classList.remove('hidden');
        document.getElementById('bodega-origen').required = true;
        document.getElementById('bodega-destino').required = true;
      } else {
        warehouseSection.classList.add('hidden');
      }
    });
  
    // 3. Agregar filas dinámicas
    btnAddProduct.addEventListener('click', () => {
      emptyState.classList.remove('is-visible');
  
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="select-wrapper">
            <select class="form-select border-transparent" required>
              <option value="" disabled selected>Seleccionar producto...</option>
              <option value="P1">Laptop ThinkPad T14</option>
              <option value="P2">Monitor Dell 27"</option>
              <option value="P3">Teclado Mecánico Keychron</option>
            </select>
            <span class="material-symbols-outlined">expand_more</span>
          </div>
        </td>
        <td>
          <input type="number" min="1" value="1" class="form-input form-input--mono border-transparent text-right" required>
        </td>
        <td class="is-center">
          <button type="button" class="row-action-btn row-action-btn--danger btn-remove-row" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      `;
      
      // Animación sutil de entrada (respetando prefersReducedMotion del archivo base)
      if (!prefersReducedMotion) {
        tr.style.opacity = '0';
        tr.style.transform = 'translateY(-10px)';
        tr.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        tbody.appendChild(tr);
        
        requestAnimationFrame(() => {
          tr.style.opacity = '1';
          tr.style.transform = 'translateY(0)';
        });
      } else {
        tbody.appendChild(tr);
      }
    });
  
    // 4. Delegación de eventos para eliminar filas
    tbody.addEventListener('click', (event) => {
      const btnRemove = event.target.closest('.btn-remove-row');
      if (!btnRemove) return;
  
      const row = btnRemove.closest('tr');
      
      if (!prefersReducedMotion) {
        row.style.opacity = '0';
        row.style.transform = 'scale(0.98)';
        row.addEventListener('transitionend', () => {
          row.remove();
          checkEmptyState();
        });
      } else {
        row.remove();
        checkEmptyState();
      }
    });
  
    function checkEmptyState() {
      if (tbody.children.length === 0) {
        emptyState.classList.add('is-visible');
      }
    }
  
    // 5. Submit form logic
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (tbody.children.length === 0) {
        alert("Debes agregar al menos un producto al movimiento.");
        return;
      }
      
      // Lógica para enviar al backend
      alert("Movimiento guardado con éxito (Simulación)");
      window.location.href = "movimientos.html";
    });
  }