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

async function cargarDashboard() {
  const shell = document.querySelector('.kpi-grid');
  if (!shell) return; // no estamos en dashboard.html

  protegerRuta();

  try {
    const [bodegas, productos, stockBajo, resumen] = await Promise.all([
      apiFetch('/api/bodegas'),
      apiFetch('/api/productos'),
      apiFetch('/api/productos/stock-bajo?umbral=10'),
      apiFetch('/api/reportes/resumen'),
    ]);

    document.getElementById('kpi-total-bodegas').textContent = bodegas.length;
    document.getElementById('kpi-total-productos').textContent = productos.length;
    document.getElementById('kpi-stock-bajo').textContent = stockBajo.length;

    // Movimientos de "este mes" via /api/movimientos/rango
    const ahora = new Date();
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().slice(0, 19);
    const hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19);
    const movimientosMes = await apiFetch(`/api/movimientos/rango?desde=${desde}&hasta=${hasta}`);
    document.getElementById('kpi-movimientos-mes').textContent = movimientosMes.length;

    renderBarChart(resumen.stockPorBodega);
    renderTopMovidos(resumen.productosMasMovidos);
  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

function renderBarChart(stockPorBodega) {
  const contenedor = document.getElementById('bar-chart-bars');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const max = Math.max(...stockPorBodega.map((b) => Number(b.stockTotal)), 1);

  stockPorBodega.forEach((bodega) => {
    const porcentaje = Math.round((Number(bodega.stockTotal) / max) * 100);
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `
      <div class="chart-bar__fill" style="height:${porcentaje}%; --bar-height:${porcentaje}%;">
        <span class="chart-bar__tooltip">${bodega.stockTotal}</span>
      </div>
      <span class="chart-bar__label">${bodega.bodegaNombre}</span>`;
    contenedor.appendChild(div);
  });
}

function renderTopMovidos(productos) {
  const tbody = document.getElementById('top-movidos-tbody');
  if (!tbody) return;
  tbody.innerHTML = productos.map((p) => `
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
  
    apiFetch('/auth/login', {
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
   async function cargarBodegas() {
    const tbody = document.getElementById('bodegas-tbody');
    if (!tbody) return;
    protegerRuta();
  
    try {
      const bodegas = await apiFetch('/api/bodegas');
      tbody.innerHTML = bodegas.map((b) => `
        <tr data-id="${b.id}" data-name="${b.nombre}" data-location="${b.ubicacion}"
            data-capacity="${b.capacidad}" data-encargado-id="${b.encargado?.id ?? ''}">
          <td class="metric-cell__value">BOD-${b.id}</td>
          <td class="product-cell__name">${b.nombre}</td>
          <td>${b.ubicacion}</td>
          <td class="is-right"><span class="metric-cell__value">${b.capacidad}</span></td>
          <td><span class="status-badge status-badge--success">Operativa</span></td>
          <td>${b.encargado?.username ?? 'Sin asignar'}</td>
          <td class="is-right">
            <div class="row-actions">
              <button class="row-action-btn" type="button" data-action="edit"><span class="material-symbols-outlined">edit</span></button>
              <button class="row-action-btn row-action-btn--danger" type="button" data-action="delete"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </td>
        </tr>`).join('');
  
      adjuntarEventosFilasBodega();
    } catch (err) {
      console.error('Error cargando bodegas:', err);
    }
  }
  
  async function cargarEncargados() {
    const select = document.getElementById('bodega-encargado');
    if (!select) return;
    const usuarios = await apiFetch('/api/usuarios');
    select.innerHTML = '<option value="" disabled selected>Selecciona un encargado...</option>' +
      usuarios.map((u) => `<option value="${u.id}">${u.username}</option>`).join('');
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
        if (!confirm(`¿Eliminar la bodega "${row.dataset.name}"?`)) return;
        await apiFetch(`/api/bodegas/${row.dataset.id}`, { method: 'DELETE' });
        row.remove();
      });
    });
  }
  
  let bodegaIdEditando = null;
  
  function abrirModalBodega(mode, data) {
    bodegaIdEditando = mode === 'edit' ? data.id : null;
    const form = document.getElementById('bodega-form');
    form.reset();
    if (data) {
      form.elements.nombre.value = data.name || '';
      form.elements.ubicacion.value = data.location || '';
      form.elements.capacidad.value = data.capacity || '';
      if (data.encargadoId) form.elements.encargado.value = data.encargadoId;
    }
    document.getElementById('bodega-modal-backdrop').classList.add('is-open');
  }

  function abrirProductoModal(mode, data) {
  const form = document.getElementById('product-form');
  form.reset();
  document.getElementById('product-modal-title').textContent =
    mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto';
  if (data) {
    form.elements.nombre.value = data.name || '';
    form.elements.categoria.value = data.category || '';
    form.elements.stock.value = data.stock || '';
    form.elements.precio.value = data.price || '';
  }
  document.getElementById('product-modal-backdrop').classList.add('is-open');
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
      document.getElementById('bodega-modal-backdrop').classList.remove('is-open');
      cargarBodegas();
    } catch (err) {
      alert(err.message);
    }
  });
  
  document.addEventListener('DOMContentLoaded', () => {
    cargarBodegas();
    cargarEncargados();
  });

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


/* ============================================================================
   Productos (listado + filtros combinados + modal crear/editar + eliminar)
   ============================================================================ */
   async function cargarProductos() {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;
    protegerRuta();
  
    const productos = await apiFetch('/api/productos');
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
            <button class="row-action-btn" type="button" data-action="edit"><span class="material-symbols-outlined">edit</span></button>
            <button class="row-action-btn row-action-btn--danger" type="button" data-action="delete"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </td>
      </tr>`).join('');
  
    // Reutiliza tus mismos filtros de busqueda/categoria/stock-bajo que ya existen
    // en initProductosPage(): siguen funcionando porque leen data-* de las filas.
    adjuntarEventosFilasProducto();
  }
  
  function adjuntarEventosFilasProducto() {
    document.querySelectorAll('#products-table [data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        if (!confirm(`¿Eliminar "${row.dataset.name}"?`)) return;
        await apiFetch(`/api/productos/${row.dataset.id}`, { method: 'DELETE' });
        row.remove();
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
      stock: Number(form.elements.stock.value),
      precio: Number(form.elements.precio.value),
    };
    try {
      if (productoIdEditando) {
        await apiFetch(`/api/productos/${productoIdEditando}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/productos', { method: 'POST', body: JSON.stringify(payload) });
      }
      document.getElementById('product-modal-backdrop').classList.remove('is-open');
      productoIdEditando = null;
      cargarProductos();
    } catch (err) {
      alert(err.message);
    }
  });
  
  document.addEventListener('DOMContentLoaded', cargarProductos);

/* ============================================================================
   Movimientos (Historial)
   ============================================================================ */
   async function cargarMovimientos() {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody || document.getElementById('movement-form')) return; // evita chocar con nuevo-movimiento.html
    protegerRuta();
  
    const movimientos = await apiFetch('/api/movimientos');
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
    
      // 1. Llenar selects de bodega con datos reales
      const bodegas = await apiFetch('/api/bodegas');
      const opciones = bodegas.map((b) => `<option value="${b.id}">${b.nombre}</option>`).join('');
      document.getElementById('bodega-origen').innerHTML =
        '<option value="" disabled selected>Seleccione origen...</option>' + opciones;
      document.getElementById('bodega-destino').innerHTML =
        '<option value="" disabled selected>Seleccione destino...</option>' + opciones;
    
      // 2. Guardar productos reales para usarlos al agregar filas
      window.__productosDisponibles = await apiFetch('/api/productos');
    
      // 3. Mostrar el usuario logueado real (ya no "Admin LogiTrack" fijo)
      const usuarioActual = getUsuarioActual();
      const inputUsuario = document.getElementById('usuario');
      if (inputUsuario && usuarioActual) inputUsuario.value = usuarioActual.username;
    }
    
    // En el listener de "Agregar producto" (btn-add-product), cambia el <select> hardcodeado por:
    function opcionesProductosHTML() {
      return (window.__productosDisponibles || [])
        .map((p) => `<option value="${p.id}">${p.nombre}</option>`).join('');
    }
    // Y en el template del <tr> que ya tienes, reemplaza las <option> fijas P1/P2/P3 por:
    //   <option value="" disabled selected>Seleccionar producto...</option>${opcionesProductosHTML()}
    
    // 4. Reemplaza el submit simulado por el envio real
    document.getElementById('movement-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      if (!form.checkValidity()) { form.reportValidity(); return; }
    
      const filas = Array.from(document.querySelectorAll('#products-tbody tr'));
      if (filas.length === 0) { alert('Debes agregar al menos un producto.'); return; }
    
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
        alert('Movimiento guardado con exito');
        window.location.href = 'movimientos.html';
      } catch (err) {
        alert(err.message); // ej. "Stock insuficiente de 'X' en Bodega Y. Disponible: 5, solicitado: 10"
      }
    });
    
    document.addEventListener('DOMContentLoaded', initNuevoMovimientoReal);
/* ============================================================================
   Auditoría de Cambios
   ============================================================================ */
   async function cargarAuditorias() {
    const tbody = document.querySelector('#audit-table tbody');
    if (!tbody) return;
  
    protegerRuta();
    protegerRutaAdmin(); // <-- si no es ADMIN, redirige a dashboard.html antes de pedir nada
  
    try {
      const auditorias = await apiFetch('/api/auditorias');
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
            <button class="row-action-btn" type="button" data-action="view"
                    data-anteriores='${a.valoresAnteriores ?? ""}' data-nuevos='${a.valoresNuevos ?? ""}'>
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </td>
        </tr>`).join('');
  
      // Al abrir el modal, en vez del ejemplo fijo, mete el JSON real en <pre>
      document.querySelectorAll('[data-action="view"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const body = document.querySelector('#audit-modal-backdrop .modal__body');
          body.innerHTML = `
            <div class="diff-grid">
              <div class="diff-panel">
                <div class="diff-panel__header">Valores anteriores</div>
                <div class="diff-panel__content"><pre>${formatearJson(btn.dataset.anteriores)}</pre></div>
              </div>
              <div class="diff-panel">
                <div class="diff-panel__header">Valores nuevos</div>
                <div class="diff-panel__content"><pre>${formatearJson(btn.dataset.nuevos)}</pre></div>
              </div>
            </div>`;
          document.getElementById('audit-modal-backdrop').classList.add('is-open');
        });
      });
    } catch (err) {
      // Si por alguna razon llega aqui sin ser ADMIN, la API ya devolvio 403
      console.error(err);
    }
  }
  
  function badgeClasePorOperacion(tipo) {
    return { INSERT: 'status-badge--insert', UPDATE: 'status-badge--update', DELETE: 'status-badge--delete' }[tipo] || '';
  }
  function formatearJson(raw) {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw || '(vacio)'; }
  }
  
  document.addEventListener('DOMContentLoaded', cargarAuditorias);