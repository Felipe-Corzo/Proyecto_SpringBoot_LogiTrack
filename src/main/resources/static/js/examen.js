// ============================================================================
// LogiTrack — Examen (Consultas Avanzadas)
// JavaScript puro, sin dependencias externas.
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  protegerRuta();
  initExamenPage();
});

// ============================================================================
// Estado global
// ============================================================================
let examenState = {
  bodegas: [],
  productos: [],
  inventarioGlobal: [],      // ProductoConInventarioDTO[]
  stockPorBodega: [],        // StockPorBodegaDTO[]
  reporte: null,             // ResumenReporteDTO
  categoriasUnicas: [],
  inventarioPorBodega: {},   // { bodegaId: [InventarioBodega] }
};

// ============================================================================
// Inicialización
// ============================================================================
async function initExamenPage() {
  protegerRuta();

  // Mostrar el nombre del usuario en el avatar
  const u = getUsuarioActual();
  if (u && u.username) {
    const initials = u.username.slice(0, 2).toUpperCase();
    document.querySelectorAll('.avatar').forEach((el) => {
      el.textContent = initials;
      el.title = `${u.username} (${u.rol || 'USUARIO'})`;
    });
  }

  // Si es EMPLEADO, ocultar el link de Examen del sidebar (solo admin)
  if (u && u.rol !== 'ADMIN') {
    const link = document.getElementById('examen-sidebar-link');
    if (link) link.style.display = 'none';
    document.querySelectorAll('.mobile-nav__link[href*="examen"]').forEach((el) => {
      el.style.display = 'none';
    });
  }

  await loadAllData();
  setupEventListeners();

  // Initial render with no filters
  applyFilters();

  // Render new sections
  renderTopMovidos();
  renderMovimientosTipoBodega();
  renderValorBodega();
  renderProductosEspeciales();
  renderCategorias();
}

// ============================================================================
// Carga de datos
// ============================================================================
async function loadAllData() {
  try {
    const [
      bodegas,
      productos,
      inventarioGlobal,
      stockPorBodega,
      reporte
    ] = await Promise.all([
      apiFetch('/api/bodegas').catch(() => []),
      apiFetch('/api/productos').catch(() => []),
      apiFetch('/api/productos/con-inventario').catch(() => []),
      apiFetch('/api/bodegas/stock').catch(() => []),
      apiFetch('/api/reportes/resumen?dias=365&limit=50').catch(() => null),
    ]);

    examenState.bodegas = bodegas;
    examenState.productos = productos;
    examenState.inventarioGlobal = inventarioGlobal;
    examenState.stockPorBodega = stockPorBodega;
    examenState.reporte = reporte;

    // Extraer categorías únicas
    const cats = new Set();
    productos.forEach(p => { if (p.categoria) cats.add(p.categoria); });
    examenState.categoriasUnicas = [...cats].sort();

    // Cargar inventario por bodega
    const invPromises = bodegas.map(async (b) => {
      try {
        const inv = await apiFetch(`/api/bodegas/${b.id}/inventario`);
        examenState.inventarioPorBodega[b.id] = inv;
      } catch {
        examenState.inventarioPorBodega[b.id] = [];
      }
    });
    await Promise.all(invPromises);

    // Poblar selects
    populateFilterSelects();
    renderKPIs();
    renderAcordeon(examenState.bodegas);
    renderCapacityGrid();
    renderGlobalTable();

  } catch (err) {
    console.error('Error cargando datos del examen:', err);
    UIKit.toast('Error al cargar datos. Verifica la conexión.', 'error');
  }
}

// ============================================================================
// Poblar selects de filtros
// ============================================================================
function populateFilterSelects() {
  // Categorías
  const catSelect = document.getElementById('filter-categoria');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">Todas las categorías</option>' +
      examenState.categoriasUnicas.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // Bodegas
  const bodegaSelect = document.getElementById('filter-bodega');
  if (bodegaSelect) {
    bodegaSelect.innerHTML = '<option value="">Todas las bodegas</option>' +
      examenState.bodegas.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('');
  }

  // Bodega filter for section 7 (Movimientos por Tipo y Bodega)
  const movBodegaSelect = document.getElementById('mov-tipo-bodega-bodega');
  if (movBodegaSelect) {
    movBodegaSelect.innerHTML = '<option value="">Todas las bodegas</option>' +
      examenState.bodegas.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('');
  }

  // Bodega filter for section 8 (Valor por Bodega)
  const valorBodegaSelect = document.getElementById('valor-bodega-select');
  if (valorBodegaSelect) {
    valorBodegaSelect.innerHTML = '<option value="">Todas las bodegas</option>' +
      examenState.bodegas.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('');
  }
}

// ============================================================================
// Event Listeners
// ============================================================================
function setupEventListeners() {
  // Botón aplicar filtros
  document.getElementById('examen-apply-filters')?.addEventListener('click', applyFilters);

  // Botón limpiar filtros
  document.getElementById('examen-clear-filters')?.addEventListener('click', clearFilters);

  // Botón refresh
  document.getElementById('examen-refresh-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('examen-refresh-btn');
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading');
    btn.disabled = true;
    try {
      await loadAllData();
    } finally {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  });

  // Enter key en inputs de filtro
  const filterInputs = document.querySelectorAll('#filter-nombre, #filter-precio-min, #filter-precio-max, #filter-stock-min, #filter-stock-max, #filter-bodega-stock-min');
  filterInputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyFilters();
    });
  });

  // ---- New sections event listeners ----

  // Sección 6: Top movidos
  document.getElementById('top-movidos-apply')?.addEventListener('click', renderTopMovidos);

  // Sección 7: Movimientos por tipo y bodega
  document.getElementById('mov-tipo-bodega-apply')?.addEventListener('click', renderMovimientosTipoBodega);

  // Sección 8: Valor por bodega
  document.getElementById('valor-bodega-select')?.addEventListener('change', renderValorBodega);
  document.getElementById('valor-bodega-order')?.addEventListener('change', renderValorBodega);

  // Sección 9: Productos especiales
  document.getElementById('productos-especiales-tipo')?.addEventListener('change', renderProductosEspeciales);
}

// ============================================================================
// Obtener valores de filtros
// ============================================================================
function getFilterValues() {
  return {
    precioMin: parseFloat(document.getElementById('filter-precio-min')?.value) || null,
    precioMax: parseFloat(document.getElementById('filter-precio-max')?.value) || null,
    stockMin: parseInt(document.getElementById('filter-stock-min')?.value) || null,
    stockMax: parseInt(document.getElementById('filter-stock-max')?.value) || null,
    categoria: document.getElementById('filter-categoria')?.value || '',
    bodegaId: document.getElementById('filter-bodega')?.value || '',
    nombre: (document.getElementById('filter-nombre')?.value || '').toLowerCase().trim(),
    bodegaStockMin: parseInt(document.getElementById('filter-bodega-stock-min')?.value) || null,
    soloConStock: document.getElementById('filter-solo-con-stock')?.checked || false,
  };
}

// ============================================================================
// Aplicar filtros - renderiza todo
// ============================================================================
function applyFilters() {
  const filters = getFilterValues();

  // Productos filtrados para el acordeón
  const filteredProductos = examenState.productos.filter(p => {
    // Filtro precio
    if (filters.precioMin !== null && Number(p.precio) < filters.precioMin) return false;
    if (filters.precioMax !== null && Number(p.precio) > filters.precioMax) return false;

    // Filtro stock global
    if (filters.stockMin !== null && p.stock < filters.stockMin) return false;
    if (filters.stockMax !== null && p.stock > filters.stockMax) return false;

    // Filtro categoría
    if (filters.categoria && p.categoria !== filters.categoria) return false;

    // Filtro nombre
    if (filters.nombre && !p.nombre.toLowerCase().includes(filters.nombre)) return false;

    return true;
  });

  // IDs de productos filtrados
  const filteredProductIds = new Set(filteredProductos.map(p => p.id));

  // Filtro bodega: determinar qué bodegas mostrar
  let bodegasAMostrar = examenState.bodegas;
  if (filters.bodegaId) {
    bodegasAMostrar = bodegasAMostrar.filter(b => String(b.id) === String(filters.bodegaId));
  }

  // Para cada bodega, filtrar su inventario por productos filtrados
  const bodegasConInventarioFiltrado = bodegasAMostrar.map(b => {
    let inventario = examenState.inventarioPorBodega[b.id] || [];

    // Filtrar por productos
    inventario = inventario.filter(inv => filteredProductIds.has(inv.producto?.id));

    // Filtro stock por bodega
    if (filters.bodegaStockMin !== null) {
      inventario = inventario.filter(inv => inv.stock >= filters.bodegaStockMin);
    }
    if (filters.soloConStock) {
      inventario = inventario.filter(inv => inv.stock > 0);
    }

    // Ordenar por nombre de producto
    inventario.sort((a, b) => (a.producto?.nombre || '').localeCompare(b.producto?.nombre || ''));

    return { bodega: b, inventario };
  });

  // Actualizar badge
  const badge = document.getElementById('examen-badge-productos-filtrados');
  if (badge) {
    const totalItems = bodegasConInventarioFiltrado.reduce((sum, { inventario }) => sum + inventario.length, 0);
    badge.textContent = `${totalItems} productos en ${bodegasConInventarioFiltrado.length} bodegas`;
  }

  // Render acordeón
  renderAcordeonFromData(bodegasConInventarioFiltrado, filteredProductos);

  // Render tabla global filtrada
  renderGlobalTable(filters, filteredProductos);
}

// ============================================================================
// Limpiar filtros
// ============================================================================
function clearFilters() {
  document.getElementById('filter-precio-min').value = '';
  document.getElementById('filter-precio-max').value = '';
  document.getElementById('filter-stock-min').value = '';
  document.getElementById('filter-stock-max').value = '';
  document.getElementById('filter-categoria').value = '';
  document.getElementById('filter-bodega').value = '';
  document.getElementById('filter-nombre').value = '';
  document.getElementById('filter-bodega-stock-min').value = '';
  document.getElementById('filter-solo-con-stock').checked = false;
  applyFilters();
}

// ============================================================================
// KPIs
// ============================================================================
function renderKPIs() {
  const reporte = examenState.reporte;

  document.getElementById('examen-kpi-bodegas').textContent = reporte?.totalBodegas ?? examenState.bodegas.length;
  document.getElementById('examen-kpi-productos').textContent = reporte?.totalProductos ?? examenState.productos.length;
  document.getElementById('examen-kpi-bajo-stock').textContent = reporte?.productosBajoStock ?? '—';

  // Calcular valor total del inventario
  let valorTotal = 0;
  examenState.productos.forEach(p => {
    if (p.stock && p.precio) {
      valorTotal += p.stock * Number(p.precio);
    }
  });
  document.getElementById('examen-kpi-valor').textContent = `$${valorTotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// Acordeón: Productos por Bodega
// ============================================================================
function renderAcordeon(bodegas) {
  const data = bodegas.map(b => ({
    bodega: b,
    inventario: examenState.inventarioPorBodega[b.id] || [],
  }));
  renderAcordeonFromData(data, examenState.productos);
}

function renderAcordeonFromData(bodegasData, productosFiltrados) {
  const container = document.getElementById('examen-acordeon-container');
  if (!container) return;

  if (!bodegasData.length) {
    container.innerHTML = `
      <div class="examen-acordeon__empty">
        <span class="material-symbols-outlined">search_off</span>
        <p>No se encontraron resultados con los filtros aplicados.</p>
      </div>`;
    return;
  }

  container.innerHTML = ''; // Limpiar loading

  const acordeon = document.createElement('div');
  acordeon.className = 'examen-acordeon';

  bodegasData.forEach(({ bodega, inventario }) => {
    // Calcular stock total en esta bodega
    const stockTotal = inventario.reduce((sum, inv) => sum + (inv.stock || 0), 0);
    const porcentajeCapacidad = bodega.capacidad > 0
      ? Math.min(100, Math.round((stockTotal / bodega.capacidad) * 100))
      : 0;

    const item = document.createElement('div');
    item.className = `examen-acordeon__item${inventario.length === 0 ? ' is-empty' : ''}`;

    const isExpanded = inventario.length > 0;

    // Determinar clase de la barra de capacidad
    let barClass = '';
    if (porcentajeCapacidad >= 90) barClass = 'is-danger';
    else if (porcentajeCapacidad >= 70) barClass = 'is-warning';

    item.innerHTML = `
      <button class="examen-acordeon__trigger" type="button" aria-expanded="${isExpanded}" aria-controls="acordeon-body-${bodega.id}">
        <div class="examen-acordeon__trigger-left">
          <div class="examen-acordeon__bodega-icon">
            <span class="material-symbols-outlined">inventory_2</span>
          </div>
          <div class="examen-acordeon__bodega-info">
            <p class="examen-acordeon__bodega-name">${bodega.nombre}</p>
            <p class="examen-acordeon__bodega-meta">
              <span>📍 ${bodega.ubicacion}</span>
              <span>👤 ${bodega.encargado?.username || 'Sin asignar'}</span>
              <span class="examen-capacity-bar">
                <span class="examen-capacity-bar__track">
                  <span class="examen-capacity-bar__fill ${barClass}" style="width:${porcentajeCapacidad}%"></span>
                </span>
                <span class="examen-capacity-bar__text">${stockTotal}/${bodega.capacidad}</span>
              </span>
            </p>
          </div>
        </div>
        <div class="examen-acordeon__bodega-stats">
          <div class="examen-acordeon__stat">
            <div class="examen-acordeon__stat-value">${inventario.length}</div>
            <div class="examen-acordeon__stat-label">Productos</div>
          </div>
          <div class="examen-acordeon__stat">
            <div class="examen-acordeon__stat-value">${stockTotal}</div>
            <div class="examen-acordeon__stat-label">Unidades</div>
          </div>
        </div>
        <span class="material-symbols-outlined examen-acordeon__chevron">expand_more</span>
      </button>
      <div class="examen-acordeon__body" id="acordeon-body-${bodega.id}" ${isExpanded ? 'style="max-height: none;"' : ''}>
        <div class="examen-acordeon__content">
          ${inventario.length === 0
            ? `<div class="examen-acordeon__empty">
                <span class="material-symbols-outlined">inventory</span>
                <p>No hay productos en esta bodega con los filtros aplicados.</p>
              </div>`
            : `<div class="examen-acordeon__tabla-wrapper">
                <table class="examen-acordeon__tabla">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th class="is-right">Stock en Bodega</th>
                      <th class="is-right">Precio Unit.</th>
                      <th class="is-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inventario.map(inv => {
                      const prod = inv.producto || {};
                      const cantidad = inv.stock || 0;
                      const precio = Number(prod.precio || 0);
                      const valorTotal = (cantidad * precio).toFixed(2);
                      return `
                        <tr>
                          <td class="cell-mono">PRD-${prod.id || '?'}</td>
                          <td><strong>${prod.nombre || 'Producto desconocido'}</strong></td>
                          <td class="cell-mono">${prod.categoria || '-'}</td>
                          <td class="is-right"><span class="cell-mono">${cantidad}</span></td>
                          <td class="is-right"><span class="cell-mono">$${precio.toFixed(2)}</span></td>
                          <td class="is-right"><span class="cell-mono">$${valorTotal}</span></td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>`
          }
        </div>
      </div>
    `;

    // Evento toggle
    const trigger = item.querySelector('.examen-acordeon__trigger');
    const body = item.querySelector('.examen-acordeon__body');
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', !expanded);
      if (!expanded) {
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        body.style.maxHeight = '0';
      }
    });

    // If expanded by default, set max-height
    if (isExpanded) {
      requestAnimationFrame(() => {
        body.style.maxHeight = body.scrollHeight + 'px';
      });
    }

    acordeon.appendChild(item);
  });

  container.appendChild(acordeon);
}

// ============================================================================
// Capacidad vs Stock Grid
// ============================================================================
function renderCapacityGrid() {
  const container = document.getElementById('examen-capacity-grid');
  if (!container) return;

  container.innerHTML = '';

  examenState.bodegas.forEach(b => {
    const inventario = examenState.inventarioPorBodega[b.id] || [];
    const stockUsado = inventario.reduce((sum, inv) => sum + (inv.stock || 0), 0);
    const porcentaje = b.capacidad > 0 ? Math.min(100, Math.round((stockUsado / b.capacidad) * 100)) : 0;
    const disponible = b.capacidad - stockUsado;

    let perClass = 'is-low';
    if (porcentaje >= 90) perClass = 'is-high';
    else if (porcentaje >= 70) perClass = 'is-mid';

    let fillClass = '';
    if (porcentaje >= 90) fillClass = 'is-danger';
    else if (porcentaje >= 70) fillClass = 'is-warning';

    const card = document.createElement('div');
    card.className = 'examen-capacity-card';
    card.innerHTML = `
      <div class="examen-capacity-card__header">
        <h4 class="examen-capacity-card__name">${b.nombre}</h4>
        <span class="examen-capacity-card__percentage ${perClass}">${porcentaje}%</span>
      </div>
      <div class="examen-capacity-bar">
        <div class="examen-capacity-bar__track">
          <div class="examen-capacity-bar__fill ${fillClass}" style="width:${porcentaje}%"></div>
        </div>
      </div>
      <div class="examen-capacity-card__numbers">
        <span>Usado: ${stockUsado}</span>
        <span>Disponible: ${Math.max(0, disponible)}</span>
        <span>Capacidad: ${b.capacidad}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// ============================================================================
// Tabla Global de Inventario
// ============================================================================
function renderGlobalTable(filters, filteredProductos) {
  const tbody = document.getElementById('examen-global-tbody');
  if (!tbody) return;

  // Si no hay filtros, mostrar usando inventarioGlobal
  const productos = filteredProductos || examenState.productos;
  const filtersApplied = filters || getFilterValues();

  // Combinar productos con su distribución de stock
  const prodMap = {};
  (examenState.inventarioGlobal || []).forEach(p => {
    prodMap[p.id] = p;
  });

  // Para productos que no están en inventarioGlobal, usar distribución por bodega
  const data = productos.map(p => {
    const conInv = prodMap[p.id];
    const distribucion = conInv?.distribucionStock || [];

    // Calcular distribución real desde inventarioPorBodega
    let bodegasNombres = '';
    if (distribucion.length > 0) {
      // Aplicar filtro de bodega
      let dist = distribucion;
      if (filtersApplied.bodegaId) {
        dist = dist.filter(d => String(d.bodegaId) === String(filtersApplied.bodegaId));
      }
      if (filtersApplied.soloConStock) {
        dist = dist.filter(d => d.stockTotal > 0);
      }
      if (filtersApplied.bodegaStockMin !== null) {
        dist = dist.filter(d => d.stockTotal >= filtersApplied.bodegaStockMin);
      }
      bodegasNombres = dist.map(d => `${d.bodegaNombre} (${d.stockTotal})`).join(', ');
    } else {
      // Intentar desde estado de inventario por bodega
      const entries = [];
      Object.entries(examenState.inventarioPorBodega).forEach(([bodegaId, inventario]) => {
        const inv = inventario.find(i => i.producto?.id === p.id);
        if (inv) {
          const bodega = examenState.bodegas.find(b => String(b.id) === String(bodegaId));
          // Aplicar filtros de bodega
          if (filtersApplied.bodegaId && String(bodegaId) !== String(filtersApplied.bodegaId)) return;
          if (filtersApplied.soloConStock && inv.stock <= 0) return;
          if (filtersApplied.bodegaStockMin !== null && inv.stock < filtersApplied.bodegaStockMin) return;
          entries.push(`${bodega?.nombre || '?'} (${inv.stock})`);
        }
      });
      bodegasNombres = entries.join(', ');
    }

    const stockGlobal = distribucion.reduce((sum, d) => sum + (d.stockTotal || 0), 0);
    const valorTotal = (stockGlobal * Number(p.precio || 0)).toFixed(2);

    return { ...p, bodegasStr: bodegasNombres, stockGlobal, valorTotal };
  });

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="is-center cell-muted" style="padding: 2rem;">No hay productos que coincidan con los filtros.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td class="cell-mono">PRD-${p.id}</td>
      <td><strong>${p.nombre}</strong></td>
      <td class="cell-mono">${p.categoria || '-'}</td>
      <td class="is-right"><span class="cell-mono">$${Number(p.precio || 0).toFixed(2)}</span></td>
      <td class="is-right"><span class="cell-mono">${p.stockGlobal}</span></td>
      <td class="is-right"><span class="cell-mono">$${p.valorTotal}</span></td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.bodegasStr}">
        ${p.bodegasStr || '<span class="cell-muted">Sin inventario</span>'}
      </td>
    </tr>
  `).join('');
}

// ============================================================================
// SECCIÓN 6: Top 20 Productos Más Movidos
// ============================================================================
async function renderTopMovidos() {
  const tbody = document.getElementById('examen-top-movidos-tbody');
  if (!tbody) return;

  const dias = document.getElementById('top-movidos-dias')?.value || 30;

  tbody.innerHTML = '<tr><td colspan="5" class="is-center cell-muted" style="padding:2rem;"><div class="uikit-spinner"></div><span>Cargando...</span></td></tr>';

  try {
    const reporte = await apiFetch(`/api/reportes/resumen?dias=${dias}&limit=20`);
    const productos = reporte.productosMasMovidos || [];

    if (!productos.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="is-center cell-muted" style="padding:2rem;">No hay movimientos en este rango de días.</td></tr>';
      return;
    }

    tbody.innerHTML = productos.map((p, i) => `
      <tr>
        <td class="cell-mono">${i + 1}</td>
        <td><strong>${p.nombre}</strong></td>
        <td class="cell-mono">${p.categoria || '-'}</td>
        <td class="is-right"><span class="cell-mono" style="font-weight:600;">${p.totalMovido}</span></td>
        <td class="is-right"><span class="cell-mono">${p.stock ?? '—'}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="is-center cell-muted" style="padding:2rem;">Error: ${err.message}</td></tr>`;
  }
}

// ============================================================================
// SECCIÓN 7: Movimientos por Tipo y Bodega
// ============================================================================
async function renderMovimientosTipoBodega() {
  const tbody = document.getElementById('examen-mov-tipo-bodega-tbody');
  if (!tbody) return;

  const tipo = document.getElementById('mov-tipo-bodega-tipo')?.value || '';
  const bodegaId = document.getElementById('mov-tipo-bodega-bodega')?.value || '';
  const desde = document.getElementById('mov-tipo-bodega-desde')?.value || '';
  const hasta = document.getElementById('mov-tipo-bodega-hasta')?.value || '';

  tbody.innerHTML = '<tr><td colspan="6" class="is-center cell-muted" style="padding:2rem;"><div class="uikit-spinner"></div><span>Cargando...</span></td></tr>';

  try {
    // Obtener movimientos según filtros
    let movimientos;
    if (desde && hasta) {
      const d = `${desde}T00:00:00`;
      const h = `${hasta}T23:59:59`;
      movimientos = await apiFetch(`/api/movimientos/rango?desde=${d}&hasta=${h}`);
    } else if (tipo) {
      movimientos = await apiFetch(`/api/movimientos/tipo/${tipo}`);
    } else {
      movimientos = await apiFetch('/api/movimientos');
    }

    // Aplicar filtros manuales
    let filtrados = movimientos.filter(m => {
      if (tipo && m.tipoMovimiento !== tipo) return false;
      if (bodegaId) {
        const matchOrigen = m.bodegaOrigen?.id && String(m.bodegaOrigen.id) === String(bodegaId);
        const matchDestino = m.bodegaDestino?.id && String(m.bodegaDestino.id) === String(bodegaId);
        if (!matchOrigen && !matchDestino) return false;
      }
      return true;
    });

    // Ordenar por fecha descendente y tomar primeros 50
    filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    filtrados = filtrados.slice(0, 50);

    if (!filtrados.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="is-center cell-muted" style="padding:2rem;">No se encontraron movimientos con esos filtros.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados.map(m => {
      const badgeClass = { ENTRADA: 'status-badge--success', SALIDA: 'status-badge--danger', TRANSFERENCIA: 'status-badge--info' }[m.tipoMovimiento] || '';
      const totalUnids = (m.detalles || []).reduce((sum, d) => sum + (d.cantidad || 0), 0);
      return `
        <tr>
          <td><span class="status-badge ${badgeClass}">${m.tipoMovimiento}</span></td>
          <td>${m.bodegaOrigen?.nombre || '-'}</td>
          <td>${m.bodegaDestino?.nombre || '-'}</td>
          <td class="is-right"><span class="cell-mono">1</span></td>
          <td class="is-right"><span class="cell-mono" style="font-weight:600;">${totalUnids}</span></td>
          <td>${m.usuario?.username || '-'}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="is-center cell-muted" style="padding:2rem;">Error: ${err.message}</td></tr>`;
  }
}

// ============================================================================
// SECCIÓN 8: Valor del Inventario por Bodega
// ============================================================================
function renderValorBodega() {
  const container = document.getElementById('examen-valor-grid');
  if (!container) return;

  const bodegaFiltro = document.getElementById('valor-bodega-select')?.value || '';
  const orderBy = document.getElementById('valor-bodega-order')?.value || 'valor-desc';

  let bodegas = examenState.bodegas;
  if (bodegaFiltro) {
    bodegas = bodegas.filter(b => String(b.id) === String(bodegaFiltro));
  }

  // Calcular valor por bodega
  let data = bodegas.map(b => {
    const inventario = examenState.inventarioPorBodega[b.id] || [];
    let valorTotal = 0;
    let totalUnidades = 0;
    inventario.forEach(inv => {
      const cantidad = inv.stock || 0;
      const precio = Number(inv.producto?.precio || 0);
      valorTotal += cantidad * precio;
      totalUnidades += cantidad;
    });
    return { bodega: b, valorTotal, totalUnidades, totalProductos: inventario.length };
  });

  // Ordenar
  data.sort((a, b) => {
    switch (orderBy) {
      case 'valor-asc': return a.valorTotal - b.valorTotal;
      case 'valor-desc': return b.valorTotal - a.valorTotal;
      case 'nombre': return a.bodega.nombre.localeCompare(b.bodega.nombre);
      case 'productos': return b.totalProductos - a.totalProductos;
      default: return b.valorTotal - a.valorTotal;
    }
  });

  if (!data.length) {
    container.innerHTML = '<div class="examen-loading"><span>No hay datos.</span></div>';
    return;
  }

  container.innerHTML = data.map(d => `
    <div class="examen-valor-card">
      <div class="examen-valor-card__header">
        <h4 class="examen-valor-card__name">${d.bodega.nombre}</h4>
        <span class="examen-valor-card__amount">$${d.valorTotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="examen-valor-card__stats">
        <span>Productos: ${d.totalProductos}</span>
        <span>Unidades: ${d.totalUnidades}</span>
        <span>Precio prom: $${d.totalProductos > 0 ? (d.valorTotal / d.totalUnidades).toFixed(2) : '0.00'}</span>
      </div>
    </div>
  `).join('');
}

// ============================================================================
// SECCIÓN 9: Productos sin Stock / en múltiples bodegas / sin movimientos
// ============================================================================
function renderProductosEspeciales() {
  const tbody = document.getElementById('examen-productos-especiales-tbody');
  if (!tbody) return;

  const tipo = document.getElementById('productos-especiales-tipo')?.value || 'sin-stock';

  let productos = [];

  if (tipo === 'sin-stock') {
    // Productos con stock global = 0
    productos = examenState.productos.filter(p => p.stock === 0).map(p => {
      const bodegasStr = getBodegasForProduct(p.id);
      return { ...p, bodegasStr };
    });
  } else if (tipo === 'multi-bodega') {
    // Productos en más de 1 bodega
    productos = [];
    examenState.productos.forEach(p => {
      const bodegasConStock = Object.entries(examenState.inventarioPorBodega)
        .filter(([bId, inventario]) => {
          return inventario.some(inv => inv.producto?.id === p.id && inv.stock > 0);
        });
      if (bodegasConStock.length > 1) {
        const bodegasStr = bodegasConStock.map(([bId]) => {
          const b = examenState.bodegas.find(bx => String(bx.id) === String(bId));
          return b?.nombre || '?';
        }).join(', ');
        productos.push({ ...p, bodegasStr });
      }
    });
  } else if (tipo === 'sin-movimientos') {
    // Productos sin movimientos - usamos la API de reportes
    renderProductosSinMovimientos(tbody);
    return;
  }

  if (!productos.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="is-center cell-muted" style="padding:2rem;">No se encontraron productos con este criterio.</td></tr>';
    return;
  }

  tbody.innerHTML = productos.map(p => `
    <tr>
      <td class="cell-mono">PRD-${p.id}</td>
      <td><strong>${p.nombre}</strong></td>
      <td class="cell-mono">${p.categoria || '-'}</td>
      <td class="is-right"><span class="cell-mono" style="font-weight:600;">${p.stock}</span></td>
      <td class="is-right"><span class="cell-mono">$${Number(p.precio || 0).toFixed(2)}</span></td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.bodegasStr}">
        ${p.bodegasStr || '<span class="cell-muted">Ninguna</span>'}
      </td>
    </tr>
  `).join('');
}

async function renderProductosSinMovimientos(tbody) {
  tbody.innerHTML = '<tr><td colspan="6" class="is-center cell-muted" style="padding:2rem;"><div class="uikit-spinner"></div><span>Analizando movimientos...</span></td></tr>';
  try {
    const movimientos = await apiFetch('/api/movimientos');
    const productosConMovimientos = new Set();
    movimientos.forEach(m => {
      (m.detalles || []).forEach(d => {
        if (d.producto?.id) productosConMovimientos.add(d.producto.id);
      });
    });

    const productosSinMov = examenState.productos
      .filter(p => !productosConMovimientos.has(p.id))
      .map(p => {
        const bodegasStr = getBodegasForProduct(p.id);
        return { ...p, bodegasStr };
      });

    if (!productosSinMov.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="is-center cell-muted" style="padding:2rem;">Todos los productos han tenido al menos un movimiento.</td></tr>';
      return;
    }

    tbody.innerHTML = productosSinMov.map(p => `
      <tr>
        <td class="cell-mono">PRD-${p.id}</td>
        <td><strong>${p.nombre}</strong></td>
        <td class="cell-mono">${p.categoria || '-'}</td>
        <td class="is-right"><span class="cell-mono" style="font-weight:600;">${p.stock}</span></td>
        <td class="is-right"><span class="cell-mono">$${Number(p.precio || 0).toFixed(2)}</span></td>
        <td>${p.bodegasStr || '<span class="cell-muted">Ninguna</span>'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="is-center cell-muted" style="padding:2rem;">Error: ${err.message}</td></tr>`;
  }
}

function getBodegasForProduct(productId) {
  const entries = [];
  Object.entries(examenState.inventarioPorBodega).forEach(([bodegaId, inventario]) => {
    const inv = inventario.find(i => i.producto?.id === productId);
    if (inv) {
      const b = examenState.bodegas.find(bx => String(bx.id) === String(bodegaId));
      entries.push(`${b?.nombre || '?'} (${inv.stock})`);
    }
  });
  return entries.join(', ');
}

// ============================================================================
// SECCIÓN 10: Productos por Categoría
// ============================================================================
function renderCategorias() {
  const container = document.getElementById('examen-category-grid');
  if (!container) return;

  const categorias = {};

  examenState.productos.forEach(p => {
    const cat = p.categoria || 'Sin categoría';
    if (!categorias[cat]) {
      categorias[cat] = { count: 0, stockTotal: 0, valorTotal: 0 };
    }
    categorias[cat].count++;
    categorias[cat].stockTotal += (p.stock || 0);
    categorias[cat].valorTotal += ((p.stock || 0) * Number(p.precio || 0));
  });

  const catEntries = Object.entries(categorias).sort((a, b) => b[1].count - a[1].count);

  const iconMap = {
    'Electronics': 'devices',
    'electronics': 'devices',
    'Furniture': 'chair',
    'furniture': 'chair',
    'Clothing': 'checkroom',
    'clothing': 'checkroom',
    'Home': 'home',
    'home': 'home',
    'Jardín': 'yard',
    'jardín': 'yard',
    'Hogar': 'home',
    'hogar': 'home',
    'Sin categoría': 'category',
  };

  container.innerHTML = catEntries.map(([cat, data]) => {
    const icon = iconMap[cat] || 'category';
    return `
      <div class="examen-category-card">
        <span class="material-symbols-outlined examen-category-card__icon">${icon}</span>
        <h4 class="examen-category-card__name">${cat}</h4>
        <span class="examen-category-card__count">${data.count}</span>
        <span class="examen-category-card__stock-total">${data.stockTotal} unidades · $${data.valorTotal.toFixed(2)}</span>
      </div>`;
  }).join('');
}

