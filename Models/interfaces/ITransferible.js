/**
 * @interface ITransferible
 * @description Contrato de transferencia. Toda cuenta que permita
 * enviar fondos a otra cuenta debe implementar estos métodos.
 */
export class ITransferible {
  /**
   * Transfiere un monto hacia una cuenta destino.
   * @param {Cuenta} destino - Cuenta receptora de los fondos.
   * @param {number} monto - Cantidad a transferir.
   * @returns {void}
   */
  transferir(destino, monto) {
    throw new Error("Método 'transferir' no implementado.");
  }

  /**
   * Valida si una cuenta destino es válida para recibir transferencias.
   * @param {Cuenta} cuentaDestino
   * @returns {boolean}
   */
  validarDestino(cuentaDestino) {
    throw new Error("Método 'validarDestino' no implementado.");
  }
}
