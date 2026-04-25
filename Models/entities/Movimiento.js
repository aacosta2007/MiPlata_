/**
 * @class Movimiento
 * @description Representa un registro transaccional inmutable asociado a una cuenta.
 * Cada operación financiera (consignación, retiro, transferencia, etc.) genera
 * una instancia de esta clase que queda registrada en el historial.
 */
export class Movimiento {
  /**
   * @param {number} id - Identificador único del movimiento.
   * @param {Date} fechaHora - Fecha y hora exacta de la operación.
   * @param {string} tipo - Tipo de movimiento (valor de TipoMovimiento).
   * @param {number} valor - Monto de la operación (siempre positivo).
   * @param {number} saldoPosterior - Saldo de la cuenta luego de aplicar el movimiento.
   * @param {string} descripcion - Descripción legible de la operación.
   */
  constructor(id, fechaHora, tipo, valor, saldoPosterior, descripcion) {
    this.id = id;
    this.fechaHora = fechaHora instanceof Date ? fechaHora : new Date(fechaHora);
    this.tipo = tipo;
    this.valor = valor;
    this.saldoPosterior = saldoPosterior;
    this.descripcion = descripcion;
  }

  /**
   * Retorna una representación legible del movimiento.
   * @returns {string}
   */
  toString() {
    return `[${this.fechaHora.toLocaleString()}] ${this.tipo} - $${this.valor.toLocaleString()} | Saldo: $${this.saldoPosterior.toLocaleString()} | ${this.descripcion}`;
  }
}
