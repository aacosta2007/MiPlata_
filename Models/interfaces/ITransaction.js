/**
 * @interface ITransaction
 * @description Contrato transaccional. Toda cuenta debe implementar
 * las operaciones básicas de depósito, retiro y consulta.
 */
export class ITransaction {
  /**
   * Deposita un monto en la cuenta.
   * @param {number} monto
   * @returns {void}
   */
  consignar(monto) {
    throw new Error("Método 'consignar' no implementado.");
  }

  /**
   * Retira un monto de la cuenta.
   * @param {number} monto
   * @returns {void}
   */
  retirar(monto) {
    throw new Error("Método 'retirar' no implementado.");
  }

  /**
   * Retorna el saldo disponible actual.
   * @returns {number}
   */
  consultarSaldo() {
    throw new Error("Método 'consultarSaldo' no implementado.");
  }

  /**
   * Retorna la lista de movimientos de la cuenta.
   * @returns {Movimiento[]}
   */
  obtenerMovimientos() {
    throw new Error("Método 'obtenerMovimientos' no implementado.");
  }
}
