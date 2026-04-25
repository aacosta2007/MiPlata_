import { IAutenticable } from "../interfaces/IAutenticable.js";

/**
 * @class Cliente
 * @extends IAutenticable
 * @description Representa al usuario del sistema bancario Mi Plata.
 * Gestiona la identidad, autenticación y seguridad de acceso.
 * Implementa el contrato IAutenticable.
 *
 * Regla de seguridad: tras 3 intentos fallidos consecutivos, la cuenta
 * queda BLOQUEADA y no permite más accesos hasta que un admin la reactive.
 */
export class Cliente extends IAutenticable {
  static MAX_INTENTOS = 3;

  /**
   * @param {number} id - Identificador interno del sistema.
   * @param {string} identificacion - Cédula o pasaporte.
   * @param {string} nombreCompleto - Nombre completo del cliente.
   * @param {string} celular - Número de celular vinculado.
   * @param {string} usuario - Identificador único de acceso.
   * @param {string} contrasena - Contraseña cifrada o en texto (demo).
   * @param {number} intentosFallidos - Contador de intentos fallidos.
   * @param {boolean} bloqueado - Estado de bloqueo de la cuenta.
   */
  constructor(
    id,
    identificacion,
    nombreCompleto,
    celular,
    usuario,
    contrasena,
    intentosFallidos = 0,
    bloqueado = false
  ) {
    super();
    this.id = id;
    this.identificacion = identificacion;
    this.nombreCompleto = nombreCompleto;
    this.celular = celular;
    this.usuario = usuario;
    this.contrasena = contrasena;
    this.intentosFallidos = intentosFallidos;
    this.bloqueado = bloqueado;
  }

  // ─────────────────────────────────────────────
  // Implementación IAutenticable
  // ─────────────────────────────────────────────

  /**
   * Verifica las credenciales. Si son correctas, resetea intentos.
   * Si son incorrectas, incrementa el contador y bloquea al llegar al límite.
   * @param {string} usuario
   * @param {string} contrasena
   * @returns {boolean}
   */
  autenticar(usuario, contrasena) {
    if (this.bloqueado) {
      throw new Error("Cuenta bloqueada. Contacte al administrador.");
    }
    if (this.usuario === usuario && this.contrasena === contrasena) {
      this.resetearIntentos();
      return true;
    } else {
      this.incrementarIntentos();
      return false;
    }
  }

  /**
   * Cierra la sesión del cliente (la UI borrará la referencia de sesión activa).
   * @returns {void}
   */
  cerrarSesion() {
    // La lógica de sesión se maneja en el controlador de la UI.
    // Este método existe para cumplir el contrato IAutenticable.
    console.log(`Sesión cerrada para: ${this.nombreCompleto}`);
  }

  /**
   * Cambia la contraseña tras validar la contraseña actual.
   * @param {string} oldContrasena - Contraseña actual para validación cruzada.
   * @param {string} newContrasena - Nueva contraseña.
   * @returns {void}
   */
  cambiarContrasena(oldContrasena, newContrasena) {
    if (this.contrasena !== oldContrasena) {
      throw new Error("La contraseña actual no es correcta.");
    }
    if (!newContrasena || newContrasena.length < 6) {
      throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
    }
    this.contrasena = newContrasena;
  }

  // ─────────────────────────────────────────────
  // Métodos propios del Cliente
  // ─────────────────────────────────────────────

  /**
   * Incrementa el contador de intentos fallidos.
   * Bloquea automáticamente al alcanzar el máximo permitido.
   * @returns {void}
   */
  incrementarIntentos() {
    this.intentosFallidos++;
    if (this.intentosFallidos >= Cliente.MAX_INTENTOS) {
      this.bloqueado = true;
    }
  }

  /**
   * Resetea el contador de intentos y desbloquea la cuenta.
   * @returns {void}
   */
  resetearIntentos() {
    this.intentosFallidos = 0;
    this.bloqueado = false;
  }

  /**
   * Actualiza los datos personales editables del cliente.
   * @param {string} nombreCompleto
   * @param {string} celular
   * @returns {void}
   */
  editarPerfil(nombreCompleto, celular) {
    if (!nombreCompleto || nombreCompleto.trim() === "") {
      throw new Error("El nombre no puede estar vacío.");
    }
    this.nombreCompleto = nombreCompleto.trim();
    this.celular = celular;
  }

  /**
   * Retorna los intentos restantes antes del bloqueo.
   * @returns {number}
   */
  intentosRestantes() {
    return Cliente.MAX_INTENTOS - this.intentosFallidos;
  }
}
