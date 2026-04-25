// ============================================================
// Mi Plata — Session Manager & App State v3.0
// Multi-usuario con persistencia en localStorage
// ============================================================

import { Cliente }         from '../Models/entities/Cliente.js';
import { Movimiento }      from '../Models/entities/Movimiento.js';
import { CuentaAhorros }   from '../Models/cuentas/CuentaAhorros.js';
import { CuentaCorriente } from '../Models/cuentas/CuentaCorriente.js';
import { TarjetaCredito }  from '../Models/cuentas/TarjetaCredito.js';
import EstadoCuenta        from '../Models/enums/EstadoCuenta.js';

const LS_SESSION  = 'miplata_session';
const LS_USERS    = 'miplata_users';
const LS_ATTEMPTS = 'miplata_attempts';

// ─── Serialización ────────────────────────────────────────────

function serMovimiento(m) {
  return {
    id: m.id,
    fechaHora: m.fechaHora instanceof Date ? m.fechaHora.toISOString() : m.fechaHora,
    tipo: m.tipo, valor: m.valor,
    saldoPosterior: m.saldoPosterior, descripcion: m.descripcion,
  };
}

function deserMovimiento(plain) {
  return new Movimiento(
    plain.id, new Date(plain.fechaHora), plain.tipo,
    plain.valor, plain.saldoPosterior, plain.descripcion
  );
}

function serializarUsuario(datos) {
  return {
    cliente: {
      id: datos.cliente.id, identificacion: datos.cliente.identificacion,
      nombreCompleto: datos.cliente.nombreCompleto, celular: datos.cliente.celular,
      usuario: datos.cliente.usuario, contrasena: datos.cliente.contrasena,
      intentosFallidos: datos.cliente.intentosFallidos, bloqueado: datos.cliente.bloqueado,
    },
    cuentas: {
      ahorros: {
        numeroCuenta: datos.cuentas.ahorros.numeroCuenta,
        saldo: datos.cuentas.ahorros.saldo,
        fechaApertura: datos.cuentas.ahorros.fechaApertura instanceof Date
          ? datos.cuentas.ahorros.fechaApertura.toISOString()
          : datos.cuentas.ahorros.fechaApertura,
        estado: datos.cuentas.ahorros.estado,
        movimientos: datos.cuentas.ahorros.movimientos.map(serMovimiento),
      },
      corriente: {
        numeroCuenta: datos.cuentas.corriente.numeroCuenta,
        saldo: datos.cuentas.corriente.saldo,
        fechaApertura: datos.cuentas.corriente.fechaApertura instanceof Date
          ? datos.cuentas.corriente.fechaApertura.toISOString()
          : datos.cuentas.corriente.fechaApertura,
        estado: datos.cuentas.corriente.estado,
        movimientos: datos.cuentas.corriente.movimientos.map(serMovimiento),
      },
      tarjeta: {
        numeroCuenta: datos.cuentas.tarjeta.numeroCuenta,
        cupo: datos.cuentas.tarjeta.cupo,
        saldo: datos.cuentas.tarjeta.saldo,
        deuda: datos.cuentas.tarjeta.deuda,
        fechaApertura: datos.cuentas.tarjeta.fechaApertura instanceof Date
          ? datos.cuentas.tarjeta.fechaApertura.toISOString()
          : datos.cuentas.tarjeta.fechaApertura,
        estado: datos.cuentas.tarjeta.estado,
        movimientos: datos.cuentas.tarjeta.movimientos.map(serMovimiento),
      },
    },
  };
}

function deserializarUsuario(p) {
  const cliente = new Cliente(
    p.cliente.id, p.cliente.identificacion, p.cliente.nombreCompleto,
    p.cliente.celular, p.cliente.usuario, p.cliente.contrasena,
    p.cliente.intentosFallidos, p.cliente.bloqueado
  );
  const ahorros = new CuentaAhorros(
    p.cuentas.ahorros.numeroCuenta, p.cuentas.ahorros.saldo,
    new Date(p.cuentas.ahorros.fechaApertura), p.cuentas.ahorros.estado
  );
  p.cuentas.ahorros.movimientos.forEach(m => ahorros._cargarMovimiento(deserMovimiento(m)));

  const corriente = new CuentaCorriente(
    p.cuentas.corriente.numeroCuenta, p.cuentas.corriente.saldo,
    new Date(p.cuentas.corriente.fechaApertura), p.cuentas.corriente.estado
  );
  p.cuentas.corriente.movimientos.forEach(m => corriente._cargarMovimiento(deserMovimiento(m)));

  const tarjeta = new TarjetaCredito(
    p.cuentas.tarjeta.numeroCuenta, p.cuentas.tarjeta.cupo,
    new Date(p.cuentas.tarjeta.fechaApertura), p.cuentas.tarjeta.estado
  );
  tarjeta.deuda = p.cuentas.tarjeta.deuda;
  tarjeta.saldo = p.cuentas.tarjeta.deuda;
  p.cuentas.tarjeta.movimientos.forEach(m => tarjeta._cargarMovimiento(deserMovimiento(m)));

  return { cliente, cuentas: { ahorros, corriente, tarjeta } };
}

// ─── Helpers ──────────────────────────────────────────────────

function generarNumeroCuenta(tipo) {
  const prefijos = { ahorros: '88', corriente: '48', tarjeta: '44' };
  return `${prefijos[tipo] || '00'}${Math.floor(Math.random() * 90000) + 10000}`;
}

function generarId() { return Date.now() + Math.floor(Math.random() * 1000); }

// ─── Almacén multi-usuario ────────────────────────────────────

function cargarTodosLosUsuarios() {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); }
  catch { return []; }
}

function guardarTodosLosUsuarios(usuarios) {
  try { localStorage.setItem(LS_USERS, JSON.stringify(usuarios)); }
  catch(e) { console.error('Error guardando usuarios:', e); }
}

// Migrar datos del esquema antiguo (miplata_state) al nuevo (miplata_users)
function migrarDatosAntiguos() {
  const oldRaw = localStorage.getItem('miplata_state');
  if (!oldRaw) return;
  try {
    const p = JSON.parse(oldRaw);
    const usuarios = cargarTodosLosUsuarios();
    if (!usuarios.find(u => u.cliente.usuario === p.cliente.usuario)) {
      usuarios.push(p);
      guardarTodosLosUsuarios(usuarios);
    }
    localStorage.removeItem('miplata_state');
  } catch {}
}

// Demo por defecto si no hay ningún usuario
function inicializarDemoSiVacio() {
  migrarDatosAntiguos();
  const usuarios = cargarTodosLosUsuarios();
  if (usuarios.length === 0) {
    const cliente   = new Cliente(1,'1-2345-6789','Alejandro Martínez Silva','+57 300 123 4567','alejandro','123456',0,false);
    const ahorros   = new CuentaAhorros('8829', 12450000, new Date('2022-03-15'), EstadoCuenta.ACTIVA);
    const corriente = new CuentaCorriente('4820', 3120500, new Date('2021-07-01'), EstadoCuenta.ACTIVA);
    const tarjeta   = new TarjetaCredito('4402', 10000000, new Date('2023-01-10'), EstadoCuenta.ACTIVA);
    tarjeta.deuda = 1760000; tarjeta.saldo = 1760000;
    const datos = { cliente, cuentas: { ahorros, corriente, tarjeta } };
    usuarios.push(serializarUsuario(datos));
    guardarTodosLosUsuarios(usuarios);
  }
}

inicializarDemoSiVacio();

// ─── Sesión activa ────────────────────────────────────────────

function cargarSesionActiva() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const { usuario } = JSON.parse(raw);
    const plain = cargarTodosLosUsuarios().find(u => u.cliente.usuario === usuario);
    return plain ? deserializarUsuario(plain) : null;
  } catch { return null; }
}

let _datos        = cargarSesionActiva();
let _sesionActiva = _datos ? _datos.cliente : null;

function syncEstado() {
  if (!_datos) return;
  const usuarios = cargarTodosLosUsuarios();
  const idx = usuarios.findIndex(u => u.cliente.usuario === _datos.cliente.usuario);
  const ser = serializarUsuario(_datos);
  if (idx >= 0) usuarios[idx] = ser; else usuarios.push(ser);
  guardarTodosLosUsuarios(usuarios);
}

// ─── AppState ─────────────────────────────────────────────────

export const AppState = {

  iniciarSesion(usuario, contrasena) {
    const usuarios = cargarTodosLosUsuarios();
    const plain = usuarios.find(u => u.cliente.usuario === usuario);
    if (!plain) {
      return { exito: false, bloqueado: false, intentosRestantes: 3, mensaje: 'Usuario no encontrado.' };
    }
    const datosTemp = deserializarUsuario(plain);
    const cliente = datosTemp.cliente;
    try {
      const att = JSON.parse(localStorage.getItem(LS_ATTEMPTS) || '{}');
      if (att[usuario]) {
        cliente.intentosFallidos = att[usuario].intentos || 0;
        cliente.bloqueado        = att[usuario].bloqueado || false;
      }
    } catch {}

    let ok;
    try { ok = cliente.autenticar(usuario, contrasena); }
    catch(e) { return { exito: false, bloqueado: true, intentosRestantes: 0, mensaje: e.message }; }

    const attData = JSON.parse(localStorage.getItem(LS_ATTEMPTS) || '{}');
    attData[usuario] = { intentos: cliente.intentosFallidos, bloqueado: cliente.bloqueado };
    localStorage.setItem(LS_ATTEMPTS, JSON.stringify(attData));

    if (ok) {
      _datos = datosTemp; _datos.cliente = cliente;
      _sesionActiva = cliente;
      localStorage.setItem(LS_SESSION, JSON.stringify({ usuario: cliente.usuario }));
      syncEstado();
      return { exito: true, cliente };
    }
    return {
      exito: false, bloqueado: cliente.bloqueado,
      intentosRestantes: cliente.intentosRestantes(),
      mensaje: cliente.bloqueado
        ? 'Cuenta bloqueada por exceso de intentos.'
        : `Credenciales incorrectas. Intentos restantes: ${cliente.intentosRestantes()}`,
    };
  },

  registrarUsuario({ identificacion, nombreCompleto, celular, usuario, contrasena }) {
    const usuarios = cargarTodosLosUsuarios();
    if (usuarios.find(u => u.cliente.usuario === usuario))
      throw new Error(`El nombre de usuario "${usuario}" ya está registrado.`);
    if (usuarios.find(u => u.cliente.identificacion === identificacion))
      throw new Error(`La identificación "${identificacion}" ya está registrada.`);

    const hoy = new Date();
    const cliente   = new Cliente(generarId(), identificacion, nombreCompleto, celular, usuario, contrasena, 0, false);
    const ahorros   = new CuentaAhorros(generarNumeroCuenta('ahorros'), 0, hoy, EstadoCuenta.ACTIVA);
    const corriente = new CuentaCorriente(generarNumeroCuenta('corriente'), 0, hoy, EstadoCuenta.ACTIVA);
    const tarjeta   = new TarjetaCredito(generarNumeroCuenta('tarjeta'), 5000000, hoy, EstadoCuenta.ACTIVA);
    tarjeta.deuda = 0; tarjeta.saldo = 0;
    const datos = { cliente, cuentas: { ahorros, corriente, tarjeta } };
    usuarios.push(serializarUsuario(datos));
    guardarTodosLosUsuarios(usuarios);
    return datos;
  },

  cerrarSesion() {
    if (_sesionActiva) _sesionActiva.cerrarSesion();
    _sesionActiva = null; _datos = null;
    localStorage.removeItem(LS_SESSION);
    window.location.replace('../iniciarSesion/iniciarSesion.html');
  },

  getClienteActivo()    { return _sesionActiva; },
  getCuentaAhorros()    { return _datos?.cuentas.ahorros; },
  getCuentaCorriente()  { return _datos?.cuentas.corriente; },
  getTarjetaCredito()   { return _datos?.cuentas.tarjeta; },
  guardar()             { syncEstado(); },

  requireAuth() {
    if (!_sesionActiva) {
      window.location.replace('../iniciarSesion/iniciarSesion.html');
      throw new Error('NO_AUTH');
    }
    return true;
  },

  // Busca un destinatario por usuario o número de cuenta
  buscarDestinatario(query) {
    const q = query.trim().toLowerCase();
    for (const plain of cargarTodosLosUsuarios()) {
      if (plain.cliente.usuario === _sesionActiva?.usuario) continue;
      const matchUser = plain.cliente.usuario.toLowerCase() === q;
      const matchAh   = plain.cuentas.ahorros.numeroCuenta === q;
      const matchCo   = plain.cuentas.corriente.numeroCuenta === q;
      if (matchUser || matchAh || matchCo) {
        return {
          nombreCompleto: plain.cliente.nombreCompleto,
          usuario: plain.cliente.usuario,
          numeroCuenta:  matchCo ? plain.cuentas.corriente.numeroCuenta : plain.cuentas.ahorros.numeroCuenta,
          tipoCuenta:    matchCo ? 'Corriente' : 'Ahorros',
        };
      }
    }
    return null;
  },

  // Transfiere fondos a un usuario externo
  transferirAOtroUsuario(cuentaOrigenTipo, usuarioDestino, monto, concepto = '') {
    if (!_datos) throw new Error('No hay sesión activa.');
    const usuarios = cargarTodosLosUsuarios();
    const idxDest = usuarios.findIndex(u => u.cliente.usuario === usuarioDestino);
    if (idxDest < 0) throw new Error('Destinatario no encontrado.');

    const origen = cuentaOrigenTipo === 'ahorros'
      ? _datos.cuentas.ahorros : _datos.cuentas.corriente;

    if (monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (monto > origen.saldo) throw new Error(`Fondos insuficientes. Saldo: ${formatCurrency(origen.saldo)}`);

    const datosDestino = deserializarUsuario(usuarios[idxDest]);
    const cuentaDest   = datosDestino.cuentas.ahorros;
    const desc = concepto || `Transferencia de ${_datos.cliente.nombreCompleto}`;

    // Débito
    origen.saldo -= monto;
    origen.registrarMovimiento(new Movimiento(
      origen.movimientos.length + 1, new Date(), 'TRANSFERENCIA_OUT', monto, origen.saldo,
      `Transferencia a ${datosDestino.cliente.nombreCompleto} — ${desc}`
    ));
    // Crédito
    cuentaDest.saldo += monto;
    cuentaDest.registrarMovimiento(new Movimiento(
      cuentaDest.movimientos.length + 1, new Date(), 'TRANSFERENCIA_IN', monto, cuentaDest.saldo,
      `Recibido de ${_datos.cliente.nombreCompleto} — ${desc}`
    ));

    usuarios[idxDest] = serializarUsuario(datosDestino);
    guardarTodosLosUsuarios(usuarios);
    syncEstado();
  },

  getTodosMovimientos() {
    if (!_datos) return [];
    const mapear = (lista, nom) => lista.map(m => { m.cuenta = nom; return m; });
    return [
      ...mapear(_datos.cuentas.ahorros.obtenerMovimientos(),   'Ahorros'),
      ...mapear(_datos.cuentas.corriente.obtenerMovimientos(), 'Corriente'),
      ...mapear(_datos.cuentas.tarjeta.obtenerMovimientos(),   'Tarjeta'),
    ].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
  },

  actualizarPerfil(nombreCompleto, celular) {
    _datos.cliente.nombreCompleto = nombreCompleto;
    _datos.cliente.celular = celular;
    if (_sesionActiva) { _sesionActiva.nombreCompleto = nombreCompleto; _sesionActiva.celular = celular; }
    syncEstado();
  },

  resetearDatos() {
    localStorage.removeItem(LS_USERS);
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_ATTEMPTS);
    window.location.reload();
  },
};

// ─── Utilidades ───────────────────────────────────────────────

export function formatCurrency(n) {
  return '$ ' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2 });
}

export function formatDate(d) {
  return new Date(d).toLocaleString('es-CO', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
  });
}

export function showToast(msg, type = 'success', duration = 3500) {
  document.querySelector('.toast')?.remove();
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), duration);
}

export function maskAccount(num) { return `•••• ${String(num).slice(-4)}`; }

export function buildSidebar(activeId) {
  const cliente = AppState.getClienteActivo();
  if (!cliente) return;
  const nav = [
    { id:'dashboard', icon:'⊞', label:'Dashboard',          href:'../GestionDeCuentas/GestionDeCuentas.html' },
    { id:'cuentas',   icon:'🏛', label:'Cuentas',            href:'../GestionDeCuentas/GestionDeCuentas.html' },
    { id:'tarjeta',   icon:'💳', label:'Tarjeta de Crédito', href:'../TarjetaCredito/TarjetaCredito.html' },
    { id:'transacc',  icon:'↔',  label:'Transacciones',      href:'../Transacciones/Transacciones.html' },
    { id:'historial', icon:'🕐', label:'Historial',           href:'../HistorialDeMovimientos/HistorialDeMovimientos.html' },
    { id:'perfil',    icon:'👤', label:'Perfil',              href:'../PerfilSeguridad/PerfilSeguridad.html' },
  ];
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const iniciales = cliente.nombreCompleto.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const ahorros   = AppState.getCuentaAhorros();
  const corriente = AppState.getCuentaCorriente();
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-name">Mi Plata</div>
      <div class="brand-sub">Banca Privada</div>
    </div>
    <div style="padding:12px 20px 10px;border-bottom:1px solid var(--gray-100);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0;">${iniciales}</div>
        <div style="overflow:hidden;">
          <div style="font-size:.8rem;font-weight:700;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cliente.nombreCompleto.split(' ')[0]}</div>
          <div style="font-size:.7rem;color:var(--gray-400);">@${cliente.usuario}</div>
        </div>
      </div>
      ${ahorros ? `<div style="font-size:.68rem;color:var(--gray-400);font-family:var(--font-mono);line-height:1.6;">
        🐷 ${ahorros.numeroCuenta} &nbsp;|&nbsp; 💼 ${corriente ? corriente.numeroCuenta : '----'}
      </div>` : ''}
    </div>
    <nav class="sidebar-nav">
      ${nav.map(item => `
        <a href="${item.href}" class="nav-item${item.id === activeId ? ' active' : ''}" data-page="${item.id}">
          <span class="nav-icon">${item.icon}</span>${item.label}
        </a>`).join('')}
    </nav>
    <div class="sidebar-footer">
      <button class="nav-item" onclick="window.appLogout()">
        <span class="nav-icon">↩</span> Cerrar Sesión
      </button>
      <button class="nav-item" onclick="alert('Ayuda próximamente.')">
        <span class="nav-icon">❓</span> Ayuda
      </button>
    </div>`;
  window.appLogout = () => AppState.cerrarSesion();
  window.AppState  = AppState;
}
