import { Cliente }         from '../Models/entities/Cliente.js';
import { Movimiento }      from '../Models/entities/Movimiento.js';
import { CuentaAhorros }   from '../Models/cuentas/CuentaAhorros.js';
import { CuentaCorriente } from '../Models/cuentas/CuentaCorriente.js';
import { TarjetaCredito }  from '../Models/cuentas/TarjetaCredito.js';
import EstadoCuenta        from '../Models/enums/EstadoCuenta.js';

const LS_SESSION     = 'miplata_session';
const LS_USERS       = 'miplata_users';
const LS_ATTEMPTS    = 'miplata_attempts';
const LS_CUPO_DIARIO = 'miplata_cupo_diario';

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
      correo: datos.cliente.correo || '',
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
        limiteSobregiroBase: datos.cuentas.corriente.limiteSobregiroBase,
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
        compras: (datos.cuentas.tarjeta.compras || []).map(c => ({
          ...c,
          fecha: c.fecha instanceof Date ? c.fecha.toISOString() : c.fecha,
        })),
      },
    },
  };
}

function deserializarUsuario(p) {
  const cliente = new Cliente(
    p.cliente.id, p.cliente.identificacion, p.cliente.nombreCompleto,
    p.cliente.celular, p.cliente.usuario, p.cliente.contrasena,
    p.cliente.intentosFallidos, p.cliente.bloqueado,
    p.cliente.correo || ''
  );
  const ahorros = new CuentaAhorros(
    p.cuentas.ahorros.numeroCuenta, p.cuentas.ahorros.saldo,
    new Date(p.cuentas.ahorros.fechaApertura), p.cuentas.ahorros.estado
  );
  p.cuentas.ahorros.movimientos.forEach(m => ahorros._cargarMovimiento(deserMovimiento(m)));

  const corriente = new CuentaCorriente(
    p.cuentas.corriente.numeroCuenta, p.cuentas.corriente.saldo,
    new Date(p.cuentas.corriente.fechaApertura), p.cuentas.corriente.estado,
    p.cuentas.corriente.limiteSobregiroBase ?? null
  );
  p.cuentas.corriente.movimientos.forEach(m => corriente._cargarMovimiento(deserMovimiento(m)));

  const tarjeta = new TarjetaCredito(
    p.cuentas.tarjeta.numeroCuenta, p.cuentas.tarjeta.cupo,
    new Date(p.cuentas.tarjeta.fechaApertura), p.cuentas.tarjeta.estado
  );
  p.cuentas.tarjeta.movimientos.forEach(m => tarjeta._cargarMovimiento(deserMovimiento(m)));
  (p.cuentas.tarjeta.compras || []).forEach(c => tarjeta._cargarCompra(c));
  if (p.cuentas.tarjeta.deuda !== undefined && p.cuentas.tarjeta.deuda !== null) {
    tarjeta.deuda = p.cuentas.tarjeta.deuda;
    tarjeta.saldo = p.cuentas.tarjeta.deuda;
  }

  return { cliente, cuentas: { ahorros, corriente, tarjeta } };
}

function generarNumeroCuenta(tipo) {
  const prefijos = { ahorros: '88', corriente: '48', tarjeta: '44' };
  return `${prefijos[tipo] || '00'}${Math.floor(Math.random() * 90000) + 10000}`;
}

function generarId() { return Date.now() + Math.floor(Math.random() * 1000); }

function cargarTodosLosUsuarios() {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); }
  catch { return []; }
}

function guardarTodosLosUsuarios(usuarios) {
  try { localStorage.setItem(LS_USERS, JSON.stringify(usuarios)); }
  catch(e) { console.error('Error guardando usuarios:', e); }
}

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

function inicializarDemoSiVacio() {
  migrarDatosAntiguos();
  const usuarios = cargarTodosLosUsuarios();
  if (usuarios.length === 0) {
    const cliente   = new Cliente(1,'1-2345-6789','Alejandro Martínez Silva','+57 300 123 4567','alejandro','123456',0,false,'alejandro@miplata.com');
    const ahorros   = new CuentaAhorros('8829', 12450000, new Date('2022-03-15'), EstadoCuenta.ACTIVA);
    const corriente = new CuentaCorriente('4820', 3120500, new Date('2021-07-01'), EstadoCuenta.ACTIVA);
    const tarjeta   = new TarjetaCredito('4402', 10000000, new Date('2023-01-10'), EstadoCuenta.ACTIVA);
    tarjeta.comprar(1760000, 12, 'Compra electrodomésticos');
    const datos = { cliente, cuentas: { ahorros, corriente, tarjeta } };
    usuarios.push(serializarUsuario(datos));
    guardarTodosLosUsuarios(usuarios);
  }
}

inicializarDemoSiVacio();

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

  registrarUsuario({ identificacion, nombreCompleto, celular, correo, usuario, contrasena }) {
    const usuarios = cargarTodosLosUsuarios();
    if (usuarios.find(u => u.cliente.usuario === usuario))
      throw new Error(`El nombre de usuario "${usuario}" ya está registrado.`);
    if (usuarios.find(u => u.cliente.identificacion === identificacion))
      throw new Error(`La identificación "${identificacion}" ya está registrada.`);
    if (correo && usuarios.find(u => (u.cliente.correo || '').toLowerCase() === correo.toLowerCase()))
      throw new Error(`El correo "${correo}" ya está registrado.`);

    const hoy = new Date();
    const cliente   = new Cliente(generarId(), identificacion, nombreCompleto, celular, usuario, contrasena, 0, false, correo || '');
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

  actualizarPerfil(nombreCompleto, celular, correo) {
    _datos.cliente.nombreCompleto = nombreCompleto;
    _datos.cliente.celular = celular;
    if (correo !== undefined) _datos.cliente.correo = correo;
    if (_sesionActiva) {
      _sesionActiva.nombreCompleto = nombreCompleto;
      _sesionActiva.celular = celular;
      if (correo !== undefined) _sesionActiva.correo = correo;
    }
    syncEstado();
  },

  resetearDatos() {
    localStorage.removeItem(LS_USERS);
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_ATTEMPTS);
    localStorage.removeItem(LS_CUPO_DIARIO);
    window.location.reload();
  },

  /* ─── Cupo diario de transferencias ────────────────────────────────
   * Persiste por usuario en localStorage. La ventana de tiempo es de
   * 24 horas: cuando han pasado 24h desde el primer uso, se resetea
   * automáticamente.
   * Estructura guardada:
   *   miplata_cupo_diario = {
   *     [usuario]: { usado: number, inicioVentana: ISO timestamp }
   *   }
   * ───────────────────────────────────────────────────────────────── */
  getCupoDiario() {
    if (!_sesionActiva) return { usado: 0, inicioVentana: null, resetEnMs: 0 };
    const VENTANA_MS = 24 * 60 * 60 * 1000; // 24 horas
    let store = {};
    try { store = JSON.parse(localStorage.getItem(LS_CUPO_DIARIO) || '{}'); } catch {}
    const usuario = _sesionActiva.usuario;
    const entry = store[usuario];
    const ahora = Date.now();

    if (!entry || !entry.inicioVentana) {
      return { usado: 0, inicioVentana: null, resetEnMs: VENTANA_MS };
    }
    const inicio = new Date(entry.inicioVentana).getTime();
    const transcurrido = ahora - inicio;
    if (transcurrido >= VENTANA_MS) {
      // Ventana expirada → reset automático
      delete store[usuario];
      localStorage.setItem(LS_CUPO_DIARIO, JSON.stringify(store));
      return { usado: 0, inicioVentana: null, resetEnMs: VENTANA_MS };
    }
    return {
      usado: entry.usado || 0,
      inicioVentana: entry.inicioVentana,
      resetEnMs: VENTANA_MS - transcurrido,
    };
  },

  agregarCupoDiario(monto) {
    if (!_sesionActiva) return;
    let store = {};
    try { store = JSON.parse(localStorage.getItem(LS_CUPO_DIARIO) || '{}'); } catch {}
    const usuario = _sesionActiva.usuario;
    const actual = this.getCupoDiario(); // aplica reset si corresponde
    const inicio = actual.inicioVentana || new Date().toISOString();
    store[usuario] = {
      usado: (actual.usado || 0) + monto,
      inicioVentana: inicio,
    };
    localStorage.setItem(LS_CUPO_DIARIO, JSON.stringify(store));
  },

  resetCupoDiario() {
    if (!_sesionActiva) return;
    let store = {};
    try { store = JSON.parse(localStorage.getItem(LS_CUPO_DIARIO) || '{}'); } catch {}
    delete store[_sesionActiva.usuario];
    localStorage.setItem(LS_CUPO_DIARIO, JSON.stringify(store));
  },
};

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
      <a href="../Ayuda/Ayuda.html" class="nav-item${activeId === 'ayuda' ? ' active' : ''}">
        <span class="nav-icon">❓</span> Ayuda
      </a>
    </div>`;
  window.appLogout = () => AppState.cerrarSesion();
  window.AppState  = AppState;
}

/* ============================================================================
 * GENERACIÓN DE EXTRACTOS EN PDF
 * ============================================================================
 * Usa jsPDF cargado vía CDN. Se carga bajo demanda la primera vez que se
 * solicita un PDF, para no penalizar la carga inicial del sitio.
 * ========================================================================== */

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const JSPDF_AUTOTABLE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
let _jsPdfLoadingPromise = null;

function _cargarScriptUnaVez(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(); return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

function _cargarJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
  if (_jsPdfLoadingPromise) return _jsPdfLoadingPromise;
  _jsPdfLoadingPromise = _cargarScriptUnaVez(JSPDF_CDN)
    .then(() => _cargarScriptUnaVez(JSPDF_AUTOTABLE_CDN));
  return _jsPdfLoadingPromise;
}

/**
 * Devuelve la cuenta solicitada por tipo: 'ahorros' | 'corriente' | 'tarjeta'.
 */
function _getCuentaPorTipo(tipo) {
  switch (tipo) {
    case 'ahorros':   return AppState.getCuentaAhorros();
    case 'corriente': return AppState.getCuentaCorriente();
    case 'tarjeta':   return AppState.getTarjetaCredito();
    default: throw new Error(`Tipo de cuenta no válido: ${tipo}`);
  }
}

/**
 * Filtra los movimientos de una cuenta en un mes/año determinado, en orden ASC.
 * mes: 1..12 (NO 0..11)
 */
export function obtenerMovimientosMes(tipoCuenta, mes, año) {
  const cuenta = _getCuentaPorTipo(tipoCuenta);
  if (!cuenta) return [];
  return cuenta.obtenerMovimientos()
    .filter(m => {
      const f = new Date(m.fechaHora);
      return f.getMonth() + 1 === mes && f.getFullYear() === año;
    })
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
}

/**
 * Calcula el saldo al inicio del mes (antes del primer movimiento del mes).
 * Si no hay movimientos en el mes, devuelve el saldo actual de la cuenta.
 */
export function calcularSaldoInicialMes(tipoCuenta, mes, año) {
  const cuenta = _getCuentaPorTipo(tipoCuenta);
  if (!cuenta) return 0;
  const movs = obtenerMovimientosMes(tipoCuenta, mes, año);
  if (movs.length === 0) return cuenta.saldo;
  const primero = movs[0];
  // El signo del movimiento depende del tipo:
  // CONSIGNACION / TRANSFERENCIA_IN suman al saldo
  // RETIRO / TRANSFERENCIA_OUT / COMPRA_TC / PAGO_TC restan (para cuentas de débito)
  const esIngreso = ['CONSIGNACION', 'TRANSFERENCIA_IN'].includes(primero.tipo);
  const esPagoTCenTarjeta = primero.tipo === 'PAGO_TC' && tipoCuenta === 'tarjeta';
  const esCompraEnTC = primero.tipo === 'COMPRA_TC' && tipoCuenta === 'tarjeta';
  let saldoAntes;
  if (esCompraEnTC) {
    // En TC, COMPRA_TC suma a la deuda → saldoPosterior = saldoPrevio + valor
    saldoAntes = primero.saldoPosterior - primero.valor;
  } else if (esPagoTCenTarjeta) {
    // En TC, PAGO_TC resta deuda → saldoPosterior = saldoPrevio - valor
    saldoAntes = primero.saldoPosterior + primero.valor;
  } else if (esIngreso) {
    saldoAntes = primero.saldoPosterior - primero.valor;
  } else {
    saldoAntes = primero.saldoPosterior + primero.valor;
  }
  return parseFloat(saldoAntes.toFixed(2));
}

const _NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function _tipoMovLabel(tipo) {
  return String(tipo || '').replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function _esIngresoParaCuenta(mov, tipoCuenta) {
  // Determina si el movimiento debe mostrarse como (+) o (-).
  const esPagoTCenTarjeta = mov.tipo === 'PAGO_TC' && tipoCuenta === 'tarjeta';
  if (tipoCuenta === 'tarjeta') {
    // En TC: PAGO_TC reduce deuda (positivo). COMPRA_TC aumenta deuda (negativo en términos de cupo).
    return esPagoTCenTarjeta;
  }
  return ['CONSIGNACION', 'TRANSFERENCIA_IN'].includes(mov.tipo);
}

function _aplicarHeaderPDF(doc, titulo, cliente, cuenta, periodo, tipoCuenta) {
  // Banner azul institucional
  doc.setFillColor(26, 58, 107); // --primary #1A3A6B
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Mi Plata', 15, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Banca Privada', 15, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(titulo, 195, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 195, 19, { align: 'right' });

  // Datos cliente
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  let y = 38;
  doc.setFont('helvetica', 'bold');
  doc.text('Titular:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.nombreCompleto, 35, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Identificación:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(cliente.identificacion), 42, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  const etiquetaCuenta = tipoCuenta === 'tarjeta' ? 'Tarjeta de Crédito:' : `Cuenta ${tipoCuenta === 'ahorros' ? 'de Ahorros' : 'Corriente'}:`;
  doc.text(etiquetaCuenta, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`•••• ${String(cuenta.numeroCuenta).slice(-4)}`, 60, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Período:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(periodo, 32, y);

  return y + 6;
}

function _aplicarFooterPDF(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      '© 2026 Mi Plata S.A. — Documento generado automáticamente, sin validez legal.',
      105, 290, { align: 'center' }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
  }
}

/**
 * Genera y descarga un extracto en PDF para cuenta de Ahorros o Corriente.
 */
export async function generarPDFExtractoSimple(tipoCuenta, mes, año) {
  try {
    await _cargarJsPDF();
  } catch (e) {
    showToast('No se pudo cargar el generador de PDF. Verifica tu conexión.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const cliente = AppState.getClienteActivo();
  const cuenta  = _getCuentaPorTipo(tipoCuenta);
  if (!cliente || !cuenta) {
    showToast('No se pudo generar el extracto: datos no disponibles.', 'error');
    return;
  }

  const movs = obtenerMovimientosMes(tipoCuenta, mes, año);
  const saldoInicial = calcularSaldoInicialMes(tipoCuenta, mes, año);
  const saldoFinal   = movs.length > 0 ? movs[movs.length - 1].saldoPosterior : cuenta.saldo;

  let totalIngresos = 0;
  let totalEgresos  = 0;
  movs.forEach(m => {
    if (_esIngresoParaCuenta(m, tipoCuenta)) totalIngresos += m.valor;
    else totalEgresos += m.valor;
  });

  const periodo = `${_NOMBRES_MES[mes - 1]} ${año}`;
  const tipoLabel = tipoCuenta === 'ahorros' ? 'CUENTA DE AHORROS' : 'CUENTA CORRIENTE';

  const doc = new jsPDF();
  let cursorY = _aplicarHeaderPDF(doc, `EXTRACTO ${tipoLabel}`, cliente, cuenta, periodo, tipoCuenta);

  // Sección Resumen
  cursorY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, cursorY, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 58, 107);
  doc.text('RESUMEN DEL PERÍODO', 17, cursorY + 5.5);
  cursorY += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const filas = [
    ['Saldo Inicial:',  formatCurrency(saldoInicial)],
    ['Total Ingresos:', `+ ${formatCurrency(totalIngresos)}`],
    ['Total Egresos:',  `- ${formatCurrency(totalEgresos)}`],
    ['Saldo Final:',    formatCurrency(saldoFinal)],
  ];
  filas.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, 100, cursorY);
    cursorY += 6;
  });

  cursorY += 4;

  // Sección de movimientos
  if (movs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('Sin movimientos registrados en este período.', 15, cursorY + 6);
  } else {
    doc.autoTable({
      startY: cursorY,
      head: [['Fecha', 'Tipo', 'Descripción', 'Valor', 'Saldo']],
      body: movs.map(m => {
        const esIngreso = _esIngresoParaCuenta(m, tipoCuenta);
        return [
          new Date(m.fechaHora).toLocaleDateString('es-CO'),
          _tipoMovLabel(m.tipo),
          m.descripcion || '-',
          `${esIngreso ? '+' : '-'} ${formatCurrency(m.valor)}`,
          formatCurrency(m.saldoPosterior),
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 58, 107], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 28 },
        2: { cellWidth: 70 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });
  }

  _aplicarFooterPDF(doc);

  const nombreArchivo = `Extracto-${tipoCuenta}-${String(mes).padStart(2,'0')}-${año}.pdf`;
  doc.save(nombreArchivo);
  showToast(`Extracto descargado: ${nombreArchivo}`, 'success');
}

/**
 * Genera y descarga un extracto en PDF completo para Tarjeta de Crédito:
 * incluye resumen, tabla de amortización, compras y movimientos del mes.
 */
export async function generarPDFTarjetaCredito(mes, año) {
  try {
    await _cargarJsPDF();
  } catch (e) {
    showToast('No se pudo cargar el generador de PDF. Verifica tu conexión.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const cliente = AppState.getClienteActivo();
  const tc = AppState.getTarjetaCredito();
  if (!cliente || !tc) {
    showToast('No se pudo generar el extracto: datos no disponibles.', 'error');
    return;
  }

  const periodo = `${_NOMBRES_MES[mes - 1]} ${año}`;
  const doc = new jsPDF();
  let cursorY = _aplicarHeaderPDF(doc, 'EXTRACTO TARJETA DE CRÉDITO', cliente, tc, periodo, 'tarjeta');

  // ============ Sección 1: Resumen de crédito ============
  cursorY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, cursorY, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 58, 107);
  doc.text('RESUMEN DE CRÉDITO', 17, cursorY + 5.5);
  cursorY += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const usadoPct = tc.cupo > 0 ? ((tc.deuda / tc.cupo) * 100).toFixed(1) : '0.0';
  const resumen = [
    ['Límite de Crédito:',  formatCurrency(tc.cupo)],
    ['Deuda Actual:',       formatCurrency(tc.deuda)],
    ['Cupo Disponible:',    formatCurrency(tc.cupoDisponible)],
    ['Utilización:',        `${usadoPct} %`],
    ['Próxima Cuota Total:', formatCurrency(tc.proximaCuotaTotal)],
    ['Cuotas Pendientes:',  String(tc.cuotasPendientesTotales)],
  ];
  resumen.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, 100, cursorY);
    cursorY += 6;
  });
  cursorY += 4;

  // ============ Sección 2: Tabla de Amortización ============
  const activas = tc.comprasActivas;
  if (activas.length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.rect(15, cursorY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 58, 107);
    doc.text('TABLA DE AMORTIZACIÓN — PRÓXIMAS CUOTAS', 17, cursorY + 5.5);
    cursorY += 12;

    // Calculamos siguientes cuotas a pagar para cada compra activa
    const filasAmort = [];
    activas.forEach(c => {
      const cuotasFaltantes = c.cuotasTotales - c.cuotasPagadas;
      // Mostramos hasta las próximas 3 cuotas de cada compra
      const cuotasMostrar = Math.min(cuotasFaltantes, 3);
      const interesPorCuota = parseFloat((c.cuotaMensual - c.capitalPorCuota).toFixed(2));
      for (let i = 1; i <= cuotasMostrar; i++) {
        const numCuota = c.cuotasPagadas + i;
        filasAmort.push([
          c.descripcion || 'Compra',
          `${numCuota}/${c.cuotasTotales}`,
          formatCurrency(c.cuotaMensual),
          formatCurrency(c.capitalPorCuota),
          formatCurrency(interesPorCuota),
        ]);
      }
    });

    doc.autoTable({
      startY: cursorY,
      head: [['Compra', 'Cuota', 'Cuota Mensual', 'Capital', 'Interés']],
      body: filasAmort,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 58, 107], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  }

  // ============ Sección 3: Compras a Crédito ============
  if (tc.compras && tc.compras.length > 0) {
    if (cursorY > 240) { doc.addPage(); cursorY = 20; }
    doc.setFillColor(241, 245, 249);
    doc.rect(15, cursorY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 58, 107);
    doc.text('COMPRAS A CRÉDITO', 17, cursorY + 5.5);
    cursorY += 12;

    doc.autoTable({
      startY: cursorY,
      head: [['Descripción', 'Monto', 'Plazo', 'Cuota', 'Estado', 'Saldo']],
      body: tc.compras.map(c => [
        c.descripcion || 'Compra',
        formatCurrency(c.montoOriginal),
        `${c.cuotasPagadas}/${c.cuotasTotales}`,
        formatCurrency(c.cuotaMensual),
        c.estado === 'pagada' ? 'Pagada' : 'Activa',
        formatCurrency(c.saldoPendiente),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 58, 107], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 28, halign: 'right' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  }

  // ============ Sección 4: Movimientos del Mes ============
  const movs = obtenerMovimientosMes('tarjeta', mes, año);
  if (cursorY > 240) { doc.addPage(); cursorY = 20; }
  doc.setFillColor(241, 245, 249);
  doc.rect(15, cursorY, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 58, 107);
  doc.text(`MOVIMIENTOS DEL PERÍODO — ${periodo.toUpperCase()}`, 17, cursorY + 5.5);
  cursorY += 12;

  if (movs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('Sin movimientos registrados en este período.', 15, cursorY + 6);
  } else {
    doc.autoTable({
      startY: cursorY,
      head: [['Fecha', 'Tipo', 'Descripción', 'Valor', 'Deuda']],
      body: movs.map(m => {
        const esIngreso = _esIngresoParaCuenta(m, 'tarjeta');
        return [
          new Date(m.fechaHora).toLocaleDateString('es-CO'),
          _tipoMovLabel(m.tipo),
          m.descripcion || '-',
          `${esIngreso ? '-' : '+'} ${formatCurrency(m.valor)}`,
          formatCurrency(m.saldoPosterior),
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 58, 107], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 28 },
        2: { cellWidth: 70 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  }

  // ============ Footer informativo ============
  if (cursorY > 270) { doc.addPage(); cursorY = 20; }
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'italic');
  const fechaPagoMin = new Date(año, mes, 5).toLocaleDateString('es-CO');
  doc.text(`Recordatorio: el pago mínimo sugerido vence el ${fechaPagoMin}.`, 15, cursorY + 6);
  doc.text(`Cuota total a pagar este mes: ${formatCurrency(tc.proximaCuotaTotal)}`, 15, cursorY + 12);

  _aplicarFooterPDF(doc);

  const nombreArchivo = `Extracto-TC-${String(mes).padStart(2,'0')}-${año}.pdf`;
  doc.save(nombreArchivo);
  showToast(`Extracto descargado: ${nombreArchivo}`, 'success');
}
