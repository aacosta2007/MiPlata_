import { Cuenta } from "../abstract/Cuenta.js";
import { Movimiento } from "../entities/Movimiento.js";
import TipoMovimiento from "../enums/TipoMovimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

/**
 * @class CuentaCorriente
 * @extends Cuenta
 * @description Producto bancario orientado a la gestión diaria y pago de nómina.
 *
 * Reglas de negocio específicas:
 * - Permite sobregiro hasta el 20% del saldo promedio (calculado dinámicamente).
 * - No genera intereses sobre retiros.
 * - Soporta transferencias frecuentes entre productos.
 *
 * Polimorfismo: sobreescribe retirar() con su lógica de sobregiro.
 */
export class CuentaCorriente extends Cuenta {
  static PORCENTAJE_SOBREGIRO = 0.20; // 20% de cupo de sobregiro

  /**
   * @param {string} numeroCuenta
   * @param {number} saldo
   * @param {Date} fechaApertura
   * @param {string} estado
   */
  constructor(numeroCuenta, saldo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    super(numeroCuenta, saldo, fechaApertura, estado);
    this.porcentajeSobregiro = CuentaCorriente.PORCENTAJE_SOBREGIRO;
    this.limiteSobregiro = this.calcularLimiteSobregiro();
  }

  // ─────────────────────────────────────────────
  // Polimorfismo: override de retirar()
  // ─────────────────────────────────────────────

  /**
   * Retira un monto permitiendo sobregiro hasta el 20% del saldo.
   * No aplica intereses al retirar.
   * @param {number} monto
   * @returns {void}
   */
  retirar(monto) {
    if (monto <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (!this.estaActiva()) throw new Error(`No se puede retirar de una cuenta ${this.estado}.`);

    this.limiteSobregiro = this.calcularLimiteSobregiro();
    const saldoDisponibleTotal = this.saldo + this.limiteSobregiro;

    if (monto > saldoDisponibleTotal) {
      throw new Error(
        `Fondos insuficientes. Saldo: $${this.saldo.toLocaleString()} | ` +
        `Cupo sobregiro (20%): $${this.limiteSobregiro.toLocaleString()} | ` +
        `Total disponible: $${saldoDisponibleTotal.toLocaleString()}`
      );
    }

    this.saldo -= monto;
    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.RETIRO,
        monto,
        this.saldo,
        `Retiro de $${monto.toLocaleString()}`
      )
    );
  }

  // ─────────────────────────────────────────────
  // Implementación ITransferible
  // ─────────────────────────────────────────────

  /**
   * Transfiere fondos hacia otra cuenta.
   * Prohibido transferir a la misma cuenta.
   * @param {Cuenta} destino
   * @param {number} monto
   * @returns {void}
   */
  transferir(destino, monto) {
    if (!this.validarDestino(destino)) {
      throw new Error("La cuenta origen y destino no pueden ser la misma.");
    }
    if (monto <= 0) throw new Error("El monto de transferencia debe ser mayor a 0.");

    this.limiteSobregiro = this.calcularLimiteSobregiro();
    const disponible = this.saldo + this.limiteSobregiro;
    if (monto > disponible) {
      throw new Error(`Fondos insuficientes. Disponible (con sobregiro): $${disponible.toLocaleString()}`);
    }

    this.saldo -= monto;
    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.TRANSFERENCIA_OUT,
        monto,
        this.saldo,
        `Transferencia enviada a cuenta ${destino.numeroCuenta}`
      )
    );

    destino.consignarTransferencia(monto, this.numeroCuenta);
  }

  /**
   * Valida que la cuenta destino sea distinta a esta cuenta.
   * @param {Cuenta} cuentaDestino
   * @returns {boolean}
   */
  validarDestino(cuentaDestino) {
    return cuentaDestino.numeroCuenta !== this.numeroCuenta;
  }

  // ─────────────────────────────────────────────
  // Métodos propios
  // ─────────────────────────────────────────────

  /**
   * Calcula el límite de sobregiro basado en el saldo actual (20%).
   * Nota: en producción real sería el saldo promedio de los últimos 30 días.
   * @returns {number}
   */
  calcularLimiteSobregiro() {
    const limite = parseFloat((Math.max(this.saldo, 0) * this.porcentajeSobregiro).toFixed(2));
    this.limiteSobregiro = limite;
    return limite;
  }

  /**
   * Recibe una transferencia entrante.
   * @param {number} monto
   * @param {string} numeroCuentaOrigen
   * @returns {void}
   */
  consignarTransferencia(monto, numeroCuentaOrigen) {
    this.saldo += monto;
    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.TRANSFERENCIA_IN,
        monto,
        this.saldo,
        `Transferencia recibida de cuenta ${numeroCuentaOrigen}`
      )
    );
  }
}
