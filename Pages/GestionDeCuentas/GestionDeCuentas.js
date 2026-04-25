import { AppState, formatCurrency, showToast, buildSidebar, maskAccount } from '../../assets/app.js';

// ── Auth guard — detiene ejecución si no hay sesión ───────────
try { AppState.requireAuth(); } catch(e) { if(e.message==='NO_AUTH') throw e; }

// ── Build sidebar ─────────────────────────────────────────────
buildSidebar('dashboard');

// ── DOM refs ──────────────────────────────────────────────────
const greeting       = document.getElementById('greeting');
const saldoAhorros   = document.getElementById('saldoAhorros');
const numAhorros     = document.getElementById('numAhorros');
const saldoCorriente = document.getElementById('saldoCorriente');
const sobregiroInfo  = document.getElementById('sobregiroInfo');
const sobregiroBar   = document.getElementById('sobregiroBar');
const numTarjeta     = document.getElementById('numTarjeta');
const cupoTarjeta    = document.getElementById('cupoTarjeta');
const actividadList  = document.getElementById('actividadList');
const btnConsignar   = document.getElementById('btnConsignar');
const btnTransferir  = document.getElementById('btnTransferir');
const modalConsignar    = document.getElementById('modalConsignar');
const closeConsignar    = document.getElementById('closeConsignar');
const confirmarConsignar= document.getElementById('confirmarConsignar');
const montoConsignar    = document.getElementById('montoConsignar');
const errorConsignar    = document.getElementById('errorConsignar');
const cuentaConsignar   = document.getElementById('cuentaConsignar');

// ── Render dashboard ──────────────────────────────────────────
function renderDashboard() {
  const cliente   = AppState.getClienteActivo();
  const ahorros   = AppState.getCuentaAhorros();
  const corriente = AppState.getCuentaCorriente();
  const tarjeta   = AppState.getTarjetaCredito();

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  greeting.textContent = `${saludo}, ${cliente.nombreCompleto.split(' ')[0]}`;

  // Números de cuenta reales (no hardcodeados)
  numAhorros.textContent    = ahorros.numeroCuenta;
  saldoAhorros.textContent  = formatCurrency(ahorros.saldo);

  // Número de cuenta corriente
  const numCorrienteEl = document.getElementById('numCorriente');
  if (numCorrienteEl) numCorrienteEl.textContent = corriente.numeroCuenta;
  saldoCorriente.textContent = formatCurrency(corriente.saldo);
  const limite = corriente.calcularLimiteSobregiro();
  const usado  = corriente.saldo < 0 ? Math.abs(corriente.saldo) : 0;
  const pct    = limite > 0 ? (usado / limite) * 100 : 0;
  sobregiroInfo.textContent = `${formatCurrency(usado)} / ${formatCurrency(limite)}`;
  sobregiroBar.style.width  = `${Math.min(pct, 100)}%`;

  numTarjeta.textContent   = `•••• •••• •••• ${tarjeta.numeroCuenta}`;
  cupoTarjeta.textContent  = formatCurrency(tarjeta.cupoDisponible);

  // Actualizar opciones del modal con números de cuenta reales del usuario activo
  const modalOptAhorros   = document.getElementById('modalOptAhorros');
  const modalOptCorriente = document.getElementById('modalOptCorriente');
  if (modalOptAhorros)   modalOptAhorros.textContent   = `Ahorros — ${ahorros.numeroCuenta} (${formatCurrency(ahorros.saldo)})`;
  if (modalOptCorriente) modalOptCorriente.textContent = `Corriente — ${corriente.numeroCuenta} (${formatCurrency(corriente.saldo)})`;

  renderActividad();
}

const iconosMovimiento = {
  CONSIGNACION:     { icon: '🏛', color: '#DCFCE7' },
  RETIRO:           { icon: '💸', color: '#FEE2E2' },
  TRANSFERENCIA_OUT:{ icon: '↗',  color: '#FEE2E2' },
  TRANSFERENCIA_IN: { icon: '↙',  color: '#DCFCE7' },
  COMPRA_TC:        { icon: '🛍', color: '#FEF3C7' },
  PAGO_TC:          { icon: '✅', color: '#DCFCE7' },
};

function renderActividad() {
  const movimientos = AppState.getTodosMovimientos().slice(0, 4);
  if (movimientos.length === 0) {
    actividadList.innerHTML = `<p class="text-muted text-sm" style="text-align:center;padding:20px;">Sin movimientos aún.</p>`;
    return;
  }
  actividadList.innerHTML = movimientos.map(m => {
    const meta      = iconosMovimiento[m.tipo] || { icon: '💰', color: '#F1F5F9' };
    const esPositivo= ['CONSIGNACION','TRANSFERENCIA_IN','PAGO_TC'].includes(m.tipo);
    const fechaStr  = new Date(m.fechaHora).toLocaleDateString('es-CO', { day:'2-digit', month:'short' });
    return `
      <div class="actividad-item">
        <div class="actividad-icon" style="background:${meta.color};">${meta.icon}</div>
        <div class="actividad-info">
          <div class="actividad-nombre">${m.descripcion.split('|')[0].trim()}</div>
          <div class="actividad-detalle">${fechaStr} • ${m.cuenta}</div>
        </div>
        <div class="actividad-monto ${esPositivo ? 'amount-positive' : 'amount-negative'}">
          ${esPositivo ? '+' : '-'} ${formatCurrency(m.valor)}
        </div>
      </div>`;
  }).join('');
}

// ── Modal Consignar ───────────────────────────────────────────
function abrirModal() {
  montoConsignar.value = '';
  montoConsignar.classList.remove('error');
  errorConsignar.classList.add('hidden');
  modalConsignar.classList.remove('hidden');
  // Asegurar que el modal sea visible incluso si .hidden falla
  modalConsignar.style.display = 'flex';
  setTimeout(() => montoConsignar.focus(), 50);
}

function cerrarModal() {
  modalConsignar.classList.add('hidden');
  modalConsignar.style.display = 'none';
  montoConsignar.value = '';
  montoConsignar.classList.remove('error');
  errorConsignar.classList.add('hidden');
}

// Asegurar que el modal esté cerrado al cargar la página
cerrarModal();

btnConsignar.addEventListener('click', abrirModal);
closeConsignar.addEventListener('click', cerrarModal);
modalConsignar.addEventListener('click', (e) => { if (e.target === modalConsignar) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

confirmarConsignar.addEventListener('click', () => {
  const rawValue = String(montoConsignar.value).trim().replace(',', '.');
  const monto    = parseFloat(rawValue);

  if (isNaN(monto) || monto <= 0) {
    errorConsignar.textContent = '⚠ El monto debe ser un número mayor a 0';
    errorConsignar.classList.remove('hidden');
    montoConsignar.classList.add('error');
    montoConsignar.focus();
    return;
  }

  try {
    const cuenta = cuentaConsignar.value === 'ahorros'
      ? AppState.getCuentaAhorros()
      : AppState.getCuentaCorriente();
    cuenta.consignar(monto);
    AppState.guardar();
    cerrarModal();
    showToast(`✅ Consignación de ${formatCurrency(monto)} realizada.`, 'success');
    renderDashboard();
  } catch (err) {
    errorConsignar.textContent = '⚠ ' + err.message;
    errorConsignar.classList.remove('hidden');
    montoConsignar.classList.add('error');
  }
});

montoConsignar.addEventListener('input', () => {
  errorConsignar.classList.add('hidden');
  montoConsignar.classList.remove('error');
});

// ── Botón Transferir ──────────────────────────────────────────
btnTransferir.addEventListener('click', () => {
  window.location.href = '../Transacciones/Transacciones.html';
});

// ── Init ──────────────────────────────────────────────────────
renderDashboard();
