/**
 * @enum TipoMovimiento
 * @description Define los tipos de movimiento posibles en el sistema bancario.
 */
const TipoMovimiento = Object.freeze({
  CONSIGNACION: "CONSIGNACION",
  RETIRO: "RETIRO",
  TRANSFERENCIA_OUT: "TRANSFERENCIA_OUT",
  TRANSFERENCIA_IN: "TRANSFERENCIA_IN",
  COMPRA_TC: "COMPRA_TC",
  PAGO_TC: "PAGO_TC",
});

export default TipoMovimiento;
