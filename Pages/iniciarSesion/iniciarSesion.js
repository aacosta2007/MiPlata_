import { AppState, showToast } from '../../assets/app.js';

const form          = document.getElementById('loginForm');
const inputUsuario  = document.getElementById('usuario');
const inputPass     = document.getElementById('contrasena');
const btnLogin      = document.getElementById('btnLogin');
const btnTogglePw   = document.getElementById('togglePw');
const intentosAlert = document.getElementById('intentosAlert');
const intentosMsg   = document.getElementById('intentosMsg');
const intentosFill  = document.getElementById('intentosFill');
const btnRegistrar  = document.getElementById('btnRegistrar');

btnTogglePw.addEventListener('click', () => {
  const isPass = inputPass.type === 'password';
  inputPass.type = isPass ? 'text' : 'password';
  btnTogglePw.textContent = isPass ? '👁' : '🔒';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const usuario  = inputUsuario.value.trim();
  const contrasena = inputPass.value;

  if (!usuario || !contrasena) {
    marcarError(inputUsuario, !usuario);
    marcarError(inputPass, !contrasena);
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Verificando...';

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

      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 400);

      marcarError(inputUsuario, true);
      marcarError(inputPass, true);

      actualizarIntentos(resultado.intentosRestantes, resultado.bloqueado);

      if (resultado.bloqueado) {
        btnLogin.disabled = true;
        btnLogin.textContent = '🔒 Cuenta Bloqueada';
        showToast('Cuenta bloqueada. Contacte al administrador.', 'error', 6000);
      }
    }
  }, 500);
});

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

[inputUsuario, inputPass].forEach(input => {
  input.addEventListener('input', () => {
    input.classList.remove('error');
  });
});

btnRegistrar.addEventListener('click', () => {
  window.location.href = '../registrar/registrar.html';
});

console.info(
  '%c🏦 Mi Plata Demo\n' +
  '%cUsuario: alejandro | Contraseña: 123456',
  'font-size:14px; font-weight:bold; color:#2563EB',
  'font-size:12px; color:#64748B'
);
