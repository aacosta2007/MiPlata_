import { ITransaction } from "../interfaces/ITransaction.js";
import { Movimiento } from "../entities/Movimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

/**
 * @abstract @class Cuenta
 * @extends ITransaction
 * @extends ITransferible (via subclases)
 * @description Clase base abstracta para todos los productos bancarios.
 * Define la estructura y comportamiento común de CuentaAhorros,
 * CuentaCorriente y TarjetaCredito.
 *
 * NO se puede instanciar directamente — siempre se usa a través de
 * sus subclases concretas.
 *
 * Composición: una Cuenta POSEE muchos Movimientos (1 a *).
 * Si la cuenta desaparece, su historial también.
 */
export class Cuenta extends ITransaction {
  #numeroCuenta;
  #saldo;
  #fechaApertura;
  #estado;
  #movimientos;

  /**
   * @param {string} numeroCuenta - Número único de la cuenta.
   * @param {number} saldo - Saldo inicial.
   * @param {Date} fechaApertura - Fecha de apertura de la cuenta.
   * @param {string} estado - Estado inicial (valor de EstadoCuenta).
   */
  constructor(numeroCuenta, saldo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    super();

    // Bloquear instanciación directa de la clase abstracta
    if (new.target === Cuenta) {
      throw new Error("Cuenta es una clase abstracta y no puede instanciarse directamente.");
    }

    this.#numeroCuenta = numeroCuenta;
    this.#saldo = saldo;
    this.#fechaApertura = fechaApertura instanceof Date ? fechaApertura : new Date(fechaApertura);
    this.#estado = estado;
    this.#movimientos = [];
  }

  // ─────────────────────────────────────────────
  // Getters (encapsulamiento: atributos privados)
  // ─────────────────────────────────────────────

  get numeroCuenta() { return this.#numeroCuenta; }
  get saldo() { return this.#saldo; }
  get fechaApertura() { return this.#fechaApertura; }
  get estado() { return this.#estado; }
  get movimientos() { return [...this.#movimientos]; } // copia defensiva

  // Setter controlado del saldo (solo accesible dentro del paquete via subclases)
  set saldo(nuevoSaldo) {
    this.#saldo = nuevoSaldo;
  }

  set estado(nuevoEstado) {
    this.#estado = nuevoEstado;
  }

  // ─────────────────────────────────────────────
  // Implementación ITransaction
  // ─────────────────────────────────────────────

  /**
   * Retorna el saldo disponible actual de la cuenta.
   * @returns {number}
   */
  consultarSaldo() {
    return this.#saldo;
  }

  /**
   * Deposita fondos en la cuenta y registra el movimiento.
   * Validación estricta: el monto debe ser > 0.
   * @param {number} monto
   * @returns {void}
   */
  consignar(monto) {
    if (monto <= 0) {
      throw new Error("El monto de consignación debe ser mayor a 0.");
    }
    if (this.#estado !== EstadoCuenta.ACTIVA) {
      throw new Error(`No se puede consignar en una cuenta ${this.#estado}.`);
    }
    this.#saldo += monto;
    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        "CONSIGNACION",
        monto,
        this.#saldo,
        `Consignación de $${monto.toLocaleString()}`
      )
    );
  }

  /**
   * Método de retiro base — debe ser sobreescrito (override) por subclases
   * para aplicar reglas específicas (intereses, sobregiro, etc.).
   * @param {number} monto
   * @returns {void}
   */
  retirar(monto) {
    throw new Error("El método 'retirar' debe ser implementado por la subclase. (Polimorfismo)");
  }

  /**
   * Retorna una copia del historial de movimientos, ordenado descendentemente por fecha.
   * @returns {Movimiento[]}
   */
  obtenerMovimientos() {
    return [...this.#movimientos].sort((a, b) =>
      new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }

  // ─────────────────────────────────────────────
  // Método interno de registro
  // ─────────────────────────────────────────────

  /**
   * Registra un movimiento en el historial de la cuenta.
   * Accesible solo desde esta clase y sus subclases.
   * @param {Movimiento} movimiento
   * @returns {void}
   */
  registrarMovimiento(movimiento) {
    if (!(movimiento instanceof Movimiento)) {
      throw new Error("Solo se pueden registrar instancias de Movimiento.");
    }
    this.#movimientos.push(movimiento);
  }

  /**
   * Verifica si la cuenta está activa.
   * @returns {boolean}
   */
  estaActiva() {
    return this.#estado === EstadoCuenta.ACTIVA;
  }

  /**
   * Carga un movimiento ya existente sin recalcular saldo.
   * Usado exclusivamente para restaurar estado desde localStorage.
   * @param {Movimiento} movimiento
   * @returns {void}
   */
  _cargarMovimiento(movimiento) {
    this.#movimientos.push(movimiento);
  }
}
