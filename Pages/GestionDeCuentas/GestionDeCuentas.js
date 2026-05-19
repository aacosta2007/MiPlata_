import { AppState, formatCurrency, showToast, buildSidebar, maskAccount,
         generarPDFExtractoSimple, generarPDFTarjetaCredito } from '../../assets/app.js';

try { AppState.requireAuth(); } catch(e) { if(e.message==='NO_AUTH') throw e; }

buildSidebar('dashboard');

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
const btnRetirar     = document.getElementById('btnRetirar');
const btnTransferir  = document.getElementById('btnTransferir');
const modalConsignar    = document.getElementById('modalConsignar');
const closeConsignar    = document.getElementById('closeConsignar');
const confirmarConsignar= document.getElementById('confirmarConsignar');
const montoConsignar    = document.getElementById('montoConsignar');
const errorConsignar    = document.getElementById('errorConsignar');
const cuentaConsignar   = document.getElementById('cuentaConsignar');
const modalRetirar      = document.getElementById('modalRetirar');
const closeRetirar      = document.getElementById('closeRetirar');
const confirmarRetirar  = document.getElementById('confirmarRetirar');
const montoRetirar      = document.getElementById('montoRetirar');
const errorRetirar      = document.getElementById('errorRetirar');
const cuentaRetirar     = document.getElementById('cuentaRetirar');
const infoRetirarTxt    = document.getElementById('infoRetirarTxt');

function renderDashboard() {
  const cliente   = AppState.getClienteActivo();
  const ahorros   = AppState.getCuentaAhorros();
  const corriente = AppState.getCuentaCorriente();
  const tarjeta   = AppState.getTarjetaCredito();

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  greeting.textContent = `${saludo}, ${cliente.nombreCompleto.split(' ')[0]}`;

  numAhorros.textContent    = ahorros.numeroCuenta;
  saldoAhorros.textContent  = formatCurrency(ahorros.saldo);

  const numCorrienteEl = document.getElementById('numCorriente');
  if (numCorrienteEl) numCorrienteEl.textContent = corriente.numeroCuenta;
  saldoCorriente.textContent = formatCurrency(corriente.saldo);
  const limite = corriente.calcularLimiteSobregiro();
  const usado  = corriente.sobregiroUtilizado();
  const pct    = corriente.porcentajeSobregiroUsado();
  sobregiroInfo.textContent = `${formatCurrency(usado)} / ${formatCurrency(limite)}`;
  sobregiroBar.style.width  = `${Math.min(pct, 100)}%`;

  // Porcentaje numérico + color de riesgo (azul <50%, naranja 50-80%, rojo >80%)
  const sobregiroPorc = document.getElementById('sobregiroPorc');
  if (sobregiroPorc) {
    sobregiroPorc.textContent = `${Math.round(pct)}%`;
    let color = 'var(--accent)';
    if (pct >= 100) color = 'var(--error)';
    else if (pct >= 80) color = 'var(--error)';
    else if (pct >= 50) color = 'var(--warning)';
    sobregiroPorc.style.color = color;
    sobregiroBar.style.background = color;
  }

  numTarjeta.textContent   = `•••• •••• •••• ${tarjeta.numeroCuenta}`;
  cupoTarjeta.textContent  = formatCurrency(tarjeta.cupoDisponible);

  const modalOptAhorros   = document.getElementById('modalOptAhorros');
  const modalOptCorriente = document.getElementById('modalOptCorriente');
  if (modalOptAhorros)   modalOptAhorros.textContent   = `Ahorros — ${ahorros.numeroCuenta} (${formatCurrency(ahorros.saldo)})`;
  if (modalOptCorriente) modalOptCorriente.textContent = `Corriente — ${corriente.numeroCuenta} (${formatCurrency(corriente.saldo)})`;

  const modalRetOptAhorros   = document.getElementById('modalRetOptAhorros');
  const modalRetOptCorriente = document.getElementById('modalRetOptCorriente');
  if (modalRetOptAhorros)   modalRetOptAhorros.textContent   = `Ahorros — ${ahorros.numeroCuenta} (${formatCurrency(ahorros.saldo)})`;
  if (modalRetOptCorriente) modalRetOptCorriente.textContent = `Corriente — ${corriente.numeroCuenta} (${formatCurrency(corriente.saldo)})`;

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
    const esPagoTCenTarjeta = m.tipo === 'PAGO_TC' && m.cuenta === 'Tarjeta';
    const esPositivo= ['CONSIGNACION','TRANSFERENCIA_IN'].includes(m.tipo) || esPagoTCenTarjeta;
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

function abrirModal() {
  montoConsignar.value = '';
  montoConsignar.classList.remove('error');
  errorConsignar.classList.add('hidden');
  modalConsignar.classList.remove('hidden');
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

function actualizarInfoRetirar() {
  if (cuentaRetirar.value === 'ahorros') {
    infoRetirarTxt.textContent = 'Cuentas de Ahorros cobran 1.5% de interés sobre el retiro.';
  } else {
    infoRetirarTxt.textContent = 'Cuenta Corriente permite sobregiro hasta el 20% del saldo positivo.';
  }
}

function abrirModalRetirar() {
  montoRetirar.value = '';
  montoRetirar.classList.remove('error');
  errorRetirar.classList.add('hidden');
  actualizarInfoRetirar();
  modalRetirar.classList.remove('hidden');
  modalRetirar.style.display = 'flex';
  setTimeout(() => montoRetirar.focus(), 50);
}

function cerrarModalRetirar() {
  modalRetirar.classList.add('hidden');
  modalRetirar.style.display = 'none';
  montoRetirar.value = '';
  montoRetirar.classList.remove('error');
  errorRetirar.classList.add('hidden');
}

cerrarModalRetirar();

btnRetirar.addEventListener('click', abrirModalRetirar);
closeRetirar.addEventListener('click', cerrarModalRetirar);
modalRetirar.addEventListener('click', (e) => { if (e.target === modalRetirar) cerrarModalRetirar(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModalRetirar(); });
cuentaRetirar.addEventListener('change', actualizarInfoRetirar);

confirmarRetirar.addEventListener('click', () => {
  const rawValue = String(montoRetirar.value).trim().replace(',', '.');
  const monto    = parseFloat(rawValue);

  if (isNaN(monto) || monto <= 0) {
    errorRetirar.textContent = '⚠ El monto debe ser un número mayor a 0';
    errorRetirar.classList.remove('hidden');
    montoRetirar.classList.add('error');
    montoRetirar.focus();
    return;
  }

  try {
    const cuenta = cuentaRetirar.value === 'ahorros'
      ? AppState.getCuentaAhorros()
      : AppState.getCuentaCorriente();
    cuenta.retirar(monto);
    AppState.guardar();
    cerrarModalRetirar();
    showToast(`✅ Retiro de ${formatCurrency(monto)} realizado.`, 'success');
    renderDashboard();
  } catch (err) {
    errorRetirar.textContent = '⚠ ' + err.message;
    errorRetirar.classList.remove('hidden');
    montoRetirar.classList.add('error');
  }
});

montoRetirar.addEventListener('input', () => {
  errorRetirar.classList.add('hidden');
  montoRetirar.classList.remove('error');
});

btnTransferir.addEventListener('click', () => {
  window.location.href = '../Transacciones/Transacciones.html';
});

/* ─── Descarga de extractos en PDF ─────────────────────────────────── */
const hoy = new Date();
const mesActual = hoy.getMonth() + 1;
const añoActual = hoy.getFullYear();

document.getElementById('downloadAhorrosBtn')?.addEventListener('click', () => {
  showToast('Generando extracto de Ahorros...', 'success', 1500);
  generarPDFExtractoSimple('ahorros', mesActual, añoActual);
});

document.getElementById('downloadCorrienteBtn')?.addEventListener('click', () => {
  showToast('Generando extracto de Corriente...', 'success', 1500);
  generarPDFExtractoSimple('corriente', mesActual, añoActual);
});

document.getElementById('downloadTarjetaBtn')?.addEventListener('click', () => {
  showToast('Generando extracto de Tarjeta de Crédito...', 'success', 1500);
  generarPDFTarjetaCredito(mesActual, añoActual);
});

document.getElementById('downloadAllBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  showToast('Generando los 3 extractos...', 'success', 2000);
  await generarPDFExtractoSimple('ahorros', mesActual, añoActual);
  await generarPDFExtractoSimple('corriente', mesActual, añoActual);
  await generarPDFTarjetaCredito(mesActual, añoActual);
});

renderDashboard();
