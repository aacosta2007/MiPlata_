/**
 * @interface IAutenticable
 * @description Contrato de autenticación. Toda clase que gestione
 * credenciales de usuario debe implementar estos métodos.
 */
export class IAutenticable {
  /**
   * Verifica las credenciales del usuario.
   * @param {string} usuario
   * @param {string} contrasena
   * @returns {boolean}
   */
  autenticar(usuario, contrasena) {
    throw new Error("Método 'autenticar' no implementado.");
  }

  /**
   * Cierra la sesión activa del usuario.
   * @returns {void}
   */
  cerrarSesion() {
    throw new Error("Método 'cerrarSesion' no implementado.");
  }

  /**
   * Actualiza la contraseña del usuario.
   * @param {string} oldContrasena - Contraseña actual para validación cruzada.
   * @param {string} newContrasena - Nueva contraseña a establecer.
   * @returns {void}
   */
  cambiarContrasena(oldContrasena, newContrasena) {
    throw new Error("Método 'cambiarContrasena' no implementado.");
  }
}
