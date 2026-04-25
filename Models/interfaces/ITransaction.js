export class ITransaction {
  consignar(monto) {
    throw new Error("Método 'consignar' no implementado.");
  }

  retirar(monto) {
    throw new Error("Método 'retirar' no implementado.");
  }

  consultarSaldo() {
    throw new Error("Método 'consultarSaldo' no implementado.");
  }

  obtenerMovimientos() {
    throw new Error("Método 'obtenerMovimientos' no implementado.");
  }
}
