export class IAutenticable {
  autenticar(usuario, contrasena) {
    throw new Error("Método 'autenticar' no implementado.");
  }

  cerrarSesion() {
    throw new Error("Método 'cerrarSesion' no implementado.");
  }
  cambiarContrasena(oldContrasena, newContrasena) {
    throw new Error("Método 'cambiarContrasena' no implementado.");
  }
}
