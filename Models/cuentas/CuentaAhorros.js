import { Cuenta } from "../abstract/Cuenta.js";
import { Movimiento } from "../entities/Movimiento.js";
import TipoMovimiento from "../enums/TipoMovimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

/**
 * @class CuentaAhorros
 * @extends Cuenta
 * @description Producto bancario orientado al ahorro a mediano y largo plazo.
 *
 * Reglas de negocio específicas:
 * - NO permite sobregiro: el retiro no puede superar el saldo disponible.
 * - Aplica una tasa de interés del 1.5% sobre el monto retirado (se cobra al retirar).
 * - Soporta transferencias salientes a otras cuentas.
 *
 * Polimorfismo: sobreescribe retirar() con su lógica propia.
 */
export class CuentaAhorros extends Cuenta {
  static TASA_INTERES = 0.015; // 1.5% mensual aplicado al retiro

  /**
   * @param {string} numeroCuenta
   * @param {number} saldo - Saldo inicial.
   * @param {Date} fechaApertura
   * @param {string} estado
   */
  constructor(numeroCuenta, saldo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    super(numeroCuenta, saldo, fechaApertura, estado);
    this.tasaInteres = CuentaAhorros.TASA_INTERES;
  }

  // ─────────────────────────────────────────────
  // Polimorfismo: override de retirar()
  // ─────────────────────────────────────────────

  /**
   * Retira un monto de la cuenta de ahorros.
   * Aplica interés del 1.5% al monto retirado.
   * NO permite sobregiro.
   * @param {number} monto - Monto a retirar (sin incluir intereses).
   * @returns {void}
   */
  retirar(monto) {
    if (monto <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (!this.estaActiva()) throw new Error(`No se puede retirar de una cuenta ${this.estado}.`);

    const interes = this.calcularIntereses(monto);
    const totalDescontar = monto + interes;

    if (totalDescontar > this.saldo) {
      throw new Error(
        `Fondos insuficientes. Saldo: $${this.saldo.toLocaleString()} | ` +
        `Total a debitar (con interés 1.5%): $${totalDescontar.toLocaleString()}`
      );
    }

    this.saldo -= totalDescontar;
    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.RETIRO,
        monto,
        this.saldo,
        `Retiro de $${monto.toLocaleString()} + interés $${interes.toLocaleString()} (1.5%)`
      )
    );
  }

  // ─────────────────────────────────────────────
  // Implementación ITransferible
  // ─────────────────────────────────────────────

  /**
   * Transfiere fondos a una cuenta destino.
   * Prohibido transferir a la misma cuenta (bloqueo estricto del docente).
   * @param {Cuenta} destino
   * @param {number} monto
   * @returns {void}
   */
  transferir(destino, monto) {
    if (!this.validarDestino(destino)) {
      throw new Error("La cuenta origen y destino no pueden ser la misma.");
    }
    if (monto <= 0) throw new Error("El monto de transferencia debe ser mayor a 0.");
    if (monto > this.saldo) throw new Error("Fondos insuficientes para la transferencia.");

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
   * Valida que la cuenta destino sea distinta a la cuenta origen.
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
   * Aplica el interés del 1.5% sobre el monto.
   * @param {number} monto
   * @returns {number}
   */
  calcularIntereses(monto) {
    return parseFloat((monto * this.tasaInteres).toFixed(2));
  }

  /**
   * Recibe una transferencia entrante (llamado por la cuenta origen).
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
