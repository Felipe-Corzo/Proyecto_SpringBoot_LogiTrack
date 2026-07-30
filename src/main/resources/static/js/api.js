const TOKEN_KEY = 'lt_token';
const USER_KEY = 'lt_usuario';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUsuarioActual() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function guardarSesion({ token, userId, username, rol }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ id: userId, username, rol }));
}

function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/index.html';
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
   
    const response = await fetch(path, { ...options, headers });
   
    // Un 401 en /auth/login es 'credenciales incorrectas', NO sesion expirada.
    // No debe cerrar sesion ni redirigir; debe dejar que el propio formulario
    // muestre su mensaje de error.
    if (response.status === 401) {
      if (path === '/api/auth/login') {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Usuario o contraseña incorrectos');
      }
      cerrarSesion();
      throw new Error('Sesion expirada, inicia sesion de nuevo');
    }
    if (response.status === 403) {
      throw new Error('No tienes permisos para esta accion');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
  }

// --- Guardas de ruta, usar al inicio de cada pagina interna ---
function protegerRuta() {
  if (!getToken()) window.location.href = '../index.html';
}

function protegerRutaAdmin() {
  const usuario = getUsuarioActual();
  if (!usuario || usuario.rol !== 'ADMIN') {
    UIKit.toast('Solo un administrador puede ver la Auditoría.', 'error');
    window.location.href = 'dashboard.html';
  }
}

// --- Ocultar elementos de la UI según el rol del usuario ---
function ajustarMenuSegunRol() {
  const usuario = getUsuarioActual();
  if (!usuario) return;
  
  // Auditoría solo para ADMIN
  document.querySelectorAll('a[href="auditoria.html"]').forEach((link) => {
    if (usuario.rol !== 'ADMIN') link.style.display = 'none';
  });
  document.querySelectorAll('.mobile-nav__link[href="auditoria.html"]').forEach((link) => {
    if (usuario.rol !== 'ADMIN') link.style.display = 'none';
  });
  // Examen solo para ADMIN
  document.querySelectorAll('a[href="examen.html"]').forEach((link) => {
    if (usuario.rol !== 'ADMIN') link.style.display = 'none';
  });
  document.querySelectorAll('.mobile-nav__link[href="examen.html"]').forEach((link) => {
    if (usuario.rol !== 'ADMIN') link.style.display = 'none';
  });

  // Si es EMPLEADO, ocultar botones de crear/editar/eliminar en Bodegas
  if (usuario.rol === 'EMPLEADO') {
    // Botón "Nueva Bodega" en la toolbar
    const btnNuevaBodega = document.getElementById('open-create-modal-btn');
    if (btnNuevaBodega) btnNuevaBodega.style.display = 'none';
    
    // Botón "Filtros" se mantiene visible
    // Botones de eliminar en acciones se manejan desde renderBodegas() y renderProductos()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ajustarMenuSegunRol();
});