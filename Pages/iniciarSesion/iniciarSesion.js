import { AppState, showToast } from '../../assets/app.js';

// ── DOM refs ──────────────────────────────────────────────────
const form          = document.getElementById('loginForm');
const inputUsuario  = document.getElementById('usuario');
const inputPass     = document.getElementById('contrasena');
const btnLogin      = document.getElementById('btnLogin');
const btnTogglePw   = document.getElementById('togglePw');
const intentosAlert = document.getElementById('intentosAlert');
const intentosMsg   = document.getElementById('intentosMsg');
const intentosFill  = document.getElementById('intentosFill');
const btnRegistrar  = document.getElementById('btnRegistrar');

// ── Toggle password visibility ───────────────────────────────
btnTogglePw.addEventListener('click', () => {
  const isPass = inputPass.type === 'password';
  inputPass.type = isPass ? 'text' : 'password';
  btnTogglePw.textContent = isPass ? '👁' : '🔒';
});

// ── Form submit ───────────────────────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const usuario  = inputUsuario.value.trim();
  const contrasena = inputPass.value;

  // Validación básica de campos vacíos
  if (!usuario || !contrasena) {
    marcarError(inputUsuario, !usuario);
    marcarError(inputPass, !contrasena);
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Verificando...';

  // Simular pequeño delay (experiencia real)
  setTimeout(() => {
    const resultado = AppState.iniciarSesion(usuario, contrasena);

    if (resultado.exito) {
      btnLogin.textContent = '✅ Acceso concedido';
      showToast(`Bienvenido, ${resultado.cliente.nombreCompleto}`, 'success');
      setTimeout(() => {
        window.location.replace('../GestionDeCuentas/GestionDeCuentas.html');
      }, 800);
    } else {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Iniciar Sesión Segura →';

      // Shake en el formulario
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 400);

      marcarError(inputUsuario, true);
      marcarError(inputPass, true);

      // Mostrar alerta de intentos
      actualizarIntentos(resultado.intentosRestantes, resultado.bloqueado);

      if (resultado.bloqueado) {
        btnLogin.disabled = true;
        btnLogin.textContent = '🔒 Cuenta Bloqueada';
        showToast('Cuenta bloqueada. Contacte al administrador.', 'error', 6000);
      }
    }
  }, 500);
});

// ── Helpers ───────────────────────────────────────────────────
function marcarError(input, hasError) {
  input.classList.toggle('error', hasError);
  input.classList.toggle('success', !hasError && input.value.length > 0);
}

function actualizarIntentos(restantes, bloqueado) {
  intentosAlert.classList.remove('hidden');
  const fallidos = 3 - restantes;
  intentosMsg.textContent = bloqueado
    ? '🔒 Cuenta bloqueada por exceso de intentos'
    : `Intentos fallidos: ${fallidos}/3`;
  const porcentaje = (fallidos / 3) * 100;
  intentosFill.style.width = `${porcentaje}%`;
}

// ── Clear errors on input ────────────────────────────────────
[inputUsuario, inputPass].forEach(input => {
  input.addEventListener('input', () => {
    input.classList.remove('error');
  });
});

// ── Registrar ────────────────────────────────────────────────
btnRegistrar.addEventListener('click', () => {
  window.location.href = '../registrar/registrar.html';
});

// ── Hint para demo ───────────────────────────────────────────
console.info(
  '%c🏦 Mi Plata Demo\n' +
  '%cUsuario: alejandro | Contraseña: 123456',
  'font-size:14px; font-weight:bold; color:#2563EB',
  'font-size:12px; color:#64748B'
);
