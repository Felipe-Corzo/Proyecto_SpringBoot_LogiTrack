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
  initNuevoMovimientoReal();
  initLoginPage();
  initDashboardWidgets();
  initModalDismissButtons();
  initGlobalHeaderEvents();
  initRegistroEmpleadoModal();
});

function initGlobalHeaderEvents() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.logout-btn')) {
      cerrarSesion();
    }
  });

  if (typeof getUsuarioActual === 'function') {
    const u = getUsuarioActual();
    if (u && u.username) {
      const initials = u.username.slice(0, 2).toUpperCase();
      document.querySelectorAll('.avatar').forEach((el) => {
        el.textContent = initials;
        el.title = `${u.username} (${u.rol || 'USUARIO'})`;
      });
    }
  }
}

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

function initModalDismissButtons() {
  document.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-backdrop')?.classList.remove('is-open');
    });
  });
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) backdrop.classList.remove('is-open');
    });
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

let dashboardState = {
  resumen: null,
  productos: []
};

async function cargarDashboard() {
  const shell = document.querySelector('.kpi-grid');
  if (!shell) return; // no estamos en dashboard.html

  protegerRuta();

  const rangeSelect = document.getElementById('dashboard-range');
  const dias = rangeSelect ? Number(rangeSelect.value) : 30;

  try {
    const resumen = await apiFetch(`/api/reportes/resumen?dias=${dias}&limit=20`);
    dashboardState.resumen = resumen;
    dashboardState.productos = Array.isArray(resumen.productosMasMovidos) ? resumen.productosMasMovidos : [];

    document.getElementById('kpi-total-bodegas').textContent = resumen.totalBodegas;
    document.getElementById('kpi-total-productos').textContent = resumen.totalProductos;
    document.getElementById('kpi-stock-bajo').textContent = resumen.productosBajoStock;
    document.getElementById('kpi-movimientos-mes').textContent = resumen.totalMovimientosMes;

    renderBarChart(resumen.stockPorBodega || []);
    renderTopMovidos(dashboardState.productos.slice(0, 5));
    renderTopProductsModal(dashboardState.productos);
  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

function renderBarChart(stockPorBodega) {
  const contenedor = document.getElementById('bar-chart-bars');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  if (!Array.isArray(stockPorBodega) || stockPorBodega.length === 0) {
    contenedor.innerHTML = '<div class="chart-empty">No hay datos de stock por bodega</div>';
    return;
  }

  const max = Math.max(...stockPorBodega.map((b) => Number(b.stockTotal)), 1);

  stockPorBodega.forEach((bodega) => {
    const porcentaje = Math.round((Number(bodega.stockTotal) / max) * 100);
    const fillClass = bodega.stockTotal === Math.max(...stockPorBodega.map((b) => Number(b.stockTotal))) ? ' chart-bar__fill--accent' : '';
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `
      <div class="chart-bar__fill${fillClass}" style="height:${porcentaje}%; --bar-height:${porcentaje}%;">
        <span class="chart-bar__tooltip">${bodega.stockTotal}</span>
      </div>
      <span class="chart-bar__label">${bodega.bodegaNombre}</span>`;
    contenedor.appendChild(div);
  });
}

function renderTopMovidos(productos) {
  const tbody = document.getElementById('top-movidos-tbody');
  if (!tbody) return;

  const items = Array.isArray(productos) ? productos : [];
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="2" class="is-center cell-muted">No hay movimientos en este rango.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((p) => `
    <tr>
      <td>
        <div class="product-cell">
          <div class="product-cell__icon"><span class="material-symbols-outlined">package_2</span></div>
          <div><div class="product-cell__name">${p.nombre}</div></div>
        </div>
      </td>
      <td class="is-right"><span class="metric-cell__value">${p.totalMovido}</span></td>
    </tr>`).join('');
}

function renderTopProductsModal(productos) {
  const body = document.getElementById('top-products-modal-body');
  const subtitle = document.getElementById('top-products-modal-subtitle');
  if (!body) return;

  const items = Array.isArray(productos) ? productos : [];
  if (subtitle) {
    subtitle.textContent = items.length > 0 ? `Mostrando ${items.length} productos en el rango seleccionado.` : 'No hay productos para mostrar en este rango.';
  }

  if (!items.length) {
    body.innerHTML = '<div class="chart-empty">No hay productos movidos en este rango.</div>';
    return;
  }

  body.innerHTML = `
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th class="is-right">Mov.</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((p) => `
            <tr>
              <td>
                <div class="product-cell">
                  <div class="product-cell__icon"><span class="material-symbols-outlined">package_2</span></div>
                  <div><div class="product-cell__name">${p.nombre}</div></div>
                </div>
              </td>
              <td class="is-right"><span class="metric-cell__value">${p.totalMovido}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

document.addEventListener('DOMContentLoaded', cargarDashboard);

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
    if (!form.checkValidity()) { form.reportValidity(); return; }
    clearErrorOnInput();
    setLoadingState(true);
  
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value,
      }),
    })
      .then((data) => {
        guardarSesion(data);
        window.location.href = 'html/dashboard.html';
      })
      .catch(() => {
        setLoadingState(false);
        showError();
      });
  });
}

/* ============================================================================
   Dashboard
   ============================================================================ */
function initDashboardWidgets() {
  const bars = document.querySelectorAll('.chart-bar__fill');
  const refreshBtn = document.querySelector('.btn-refresh');
  const rangeSelect = document.getElementById('dashboard-range');
  const verTodosBtn = document.getElementById('ver-todos-top-movidos');
  const modal = document.getElementById('top-products-modal');
  if (!bars.length && !refreshBtn && !rangeSelect && !verTodosBtn && !modal) return;

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
    refreshBtn.addEventListener('click', async () => {
      if (refreshBtn.classList.contains('is-loading')) return;
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;

      try {
        await cargarDashboard();
      } finally {
        refreshBtn.classList.remove('is-loading');
        refreshBtn.disabled = false;
        animateBars();
      }
    });
  }

  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      cargarDashboard();
    });
  }

  if (verTodosBtn && modal) {
    verTodosBtn.addEventListener('click', () => {
      renderTopProductsModal(dashboardState.productos);
      modal.classList.add('is-open');
    });
  }
}

/* ============================================================================
   Bodegas (listado + modal crear/editar + modal eliminar + búsqueda)
   ============================================================================ */
let todasLasBodegas = [];
let bodegasPaginacion = null;

async function cargarBodegas() {
  const tbody = document.getElementById('bodegas-tbody');
  if (!tbody) return;
  protegerRuta();

  try {
    todasLasBodegas = await apiFetch('/api/bodegas');
    iniciarPaginacionBodegas(todasLasBodegas);
    initBusquedaBodegas();
  } catch (err) {
    console.error('Error cargando bodegas:', err);
  }
}

function iniciarPaginacionBodegas(datos) {
  if (bodegasPaginacion) bodegasPaginacion = null;
  bodegasPaginacion = initPaginacion({
    data: datos,
    pageSize: 5,
    renderFn: (slice) => renderBodegas(slice),
    infoId: 'bodegas-pagination-info',
    prevBtnId: 'bodegas-prev-btn',
    nextBtnId: 'bodegas-next-btn',
    pageNumbersId: 'bodegas-page-numbers',
  });
}

function renderBodegas(bodegas) {
  const tbody = document.getElementById('bodegas-tbody');
  if (!tbody) return;

  if (bodegas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="is-center cell-muted" style="padding: 2rem;">No se encontraron bodegas.</td></tr>`;
    return;
  }

  // Obtener datos de stock del reporte si está disponible
  const resumen = dashboardState?.resumen;
  const stockPorBodega = {};
  if (resumen && Array.isArray(resumen.stockPorBodega)) {
    resumen.stockPorBodega.forEach(s => {
      stockPorBodega[s.bodegaId] = s.stockTotal;
    });
  }

  tbody.innerHTML = bodegas.map((b) => {
    const stockTotal = stockPorBodega[b.id] ?? '—';
    return `
    <tr data-id="${b.id}" data-name="${b.nombre}" data-location="${b.ubicacion}"
        data-capacity="${b.capacidad}" data-encargado-id="${b.encargado?.id ?? ''}">
      <td class="metric-cell__value">BOD-${b.id}</td>
      <td class="product-cell__name">${b.nombre}</td>
      <td>${b.ubicacion}</td>
      <td class="is-right"><span class="metric-cell__value">${b.capacidad}</span></td>
      <td class="is-right"><span class="metric-cell__value">${stockTotal}</span></td>
      <td><span class="status-badge status-badge--success">Operativa</span></td>
      <td>${b.encargado?.username ?? 'Sin asignar'}</td>
      <td class="is-center">
        <div class="row-actions row-actions--center">
          <button class="row-action-btn" type="button" data-action="inventario" title="Ver inventario"><span class="material-symbols-outlined">inventory_2</span></button>
          <button class="row-action-btn" type="button" data-action="edit" title="Editar"><span class="material-symbols-outlined">edit</span></button>
          <button class="row-action-btn row-action-btn--danger" type="button" data-action="delete" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  adjuntarEventosFilasBodega();
}

function initBusquedaBodegas() {
  const inputs = document.querySelectorAll('#bodega-search, #bodega-search-desktop, #bodega-search-mobile');
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      const filtradas = todasLasBodegas.filter((b) => {
        const idStr = `bod-${b.id}`.toLowerCase();
        const nom = (b.nombre || '').toLowerCase();
        const ubi = (b.ubicacion || '').toLowerCase();
        const enc = (b.encargado?.username || '').toLowerCase();
        return idStr.includes(q) || nom.includes(q) || ubi.includes(q) || enc.includes(q);
      });
      iniciarPaginacionBodegas(filtradas);
    });
  });
}

async function cargarEncargados() {
  const select = document.getElementById('bodega-encargado');
  if (!select) return;
  try {
    const usuarios = await apiFetch('/api/usuarios');
    select.innerHTML = '<option value="" disabled selected>Selecciona un encargado...</option>' +
      usuarios.map((u) => `<option value="${u.id}">${u.username}</option>`).join('');
  } catch (err) {
    console.error('Error cargando encargados:', err);
  }
}

function adjuntarEventosFilasBodega() {
  document.querySelectorAll('#bodegas-tbody [data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      abrirModalBodega('edit', row.dataset);
    });
  });
  document.querySelectorAll('#bodegas-tbody [data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const confirmado = await UIKit.confirmDialog({
        title: '⚠️ Eliminar bodega',
        message: `<div style="margin-bottom: 12px;"><strong>¿Está seguro que desea eliminar "${row.dataset.name}"?</strong></div>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; font-size: 0.875rem;">
          <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle; color: #856404;">warning</span>
          <strong style="color: #856404;">Advertencia:</strong><br>
          <span style="color: #856404;">Esta acción eliminará permanentemente esta bodega y <strong>todos los datos asociados</strong>:</span>
          <ul style="margin: 6px 0 0 16px; padding: 0; color: #856404;">
            <li>Inventario de productos en esta bodega</li>
            <li>Referencias en movimientos de inventario</li>
            <li>Posibles inconsistencias en reportes históricos</li>
          </ul>
          <span style="color: #d32f2f; font-weight: 600;">⚠️ Esta acción NO se puede deshacer.</span>
        </div>`,
        confirmText: 'Eliminar permanentemente',
        danger: true,
      });
      if (!confirmado) return;
      try {
        await apiFetch(`/api/bodegas/${row.dataset.id}`, { method: 'DELETE' });
        row.remove();
        todasLasBodegas = todasLasBodegas.filter((b) => b.id != row.dataset.id);
        UIKit.toast('Bodega eliminada correctamente.', 'success');
      } catch (err) {
        UIKit.toast(err.message, 'error');
      }
    });
  });
  document.querySelectorAll('#bodegas-tbody [data-action="inventario"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      const bodegaId = row.dataset.id;
      const bodegaNombre = row.dataset.name;
      abrirModalInventarioBodega(bodegaId, bodegaNombre);
    });
  });
}

async function abrirModalInventarioBodega(bodegaId, bodegaNombre) {
  const backdrop = document.getElementById('inventario-modal-backdrop');
  if (!backdrop) return;

  // Mostrar info básica
  document.getElementById('inventario-modal-title').textContent = `Inventario: ${bodegaNombre}`;
  document.querySelector('#inventario-bodega-nombre span:last-child').textContent = bodegaNombre;
  document.querySelector('#inventario-total-productos span:last-child').textContent = 'Cargando...';
  document.querySelector('#inventario-stock-total span:last-child').textContent = 'Cargando...';

  // Mostrar loading en tabla
  const tbody = document.getElementById('inventario-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="is-center cell-muted">Cargando inventario...</td></tr>';

  backdrop.classList.add('is-open');

  try {
    const inventario = await apiFetch(`/api/bodegas/${bodegaId}/inventario`);

    if (!Array.isArray(inventario) || inventario.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="is-center cell-muted">No hay productos en esta bodega.</td></tr>';
      document.querySelector('#inventario-total-productos span:last-child').textContent = '0 productos';
      document.querySelector('#inventario-stock-total span:last-child').textContent = '0 unidades';
      return;
    }

    let totalProductos = 0;
    let totalUnidades = 0;

    tbody.innerHTML = inventario.map((inv) => {
      const cantidad = inv.stock || 0;
      const precio = inv.producto?.precio || 0;
      const valorTotal = (cantidad * Number(precio)).toFixed(2);
      totalProductos++;
      totalUnidades += cantidad;

      return `
        <tr>
          <td class="metric-cell__value">PRD-${inv.producto?.id || '?'}</td>
          <td class="product-cell__name">${inv.producto?.nombre || 'Producto desconocido'}</td>
          <td class="cell-muted">${inv.producto?.categoria || '-'}</td>
          <td class="is-right"><span class="metric-cell__value">${cantidad}</span></td>
          <td class="is-right"><span class="metric-cell__value">$${Number(precio).toFixed(2)}</span></td>
          <td class="is-right"><span class="metric-cell__value">$${valorTotal}</span></td>
        </tr>`;
    }).join('');

    document.querySelector('#inventario-total-productos span:last-child').textContent = `${totalProductos} productos`;
    document.querySelector('#inventario-stock-total span:last-child').textContent = `${totalUnidades} unidades`;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="is-center cell-muted">Error al cargar inventario: ${err.message}</td></tr>`;
    UIKit.toast('Error al cargar inventario de la bodega', 'error');
  }
}

let bodegaIdEditando = null;

function abrirModalBodega(mode, data) {
  bodegaIdEditando = mode === 'edit' ? data.id : null;
  const form = document.getElementById('bodega-form');
  if (!form) return;
  form.reset();
  document.getElementById('bodega-modal-title').textContent =
    mode === 'edit' ? 'Editar Bodega' : 'Crear Nueva Bodega';
  if (data) {
    form.elements.nombre.value = data.name || '';
    form.elements.ubicacion.value = data.location || '';
    form.elements.capacidad.value = data.capacity || '';
    if (data.encargadoId) form.elements.encargado.value = data.encargadoId;
  }
  document.getElementById('bodega-modal-backdrop')?.classList.add('is-open');
}

function abrirProductoModal(mode, data) {
  const form = document.getElementById('product-form');
  form.reset();
  const isEdit = mode === 'edit';
  document.getElementById('product-modal-title').textContent =
    isEdit ? 'Editar Producto' : 'Nuevo Producto';
  if (data) {
    form.elements.nombre.value = data.name || '';
    form.elements.categoria.value = data.category || '';
    form.elements.precio.value = data.price || '';
  }
  document.getElementById('product-modal-backdrop')?.classList.add('is-open');

  // Cargar bodegas para distribucion de stock
  // En edicion: readonly=true para deshabilitar los campos de stock
  cargarBodegasParaDistribucion(isEdit ? data?.id : null, isEdit);
}



async function cargarBodegasParaDistribucion(productoId, readonly) {
    const container = document.getElementById('stock-distribucion-container');
    const totalInput = document.getElementById('product-stock-total');
    if (!container) return;

    try {
        const bodegas = await apiFetch('/api/bodegas');
        let inventarios = [];

        // Si estamos editando, cargar inventario actual
        if (productoId) {
            try {
                const productoConInv = await apiFetch(`/api/productos/${productoId}/con-inventario`);
                inventarios = productoConInv.distribucionStock || [];
            } catch(e) { /* ignorar */ }
        }

        // En modo edicion, los campos de stock se muestran como readonly
        const disabledAttr = readonly ? 'disabled' : '';
        const readonlyClass = readonly ? ' stock-input--readonly' : '';

        // Mostrar mensaje si es edicion
        if (readonly) {
            container.innerHTML = `
                <div class="form-help-text" style="margin-bottom: 12px; padding: 8px 12px; background: #fef9e7; border-radius: 6px; border-left: 3px solid #f0ad4e;">
                    <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">info</span>
                    El stock solo se asigna al crear el producto. Para modificarlo, use los movimientos de inventario.
                </div>
            `;
        }

        container.innerHTML += bodegas.map(b => {
            const inv = inventarios.find(i => Number(i.bodegaId) === Number(b.id));
            const cantidad = inv ? inv.stockTotal : 0;
            return `
                <div class="form-grid-2" style="margin-bottom: 8px; align-items: center;">
                    <label class="form-label" style="margin:0; font-weight:500;">${b.nombre}</label>
                    <input class="form-input form-input--mono stock-bodega-input${readonlyClass}" 
                           type="number" min="0" value="${cantidad}" 
                           data-bodega-id="${b.id}" data-bodega-nombre="${b.nombre}"
                           placeholder="Stock en ${b.nombre}" ${disabledAttr}>
                </div>
            `;
        }).join('');

        // En creacion, calcular stock total automaticamente
        if (!readonly) {
            container.querySelectorAll('.stock-bodega-input').forEach(input => {
                input.addEventListener('input', calcularStockTotalDistribucion);
            });
        }
        calcularStockTotalDistribucion();

    } catch (err) {
        container.innerHTML = '<p class="cell-muted">Error al cargar bodegas: ' + err.message + '</p>';
    }
}

function calcularStockTotalDistribucion() {
    const totalInput = document.getElementById('product-stock-total');
    if (!totalInput) return;
    const inputs = document.querySelectorAll('.stock-bodega-input');
    let total = 0;
    inputs.forEach(input => {
        total += Number(input.value) || 0;
    });
    totalInput.value = total;
}

document.getElementById('open-create-modal-btn')?.addEventListener('click', () => {
  abrirModalBodega('create', null);
});

document.getElementById('open-create-product-modal-btn')?.addEventListener('click', () => {
  productoIdEditando = null;
  abrirProductoModal('create', null);
});

document.getElementById('bodega-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = {
    nombre: form.elements.nombre.value,
    ubicacion: form.elements.ubicacion.value,
    capacidad: Number(form.elements.capacidad.value),
    encargado: { id: Number(form.elements.encargado.value) },
  };

  try {
    if (bodegaIdEditando) {
      await apiFetch(`/api/bodegas/${bodegaIdEditando}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/bodegas', { method: 'POST', body: JSON.stringify(payload) });
    }
    document.getElementById('bodega-modal-backdrop')?.classList.remove('is-open');
    cargarBodegas();
    UIKit.toast(bodegaIdEditando ? 'Bodega actualizada correctamente.' : 'Bodega creada correctamente.', 'success');
  } catch (err) {
    UIKit.toast(err.message, 'error');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  cargarBodegas();
  cargarEncargados();
});

/* ============================================================================
   Productos (listado + filtros combinados + modal crear/editar + eliminar)
   ============================================================================ */
let todosLosProductos = [];
let productosPaginacion = null;

async function cargarProductos() {
  const tbody = document.querySelector('#products-table tbody');
  if (!tbody) return;
  protegerRuta();

  // Revisar si viene ?stockBajo=true en la URL
  const params = new URLSearchParams(window.location.search);
  const lowStockCheckbox = document.getElementById('product-low-stock-filter');
  if (params.get('stockBajo') === 'true' && lowStockCheckbox) {
    lowStockCheckbox.checked = true;
  }

  try {
    todosLosProductos = await apiFetch('/api/productos');
    iniciarPaginacionProductos();
    initEventosFiltroProductos();
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

function iniciarPaginacionProductos() {
  const tbody = document.querySelector('#products-table tbody');
  const emptyState = document.getElementById('products-empty-state');
  if (!tbody) return;

  // Obtener datos filtrados
  const searchInputDesktop = document.getElementById('product-search-desktop');
  const searchInputMobile = document.getElementById('product-search-mobile');
  const categorySelect = document.getElementById('product-category-filter');
  const lowStockCheckbox = document.getElementById('product-low-stock-filter');

  const query = (searchInputDesktop?.value || searchInputMobile?.value || '').toLowerCase().trim();
  const categoria = (categorySelect?.value || '').toLowerCase();
  const soloStockBajo = Boolean(lowStockCheckbox?.checked);

  const filtrados = todosLosProductos.filter((p) => {
    const pIdStr = `prd-${p.id}`.toLowerCase();
    const pNombre = (p.nombre || '').toLowerCase();
    const pCat = (p.categoria || '').toLowerCase();
    const coincideBusqueda = !query || pIdStr.includes(query) || pNombre.includes(query) || pCat.includes(query);
    const coincideCategoria = !categoria || pCat === categoria;
    const coincideStockBajo = !soloStockBajo || p.stock < 10;
    return coincideBusqueda && coincideCategoria && coincideStockBajo;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    // Ocultar paginación
    const pagination = document.getElementById('productos-pagination');
    if (pagination) pagination.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  const pagination = document.getElementById('productos-pagination');
  if (pagination) pagination.style.display = '';

  if (productosPaginacion) productosPaginacion = null;
  productosPaginacion = initPaginacion({
    data: filtrados,
    pageSize: 5,
    renderFn: (slice) => renderProductos(slice),
    infoId: 'productos-pagination-info',
    prevBtnId: 'productos-prev-btn',
    nextBtnId: 'productos-next-btn',
    pageNumbersId: 'productos-page-numbers',
  });
}

function renderProductos(productos) {
  const tbody = document.querySelector('#products-table tbody');
  if (!tbody) return;

  if (productos.length === 0) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = productos.map((p) => `
    <tr data-id="${p.id}" data-name="${p.nombre}" data-category="${p.categoria ?? ''}"
        data-stock="${p.stock}" data-price="${p.precio}" class="${p.stock < 10 ? 'is-low-stock' : ''}">
      <td class="metric-cell__value">PRD-${p.id}</td>
      <td class="product-cell__name">${p.nombre}</td>
      <td class="cell-muted">${p.categoria ?? '-'}</td>
      <td class="is-right">${p.stock < 10
        ? `<span class="stock-badge"><span class="material-symbols-outlined">warning</span>${p.stock}</span>`
        : `<span class="metric-cell__value">${p.stock}</span>`}</td>
      <td class="is-right"><span class="metric-cell__value">$${Number(p.precio).toFixed(2)}</span></td>
      <td class="is-center">
        <div class="row-actions row-actions--center">
          <button class="row-action-btn" type="button" data-action="edit" title="Editar"><span class="material-symbols-outlined">edit</span></button>
          <button class="row-action-btn row-action-btn--danger" type="button" data-action="delete" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
        </div>
      </td>
    </tr>`).join('');

  adjuntarEventosFilasProducto();
}

function initEventosFiltroProductos() {
  const searchDesktop = document.getElementById('product-search-desktop');
  const searchMobile = document.getElementById('product-search-mobile');
  const catSelect = document.getElementById('product-category-filter');
  const lowStockCheck = document.getElementById('product-low-stock-filter');

  const handler = () => iniciarPaginacionProductos();

  searchDesktop?.addEventListener('input', handler);
  searchMobile?.addEventListener('input', handler);
  catSelect?.addEventListener('change', handler);
  lowStockCheck?.addEventListener('change', handler);
}

function adjuntarEventosFilasProducto() {
  document.querySelectorAll('#products-table [data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const confirmado = await UIKit.confirmDialog({
        title: '⚠️ Eliminar producto',
        message: `<div style="margin-bottom: 12px;"><strong>¿Está seguro que desea eliminar "${row.dataset.name}"?</strong></div>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; font-size: 0.875rem;">
          <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle; color: #856404;">warning</span>
          <strong style="color: #856404;">Advertencia:</strong><br>
          <span style="color: #856404;">Esta acción eliminará permanentemente este producto y <strong>todos los datos asociados</strong>:</span>
          <ul style="margin: 6px 0 0 16px; padding: 0; color: #856404;">
            <li>Inventario del producto en todas las bodegas</li>
            <li>Detalles en movimientos de inventario</li>
            <li>Posibles inconsistencias en reportes históricos</li>
          </ul>
          <span style="color: #d32f2f; font-weight: 600;">⚠️ Esta acción NO se puede deshacer.</span>
        </div>`,
        confirmText: 'Eliminar permanentemente',
        danger: true,
      });
      if (!confirmado) return;
      try {
        await apiFetch(`/api/productos/${row.dataset.id}`, { method: 'DELETE' });
        row.remove();
        todosLosProductos = todosLosProductos.filter((p) => p.id != row.dataset.id);
        iniciarPaginacionProductos();
        UIKit.toast('Producto eliminado correctamente.', 'success');
      } catch (err) {
        UIKit.toast(err.message, 'error');
      }
    });
  });
  document.querySelectorAll('#products-table [data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      productoIdEditando = row.dataset.id;
      abrirProductoModal('edit', {
        name: row.dataset.name, category: row.dataset.category,
        stock: row.dataset.stock, price: row.dataset.price,
      });
    });
  });
}

let productoIdEditando = null;

document.getElementById('product-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = {
    nombre: form.elements.nombre.value,
    categoria: form.elements.categoria.value,
    stock: 0,
    precio: Number(form.elements.precio.value),
  };

  try {
    if (productoIdEditando) {
      // En edicion solo se envian nombre, categoria y precio (sin stock)
      await apiFetch(`/api/productos/${productoIdEditando}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      // En creacion se envia producto + distribucion de stock por bodega
      const stockPorBodega = {};
      document.querySelectorAll('.stock-bodega-input').forEach(input => {
        const cantidad = Number(input.value) || 0;
        if (cantidad > 0) {
          stockPorBodega[input.dataset.bodegaId] = cantidad;
        }
      });
      await apiFetch('/api/productos/con-inventario', {
        method: 'POST',
        body: JSON.stringify({ producto: payload, stockPorBodega })
      });
    }
    document.getElementById('product-modal-backdrop')?.classList.remove('is-open');
    productoIdEditando = null;
    cargarProductos();
    UIKit.toast(productoIdEditando ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.', 'success');
  } catch (err) {
    UIKit.toast(err.message, 'error');
  }
});

document.addEventListener('DOMContentLoaded', cargarProductos);

/* ============================================================================
   Movimientos (Historial + Filtros)
   ============================================================================ */
let todosLosMovimientos = [];
let movimientosPaginacion = null;

async function cargarMovimientos() {
  const tbody = document.getElementById('movimientos-tbody');
  if (!tbody) return;
  protegerRuta();

  try {
    todosLosMovimientos = await apiFetch('/api/movimientos');
    await cargarBodegasParaFiltroMovimientos();
    iniciarPaginacionMovimientos();
    initEventosFiltroMovimientos();
  } catch (err) {
    console.error('Error cargando movimientos:', err);
  }
}

async function cargarBodegasParaFiltroMovimientos() {
  const select = document.getElementById('mov-bodega');
  if (!select) return;

  try {
    const bodegas = await apiFetch('/api/bodegas');
    select.innerHTML = '<option value="">Todas las Bodegas</option>' +
      bodegas.map((b) => `<option value="${b.id}">${b.nombre}</option>`).join('');
  } catch (err) {
    console.error('Error cargando bodegas para filtro:', err);
  }
}

function obtenerMovimientosFiltrados() {
  const fechaDesde = document.getElementById('mov-fecha-desde')?.value;
  const fechaHasta = document.getElementById('mov-fecha-hasta')?.value;
  const tipo = document.getElementById('mov-tipo')?.value;
  const bodegaId = document.getElementById('mov-bodega')?.value;

  return todosLosMovimientos.filter((m) => {
    let coincideFecha = true;
    if (fechaDesde) {
      coincideFecha = coincideFecha && new Date(m.fecha) >= new Date(`${fechaDesde}T00:00:00`);
    }
    if (fechaHasta) {
      coincideFecha = coincideFecha && new Date(m.fecha) <= new Date(`${fechaHasta}T23:59:59`);
    }

    const coincideTipo = !tipo || m.tipoMovimiento === tipo;
    const coincideBodega = !bodegaId ||
      String(m.bodegaOrigen?.id) === String(bodegaId) ||
      String(m.bodegaDestino?.id) === String(bodegaId);

    return coincideFecha && coincideTipo && coincideBodega;
  });
}

function iniciarPaginacionMovimientos() {
  const tbody = document.getElementById('movimientos-tbody');
  if (!tbody) return;

  const filtrados = obtenerMovimientosFiltrados();

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="is-center cell-muted" style="padding: 2rem;">No se encontraron movimientos con los filtros seleccionados.</td></tr>`;
    const pagination = document.getElementById('movimientos-pagination');
    if (pagination) pagination.style.display = 'none';
    return;
  }

  const pagination = document.getElementById('movimientos-pagination');
  if (pagination) pagination.style.display = '';

  if (movimientosPaginacion) movimientosPaginacion = null;
  movimientosPaginacion = initPaginacion({
    data: filtrados,
    pageSize: 5,
    renderFn: (slice) => renderMovimientos(slice),
    infoId: 'movimientos-pagination-info',
    prevBtnId: 'movimientos-prev-btn',
    nextBtnId: 'movimientos-next-btn',
    pageNumbersId: 'movimientos-page-numbers',
  });
}

function renderMovimientos(movimientos) {
  const tbody = document.getElementById('movimientos-tbody');
  if (!tbody) return;

  if (movimientos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="is-center cell-muted" style="padding: 2rem;">No se encontraron movimientos.</td></tr>`;
    return;
  }

  tbody.innerHTML = movimientos.map((m) => `
    <tr>
      <td class="cell-muted">${new Date(m.fecha).toLocaleString('es-CO')}</td>
      <td><span class="status-badge ${badgeClasePorTipo(m.tipoMovimiento)}">${m.tipoMovimiento}</span></td>
      <td>${m.usuario?.username ?? '-'}</td>
      <td class="product-cell__name">${m.bodegaOrigen?.nombre ?? '-'}</td>
      <td class="product-cell__name">${m.bodegaDestino?.nombre ?? '-'}</td>
      <td class="is-right"><span class="metric-cell__value">${sumarCantidades(m.detalles)} un.</span></td>
      <td class="is-center"><button class="row-action-btn" type="button"><span class="material-symbols-outlined">more_vert</span></button></td>
    </tr>`).join('');
}

function initEventosFiltroMovimientos() {
  const desde = document.getElementById('mov-fecha-desde');
  const hasta = document.getElementById('mov-fecha-hasta');
  const tipo = document.getElementById('mov-tipo');
  const bodega = document.getElementById('mov-bodega');

  const handler = async () => {
    if (desde?.value && hasta?.value) {
      try {
        const d = `${desde.value}T00:00:00`;
        const h = `${hasta.value}T23:59:59`;
        todosLosMovimientos = await apiFetch(`/api/movimientos/rango?desde=${d}&hasta=${h}`);
      } catch (err) {
        console.error('Error al consultar rango de fechas:', err);
      }
    }
    iniciarPaginacionMovimientos();
  };

  desde?.addEventListener('change', handler);
  hasta?.addEventListener('change', handler);
  tipo?.addEventListener('change', handler);
  bodega?.addEventListener('change', handler);
}

function badgeClasePorTipo(tipo) {
  return { ENTRADA: 'status-badge--success', SALIDA: 'status-badge--danger', TRANSFERENCIA: 'status-badge--info' }[tipo] || '';
}

function sumarCantidades(detalles) {
  return (detalles || []).reduce((acc, d) => acc + d.cantidad, 0);
}

document.addEventListener('DOMContentLoaded', cargarMovimientos);

/* ============================================================================
   Registrar Movimiento
   ============================================================================ */
async function initNuevoMovimientoReal() {
  const form = document.getElementById('movement-form');
  if (!form) return;
  protegerRuta();

  const inputFecha = document.getElementById('fecha');
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }

  // 1. Llenar selects de bodega con datos reales
  try {
    const bodegas = await apiFetch('/api/bodegas');
    const opciones = bodegas.map((b) => `<option value="${b.id}">${b.nombre}</option>`).join('');
    const selectOrigen = document.getElementById('bodega-origen');
    const selectDestino = document.getElementById('bodega-destino');
    if (selectOrigen) {
      selectOrigen.innerHTML = '<option value="" disabled selected>Seleccione origen...</option>' + opciones;
    }
    if (selectDestino) {
      selectDestino.innerHTML = '<option value="" disabled selected>Seleccione destino...</option>' + opciones;
    }
  } catch (err) {
    console.error('Error cargando bodegas para movimiento:', err);
  }

  // 2. Guardar productos reales para usarlos al agregar filas
  try {
    window.__productosDisponibles = await apiFetch('/api/productos');
  } catch (err) {
    console.error('Error cargando productos para movimiento:', err);
  }

  // 3. Mostrar el usuario logueado real
  const usuarioActual = getUsuarioActual();
  const inputUsuario = document.getElementById('usuario');
  if (inputUsuario && usuarioActual) inputUsuario.value = usuarioActual.username;

  // 4. Conectar selector de tipo de movimiento con visualización de bodegas
  const typeSelect = document.getElementById('movement-type');
  const warehouseSection = document.getElementById('warehouse-section');
  const origenContainer = document.getElementById('bodega-origen-container');
  const destinoContainer = document.getElementById('bodega-destino-container');
  const origenSelect = document.getElementById('bodega-origen');
  const destinoSelect = document.getElementById('bodega-destino');

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      const val = typeSelect.value;
      if (!val) {
        if (warehouseSection) warehouseSection.classList.add('hidden');
        return;
      }
      if (warehouseSection) warehouseSection.classList.remove('hidden');

      if (val === 'ENTRADA') {
        if (origenContainer) origenContainer.classList.add('hidden');
        if (destinoContainer) destinoContainer.classList.remove('hidden');
        if (origenSelect) origenSelect.required = false;
        if (destinoSelect) destinoSelect.required = true;
      } else if (val === 'SALIDA') {
        if (origenContainer) origenContainer.classList.remove('hidden');
        if (destinoContainer) destinoContainer.classList.add('hidden');
        if (origenSelect) origenSelect.required = true;
        if (destinoSelect) destinoSelect.required = false;
      } else if (val === 'TRANSFERENCIA') {
        if (origenContainer) origenContainer.classList.remove('hidden');
        if (destinoContainer) destinoContainer.classList.remove('hidden');
        if (origenSelect) origenSelect.required = true;
        if (destinoSelect) destinoSelect.required = true;
      }
    });
  }

  // 5. Botón agregar producto
  const btnAdd = document.getElementById('btn-add-product');
  const tbody = document.getElementById('products-tbody');
  const emptyState = document.getElementById('empty-state');

  if (btnAdd && tbody) {
    btnAdd.addEventListener('click', () => {
      if (emptyState) emptyState.classList.remove('is-visible');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="select-wrapper">
            <select class="form-select" required>
              <option value="" disabled selected>Seleccionar producto...</option>
              ${opcionesProductosHTML()}
            </select>
            <span class="material-symbols-outlined">expand_more</span>
          </div>
        </td>
        <td>
          <input class="form-input" type="number" min="1" value="1" required style="width: 100px;">
        </td>
        <td class="is-center">
          <button class="row-action-btn row-action-btn--danger btn-remove-row" type="button">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      `;

      tr.querySelector('.btn-remove-row')?.addEventListener('click', () => {
        tr.remove();
        if (tbody.children.length === 0 && emptyState) {
          emptyState.classList.add('is-visible');
        }
      });

      tbody.appendChild(tr);
    });
  }
}

function opcionesProductosHTML() {
  return (window.__productosDisponibles || [])
    .map((p) => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

document.getElementById('movement-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const filas = Array.from(document.querySelectorAll('#products-tbody tr'));
  if (filas.length === 0) { UIKit.toast('Debes agregar al menos un producto.', 'warning'); return; }

  const detalles = filas.map((row) => ({
    producto: { id: Number(row.querySelector('select').value) },
    cantidad: Number(row.querySelector('input[type="number"]').value),
  }));

  const usuarioActual = getUsuarioActual();
  const tipo = document.getElementById('movement-type').value;

  const payload = {
    tipoMovimiento: tipo,
    usuario: { id: usuarioActual.id },
    detalles,
  };
  if (tipo === 'ENTRADA' || tipo === 'TRANSFERENCIA') {
    payload.bodegaDestino = { id: Number(document.getElementById('bodega-destino').value) };
  }
  if (tipo === 'SALIDA' || tipo === 'TRANSFERENCIA') {
    payload.bodegaOrigen = { id: Number(document.getElementById('bodega-origen').value) };
  }

  try {
    await apiFetch('/api/movimientos', { method: 'POST', body: JSON.stringify(payload) });
    UIKit.toast('Movimiento guardado con éxito.', 'success');
    window.location.href = 'movimientos.html';
  } catch (err) {
    UIKit.toast(err.message, 'error');
  }
});




  /* ============================================================================
   Auditoría (Historial + Filtros + Paginación)
   ============================================================================ */
let todasLasAuditorias = [];
let auditoriasPaginacion = null;

async function cargarAuditorias() {
  const tbody = document.querySelector('#audit-table tbody');
  if (!tbody) return;
  protegerRuta();
  protegerRutaAdmin();

  try {
    todasLasAuditorias = await apiFetch('/api/auditorias');
    poblarFiltroUsuariosAuditoria();
    filtrarYRenderizarAuditorias();
    initEventosFiltroAuditoria();
  } catch (err) {
    console.error('Error cargando auditorías:', err);
  }
}

function poblarFiltroUsuariosAuditoria() {
  const select = document.getElementById('audit-user-filter');
  if (!select) return;
  const usuariosUnicos = [...new Map(
    todasLasAuditorias.filter((a) => a.usuario).map((a) => [a.usuario.id, a.usuario])
  ).values()];

  select.innerHTML = '<option value="">Todos los usuarios</option>' +
    usuariosUnicos.map((u) => `<option value="${u.id}">${u.username}</option>`).join('');
}

function filtrarYRenderizarAuditorias() {
  const tbody = document.querySelector('#audit-table tbody');
  if (!tbody) return;

  const searchInput = (document.getElementById('audit-search-input')?.value || '').toLowerCase().trim();
  const userId = document.getElementById('audit-user-filter')?.value || '';
  const opType = document.getElementById('audit-op-filter')?.value || '';
  const entityType = document.getElementById('audit-entity-filter')?.value || '';

  const filtradas = todasLasAuditorias.filter((a) => {
    const userStr = (a.usuario?.username || 'Sistema').toLowerCase();
    const entityStr = (a.entidadAfectada || '').toLowerCase();
    const coincideSearch = !searchInput || userStr.includes(searchInput) || entityStr.includes(searchInput);
    const coincideUser = !userId || String(a.usuario?.id) === String(userId);
    const coincideOp = !opType || a.tipoOperacion === opType;
    const coincideEntity = !entityType || a.entidadAfectada === entityType;
    return coincideSearch && coincideUser && coincideOp && coincideEntity;
  });

  const pagination = document.getElementById('auditorias-pagination');

  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="is-center cell-muted" style="padding: 2rem;">No hay registros de auditoría que coincidan con los filtros.</td></tr>`;
    if (pagination) pagination.style.display = 'none';
    return;
  }

  if (pagination) pagination.style.display = '';

  auditoriasPaginacion = initPaginacion({
    data: filtradas,
    pageSize: 5,
    renderFn: (slice) => renderAuditorias(slice),
    infoId: 'auditorias-pagination-info',
    prevBtnId: 'auditorias-prev-btn',
    nextBtnId: 'auditorias-next-btn',
    pageNumbersId: 'auditorias-page-numbers',
  });
}

function renderAuditorias(auditorias) {
  const tbody = document.querySelector('#audit-table tbody');
  if (!tbody) return;

  tbody.innerHTML = auditorias.map((a) => `
    <tr>
      <td><span class="status-badge ${badgeClasePorOperacion(a.tipoOperacion)}">${a.tipoOperacion}</span></td>
      <td class="cell-mono">${new Date(a.fechaHora).toLocaleString('es-CO')}</td>
      <td>
        <div class="user-cell">
          <div class="avatar avatar--sm">${(a.usuario?.username || 'SY').slice(0, 2).toUpperCase()}</div>
          <span>${a.usuario?.username ?? 'Sistema'}</span>
        </div>
      </td>
      <td>
        <div class="entity-cell">
          <span class="entity-cell__title">${a.entidadAfectada}</span>
          <span class="entity-cell__subtitle">ID: ${a.entidadId ?? '-'}</span>
        </div>
      </td>
      <td class="is-right">
        <button class="row-action-btn" type="button" data-action="view" title="Ver detalle"
                data-anteriores='${escapeAttr(a.valoresAnteriores ?? "")}' data-nuevos='${escapeAttr(a.valoresNuevos ?? "")}'
                data-entidad="${a.entidadAfectada}" data-operacion="${a.tipoOperacion}"
                data-usuario="${a.usuario?.username || 'Sistema'}" data-fecha="${new Date(a.fechaHora).toLocaleString('es-CO')}"
                data-entidad-id="${a.entidadId ?? ''}">
          <span class="material-symbols-outlined">visibility</span>
        </button>
      </td>
    </tr>`).join('');

  document.querySelectorAll('#audit-table [data-action="view"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      abrirModalAuditoriaFormateado(btn.dataset);
    });
  });
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '"').replace(/'/g, '&#39;').replace(/</g, '<').replace(/>/g, '>');
}

function abrirModalAuditoriaFormateado(data) {
  const backdrop = document.getElementById('audit-modal-backdrop');
  if (!backdrop) return;

  // Establecer título y subtítulo
  document.getElementById('audit-modal-title').textContent = `Detalle: ${data.operacion} en ${data.entidad}`;
  const subtitle = document.getElementById('audit-modal-subtitle');
  if (subtitle) {
    subtitle.textContent = `${data.fecha} - por ${data.usuario} - ID Entidad: ${data.entidadId || '-'}`;
  }

  // Badges de información
  const badgesContainer = document.getElementById('audit-modal-badges');
  if (badgesContainer) {
    badgesContainer.innerHTML = `
      <span class="info-badge">
        <span class="material-symbols-outlined icon-sm">${data.operacion === 'INSERT' ? 'add_circle' : data.operacion === 'DELETE' ? 'remove_circle' : 'edit'}</span>
        <span>${data.operacion}</span>
      </span>
      <span class="info-badge info-badge--accent">
        <span class="material-symbols-outlined icon-sm">dataset</span>
        <span>${data.entidad}</span>
      </span>
      <span class="info-badge info-badge--accent">
        <span class="material-symbols-outlined icon-sm">badge</span>
        <span>ID: ${data.entidadId || '-'}</span>
      </span>
      <span class="info-badge">
        <span class="material-symbols-outlined icon-sm">person</span>
        <span>${data.usuario}</span>
      </span>
      <span class="info-badge">
        <span class="material-symbols-outlined icon-sm">schedule</span>
        <span>${data.fecha}</span>
      </span>
    `;
  }

  // Parsear los JSON de valores anteriores y nuevos
  const anteriores = parseJsonSeguro(data.anteriores);
  const nuevos = parseJsonSeguro(data.nuevos);

  const contentContainer = document.getElementById('audit-modal-content');
  if (!contentContainer) return;

  // Para INSERT solo mostrar valores nuevos
  if (data.operacion === 'INSERT' && nuevos) {
    contentContainer.innerHTML = `
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="padding: 0.75rem 1rem; background: #f5f5f5; font-weight: 600; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 0.5rem;">
          <span class="material-symbols-outlined icon-sm">add_circle</span>
          Valores registrados (nuevos)
        </div>
        <div style="padding: 0;">
          ${renderObjetoTabla(nuevos, 'added')}
        </div>
      </div>`;
  }
  // Para DELETE solo mostrar valores anteriores
  else if (data.operacion === 'DELETE' && anteriores) {
    contentContainer.innerHTML = `
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="padding: 0.75rem 1rem; background: #f5f5f5; font-weight: 600; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 0.5rem;">
          <span class="material-symbols-outlined icon-sm">remove_circle</span>
          Valores eliminados (anteriores)
        </div>
        <div style="padding: 0;">
          ${renderObjetoTabla(anteriores, 'removed')}
        </div>
      </div>`;
  }
  // Para UPDATE mostrar comparación lado a lado
  else if (data.operacion === 'UPDATE') {
    const diffRows = generarDiffRows(anteriores, nuevos);
    contentContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 0.75rem 1rem; background: #fff3e0; font-weight: 600; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 0.5rem;">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Valores anteriores
          </div>
          <div style="padding: 0;">
            ${anteriores ? renderObjetoTabla(anteriores, 'removed') : '<div style="padding: 1rem; color: #999;">(vacío)</div>'}
          </div>
        </div>
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 0.75rem 1rem; background: #e8f5e9; font-weight: 600; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 0.5rem;">
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
            Valores nuevos
          </div>
          <div style="padding: 0;">
            ${nuevos ? renderObjetoTabla(nuevos, 'added') : '<div style="padding: 1rem; color: #999;">(vacío)</div>'}
          </div>
        </div>
      </div>
      ${diffRows.length > 0 ? `
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 0.75rem 1rem; background: #f5f5f5; font-weight: 600; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 0.5rem;">
            <span class="material-symbols-outlined icon-sm">compare_arrows</span>
            Resumen de cambios detectados
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #fafafa;">
                <th style="padding: 0.75rem 1rem; text-align: left; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Campo</th>
                <th style="padding: 0.75rem 1rem; text-align: left; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Anterior</th>
                <th style="padding: 0.75rem 1rem; text-align: left; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Nuevo</th>
              </tr>
            </thead>
            <tbody>
              ${diffRows.map(r => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 0.75rem 1rem; font-weight: 500;">${r.campo}</td>
                  <td style="padding: 0.75rem 1rem; color: #d32f2f;">${r.anterior}</td>
                  <td style="padding: 0.75rem 1rem; color: #2e7d32; font-weight: 600;">${r.nuevo}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}
    `;
  } else {
    contentContainer.innerHTML = '<div style="padding: 1rem; color: #999;">No hay datos disponibles para mostrar.</div>';
  }

  backdrop.classList.add('is-open');
}

function parseJsonSeguro(str) {
  if (!str || str === 'null' || str === 'undefined') return null;
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return { valor: parsed };
  } catch {
    return str ? { valor: str } : null;
  }
}

function renderObjetoTabla(obj, tipo) {
  if (!obj || typeof obj !== 'object') {
    return `<div style="padding: 1rem; color: #999;">${obj || '(vacío)'}</div>`;
  }

  const entries = Object.entries(obj).filter(([key]) => !key.startsWith('@'));
  
  if (entries.length === 0) return '<div style="padding: 1rem; color: #999;">(vacío)</div>';

  return `
    <table style="width: 100%; border-collapse: collapse;">
      <tbody>
        ${entries.map(([key, value]) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          const bgColor = tipo === 'added' ? '#f1f8e9' : tipo === 'removed' ? '#fff3e0' : 'transparent';
          const displayValue = formatearValor(value);
          return `
            <tr style="border-bottom: 1px solid #f0f0f0; background: ${bgColor};">
              <td style="padding: 0.75rem 1rem; color: #666; width: 40%; vertical-align: top;">${label}</td>
              <td style="padding: 0.75rem 1rem;">${displayValue}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function formatearValor(value) {
  if (value === null || value === undefined) return '<span style="color: #999;">(nulo)</span>';
  if (typeof value === 'boolean') return value ? '✅ S&iacute;' : '❌ No';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) return '<span style="color: #999;">(vac&iacute;o)</span>';
      return value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ');
    }
    if (value.id) return `#${value.id} ${value.nombre || value.username || ''}`;
    return JSON.stringify(value);
  }
  return String(value);
}

function generarDiffRows(anterior, nuevo) {
  const rows = [];
  if (!anterior || !nuevo) return rows;
  
  const allKeys = new Set([...Object.keys(anterior), ...Object.keys(nuevo)]);
  
  allKeys.forEach(key => {
    if (key.startsWith('@')) return;
    const valAnterior = anterior[key];
    const valNuevo = nuevo[key];
    
    const strAnterior = typeof valAnterior === 'object' ? JSON.stringify(valAnterior) : String(valAnterior ?? '');
    const strNuevo = typeof valNuevo === 'object' ? JSON.stringify(valNuevo) : String(valNuevo ?? '');
    
    if (strAnterior !== strNuevo) {
      rows.push({
        campo: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        anterior: formatearValorSimple(valAnterior),
        nuevo: formatearValorSimple(valNuevo)
      });
    }
  });
  
  return rows;
}

function formatearValorSimple(value) {
  if (value === null || value === undefined) return '<span style="color: #999;">(nulo)</span>';
  if (typeof value === 'object') {
    if (value && value.id) return `#${value.id} ${value.nombre || value.username || ''}`;
    return JSON.stringify(value);
  }
  return String(value);
}


function initEventosFiltroAuditoria() {
  const searchInput = document.getElementById('audit-search-input');
  const userSelect = document.getElementById('audit-user-filter');
  const opSelect = document.getElementById('audit-op-filter');
  const entitySelect = document.getElementById('audit-entity-filter');
  const exportBtn = document.getElementById('btn-export-csv');

  const handler = () => filtrarYRenderizarAuditorias();

  searchInput?.addEventListener('input', handler);
  userSelect?.addEventListener('change', handler);
  opSelect?.addEventListener('change', handler);
  entitySelect?.addEventListener('change', handler);

  exportBtn?.addEventListener('click', () => {
    if (todasLasAuditorias.length === 0) {
      UIKit.toast('No hay datos para exportar.', 'warning');
      return;
    }
    const headers = ['ID', 'Operación', 'FechaHora', 'Usuario', 'Entidad', 'EntidadID'];
    const rows = todasLasAuditorias.map((a) => [
      a.id,
      a.tipoOperacion,
      a.fechaHora,
      a.usuario?.username || 'Sistema',
      a.entidadAfectada,
      a.entidadId || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_logitrack_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

function badgeClasePorOperacion(tipo) {
  return { INSERT: 'status-badge--insert', UPDATE: 'status-badge--update', DELETE: 'status-badge--delete' }[tipo] || '';
}

function formatearJson(raw) {
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw || '(vacio)'; }
}

/* ============================================================================
   Paginación genérica cliente-side
   ============================================================================ */
function initPaginacion(config) {
  const {
    data,            // array completo de datos (ya filtrados)
    pageSize,        // items por página
    renderFn,        // función(dataSlice) que renderiza el tbody
    infoId,          // id del span con la info "Mostrando X a Y de Z"
    prevBtnId,       // id del botón anterior
    nextBtnId,       // id del botón siguiente
    pageNumbersId,   // id del div para números de página
    onPageChange,    // callback(page) opcional
  } = config;

  let paginaActual = 1;
  const totalPaginas = Math.max(1, Math.ceil(data.length / pageSize));

  function actualizar() {
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    if (paginaActual < 1) paginaActual = 1;

    const inicio = (paginaActual - 1) * pageSize;
    const fin = Math.min(inicio + pageSize, data.length);
    const slice = data.slice(inicio, fin);

    renderFn(slice);

    const infoEl = document.getElementById(infoId);
    if (infoEl) {
      infoEl.textContent = data.length === 0
        ? 'Sin registros'
        : `Mostrando ${inicio + 1} a ${fin} de ${data.length} registros`;
    }

    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    if (prevBtn) prevBtn.disabled = paginaActual <= 1;
    if (nextBtn) nextBtn.disabled = paginaActual >= totalPaginas;

    const container = document.getElementById(pageNumbersId);
    if (!container) return;
    container.innerHTML = '';

    if (totalPaginas <= 1) return;

    function crearBtnPagina(num) {
      const btn = document.createElement('button');
      btn.className = `pagination__btn${num === paginaActual ? ' is-active' : ''}`;
      btn.type = 'button';
      btn.textContent = num;
      btn.addEventListener('click', () => { paginaActual = num; actualizar(); if (onPageChange) onPageChange(paginaActual); });
      return btn;
    }

    function crearEllipsis() {
      const span = document.createElement('span');
      span.className = 'pagination__ellipsis';
      span.textContent = '…';
      return span;
    }

    const maxVisible = 5;
    let startPage = Math.max(1, paginaActual - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPaginas, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      container.appendChild(crearBtnPagina(1));
      if (startPage > 2) container.appendChild(crearEllipsis());
    }
    for (let i = startPage; i <= endPage; i++) container.appendChild(crearBtnPagina(i));
    if (endPage < totalPaginas) {
      if (endPage < totalPaginas - 1) container.appendChild(crearEllipsis());
      container.appendChild(crearBtnPagina(totalPaginas));
    }
  }

  // Clonar/reemplazar los botones prev/next elimina cualquier listener
  // que se haya quedado pegado de llamadas anteriores a initPaginacion().
  const prevBtnOriginal = document.getElementById(prevBtnId);
  const nextBtnOriginal = document.getElementById(nextBtnId);
  const prevBtn = prevBtnOriginal?.cloneNode(true) ?? null;
  const nextBtn = nextBtnOriginal?.cloneNode(true) ?? null;
  if (prevBtnOriginal && prevBtn) prevBtnOriginal.replaceWith(prevBtn);
  if (nextBtnOriginal && nextBtn) nextBtnOriginal.replaceWith(nextBtn);

  prevBtn?.addEventListener('click', () => {
    if (paginaActual > 1) { paginaActual--; actualizar(); if (onPageChange) onPageChange(paginaActual); }
  });
  nextBtn?.addEventListener('click', () => {
    if (paginaActual < totalPaginas) { paginaActual++; actualizar(); if (onPageChange) onPageChange(paginaActual); }
  });

  actualizar();

  return {
    irAPagina: (n) => { paginaActual = n; actualizar(); },
    reiniciar: () => { paginaActual = 1; actualizar(); },
  };
}

/* ============================================================================
   Registro de Empleados (Modal en Dashboard, solo ADMIN)
   ============================================================================ */
function initRegistroEmpleadoModal() {
  const backdrop = document.getElementById('empleado-modal-backdrop');
  const successBackdrop = document.getElementById('empleado-success-backdrop');
  const form = document.getElementById('empleado-form');
  const sidebarBtn = document.getElementById('sidebar-settings-btn');
  const topbarBtn = document.getElementById('topbar-settings-btn');

  // Si no estamos en dashboard.html (no existen los elementos), salir
  if (!backdrop || !form) return;

  const usuario = getUsuarioActual();

  // Si el usuario NO es ADMIN, ocultar los botones de configuración
  if (!usuario || usuario.rol !== 'ADMIN') {
    if (sidebarBtn) sidebarBtn.style.display = 'none';
    if (topbarBtn) topbarBtn.style.display = 'none';
    return;
  }

  // Abrir modal al hacer clic en cualquiera de los botones de configuración
  function abrirModal() {
    form.reset();
    backdrop.classList.add('is-open');
  }

  if (sidebarBtn) sidebarBtn.addEventListener('click', (e) => { e.preventDefault(); abrirModal(); });
  if (topbarBtn) topbarBtn.addEventListener('click', abrirModal);

  // Enviar formulario
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const submitBtn = document.getElementById('btn-registrar-empleado');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" style="width:18px;height:18px;border-color:rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin 0.7s linear infinite;"></span> Registrando...';

    try {
      await apiFetch('/api/auth/register-empleado', {
        method: 'POST',
        body: JSON.stringify({
          username: form.elements.username.value.trim(),
          email: form.elements.email.value.trim().toLowerCase(),
          password: form.elements.password.value,
        }),
      });

      // Cerrar modal de registro
      backdrop.classList.remove('is-open');

      // Mostrar modal de éxito
      document.getElementById('empleado-success-name').textContent = form.elements.username.value.trim();
      successBackdrop.classList.add('is-open');

      form.reset();
    } catch (err) {
      UIKit.toast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

document.addEventListener('DOMContentLoaded', cargarAuditorias);
