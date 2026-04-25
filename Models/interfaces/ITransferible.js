export class ITransferible {
  transferir(destino, monto) {
    throw new Error("Método 'transferir' no implementado.");
  }

  validarDestino(cuentaDestino) {
    throw new Error("Método 'validarDestino' no implementado.");
  }
}
