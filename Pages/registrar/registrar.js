import { AppState, showToast } from '../../assets/app.js';

const state = {
  paso: 1,
  nombreCompleto: '',
  identificacion: '',
  celular: '',
  usuario: '',
  contrasena: '',
};

const paso1El  = document.getElementById('paso1');
const paso2El  = document.getElementById('paso2');
const paso3El  = document.getElementById('paso3');
const dot1     = document.getElementById('dot1');
const dot2     = document.getElementById('dot2');
const dot3     = document.getElementById('dot3');
const line1    = document.getElementById('line1');
const line2    = document.getElementById('line2');

const inNombre  = document.getElementById('nombreCompleto');
const inId      = document.getElementById('identificacion');
const inCelular = document.getElementById('celular');

const inUsuario  = document.getElementById('usuario');
const inPass     = document.getElementById('contrasena');
const inConfirm  = document.getElementById('confirmarPass');
const pwFill     = document.getElementById('pwFill');
const pwLabel    = document.getElementById('pwLabel');

function irAPaso(n) {
  state.paso = n;
  paso1El.classList.toggle('hidden', n !== 1);
  paso2El.classList.toggle('hidden', n !== 2);
  paso3El.classList.toggle('hidden', n !== 3);

  [dot1, dot2, dot3].forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i + 1 < n)  d.classList.add('done');
    if (i + 1 === n) d.classList.add('active');
  });
  line1.classList.toggle('done', n > 1);
  line2.classList.toggle('done', n > 2);

  if (n === 3) rellenarResumen();
}

function mostrarError(id, visible) {
  document.getElementById(id).classList.toggle('hidden', !visible);
}

function marcarCampo(input, ok) {
  input.classList.toggle('error',   !ok);
  input.classList.toggle('success',  ok);
}

function validarPaso1() {
  const nombre = inNombre.value.trim();
  const id     = inId.value.trim();
  const cel    = inCelular.value.trim();

  const okNombre  = nombre.length >= 3;
  const okId      = id.length >= 5 && /^[\d\-]+$/.test(id);
  const okCelular = cel.length >= 7;

  marcarCampo(inNombre,  okNombre);
  marcarCampo(inId,      okId);
  marcarCampo(inCelular, okCelular);

  mostrarError('errNombre',  !okNombre);
  mostrarError('errId',      !okId);
  mostrarError('errCelular', !okCelular);

  return okNombre && okId && okCelular;
}

function validarPaso2() {
  const usr  = inUsuario.value.trim();
  const pass = inPass.value;
  const conf = inConfirm.value;

  const okUsr  = usr.length >= 4 && /^[a-zA-Z0-9_]+$/.test(usr);
  const okPass = pass.length >= 6;
  const okConf = pass === conf && conf.length > 0;

  marcarCampo(inUsuario, okUsr);
  marcarCampo(inPass,    okPass);
  marcarCampo(inConfirm, okConf);

  mostrarError('errUsuario', !okUsr);
  mostrarError('errPass',    !okPass);
  mostrarError('errConfirm', !okConf);

  return okUsr && okPass && okConf;
}

function calcularFuerza(pass) {
  let score = 0;
  if (pass.length >= 6)  score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;
  return score;
}

inPass.addEventListener('input', () => {
  const pass  = inPass.value;
  const score = calcularFuerza(pass);
  const pct   = (score / 5) * 100;
  const colores = ['#DC2626','#F59E0B','#F59E0B','#16A34A','#16A34A','#16A34A'];
  const labels  = ['','Muy débil','Débil','Regular','Fuerte','Muy fuerte'];
  pwFill.style.width      = `${pct}%`;
  pwFill.style.background = colores[score] || '#DC2626';
  pwLabel.textContent     = pass.length === 0 ? 'Ingresa una contraseña' : labels[score];
  pwLabel.style.color     = colores[score] || 'var(--gray-400)';
  mostrarError('errPass', false);
  marcarCampo(inPass, pass.length >= 6);
});

inConfirm.addEventListener('input', () => {
  const ok = inConfirm.value === inPass.value && inConfirm.value.length > 0;
  mostrarError('errConfirm', !ok);
  marcarCampo(inConfirm, ok);
});

document.getElementById('togglePw1').addEventListener('click', () => {
  const btn = document.getElementById('togglePw1');
  inPass.type = inPass.type === 'password' ? 'text' : 'password';
  btn.textContent = inPass.type === 'password' ? '🔒' : '👁';
});
document.getElementById('togglePw2').addEventListener('click', () => {
  const btn = document.getElementById('togglePw2');
  inConfirm.type = inConfirm.type === 'password' ? 'text' : 'password';
  btn.textContent = inConfirm.type === 'password' ? '🔒' : '👁';
});

inUsuario.addEventListener('input', () => {
  const val = inUsuario.value.trim();
  const icon = document.getElementById('iconUsuario');
  if (val.length === 0) { icon.textContent = '🔍'; return; }
  const ok = val.length >= 4 && /^[a-zA-Z0-9_]+$/.test(val);
  icon.textContent = ok ? '✅' : '❌';
  marcarCampo(inUsuario, ok);
  mostrarError('errUsuario', !ok);
});

function rellenarResumen() {
  document.getElementById('resNombre').textContent  = state.nombreCompleto;
  document.getElementById('resId').textContent      = state.identificacion;
  document.getElementById('resCelular').textContent = state.celular;
  document.getElementById('resUsuario').textContent = `@${state.usuario}`;
}

function shakeForm(el) {
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

document.getElementById('btnPaso1').addEventListener('click', () => {
  if (!validarPaso1()) { shakeForm(paso1El); return; }
  state.nombreCompleto = inNombre.value.trim();
  state.identificacion = inId.value.trim();
  state.celular        = inCelular.value.trim();
  irAPaso(2);
  inUsuario.focus();
});

document.getElementById('btnPaso2').addEventListener('click', () => {
  if (!validarPaso2()) { shakeForm(paso2El); return; }
  state.usuario    = inUsuario.value.trim();
  state.contrasena = inPass.value;
  irAPaso(3);
});

document.getElementById('btnVolver1').addEventListener('click', () => irAPaso(1));
document.getElementById('btnVolver2').addEventListener('click', () => irAPaso(2));

document.getElementById('btnRegistrar').addEventListener('click', () => {
  const btn = document.getElementById('btnRegistrar');
  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  setTimeout(() => {
    try {
      AppState.registrarUsuario({
        identificacion: state.identificacion,
        nombreCompleto: state.nombreCompleto,
        celular:        state.celular,
        usuario:        state.usuario,
        contrasena:     state.contrasena,
      });

      showToast(`¡Cuenta creada exitosamente! Bienvenido, ${state.nombreCompleto.split(' ')[0]}.`, 'success', 4000);
      btn.textContent = '✅ ¡Cuenta creada!';

      setTimeout(() => {
        window.location.replace('../iniciarSesion/iniciarSesion.html');
      }, 1500);

    } catch(err) {
      btn.disabled = false;
      btn.textContent = '✅ Crear Mi Cuenta';
      showToast(err.message, 'error', 5000);

      if (err.message.includes('usuario')) {
        irAPaso(2);
        marcarCampo(inUsuario, false);
        mostrarError('errUsuario', true);
        document.getElementById('errUsuario').textContent = `⚠ ${err.message}`;
        inUsuario.focus();
      }
    }
  }, 600);
});

[inNombre, inId, inCelular].forEach(inp => {
  inp.addEventListener('input', () => inp.classList.remove('error'));
});

irAPaso(1);
