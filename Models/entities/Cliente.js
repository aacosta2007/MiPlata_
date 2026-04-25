import { IAutenticable } from "../interfaces/IAutenticable.js";
export class Cliente extends IAutenticable {
  static MAX_INTENTOS = 3;
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

  cerrarSesion() {
    console.log(`Sesión cerrada para: ${this.nombreCompleto}`);
  }

  cambiarContrasena(oldContrasena, newContrasena) {
    if (this.contrasena !== oldContrasena) {
      throw new Error("La contraseña actual no es correcta.");
    }
    if (!newContrasena || newContrasena.length < 6) {
      throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
    }
    this.contrasena = newContrasena;
  }

  incrementarIntentos() {
    this.intentosFallidos++;
    if (this.intentosFallidos >= Cliente.MAX_INTENTOS) {
      this.bloqueado = true;
    }
  }

  resetearIntentos() {
    this.intentosFallidos = 0;
    this.bloqueado = false;
  }

  editarPerfil(nombreCompleto, celular) {
    if (!nombreCompleto || nombreCompleto.trim() === "") {
      throw new Error("El nombre no puede estar vacío.");
    }
    this.nombreCompleto = nombreCompleto.trim();
    this.celular = celular;
  }

  intentosRestantes() {
    return Cliente.MAX_INTENTOS - this.intentosFallidos;
  }
}
