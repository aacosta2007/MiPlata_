import { Cuenta } from "../abstract/Cuenta.js";
import { Movimiento } from "../entities/Movimiento.js";
import TipoMovimiento from "../enums/TipoMovimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

/**
 * @class TarjetaCredito
 * @extends Cuenta
 * @description Producto bancario para financiar compras a cuotas.
 *
 * Reglas de negocio (según especificación del docente):
 * - El "saldo" representa la DEUDA acumulada (no fondos disponibles).
 * - Cupo disponible = cupo total - deuda actual.
 * - Tasas de interés según número de cuotas:
 *   ≤ 2 cuotas → 0% (sin intereses)
 *   3 a 6 cuotas → 1.9% mensual
 *   ≥ 7 cuotas → 2.3% mensual
 * - Fórmula de cuota: Capital × tasa / (1 − (1 + tasa)^−n)
 * - Toda transacción debe mostrar el valor del pago mensual resultante.
 *
 * Polimorfismo: sobreescribe retirar() como operación de "compra con TC".
 */
export class TarjetaCredito extends Cuenta {
  // Tabla de tasas según el PDF del docente
  static TASAS = {
    SIN_INTERES: { max_cuotas: 2, tasa: 0.00 },
    MEDIA: { min_cuotas: 3, max_cuotas: 6, tasa: 0.019 },
    ALTA: { min_cuotas: 7, tasa: 0.023 },
  };

  /**
   * @param {string} numeroCuenta
   * @param {number} cupo - Cupo total asignado por el banco.
   * @param {Date} fechaApertura
   * @param {string} estado
   */
  constructor(numeroCuenta, cupo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    // En TC: saldo inicial = 0 (sin deuda), el "saldo" de Cuenta se usa como deuda
    super(numeroCuenta, 0, fechaApertura, estado);
    this.cupo = cupo;
    this.deuda = 0;
    this.numeroCuotas = 1;
  }

  /**
   * Retorna el cupo disponible (cupo total - deuda actual).
   * @returns {number}
   */
  get cupoDisponible() {
    return this.cupo - this.deuda;
  }

  // ─────────────────────────────────────────────
  // Polimorfismo: override de retirar() → comprar()
  // ─────────────────────────────────────────────

  /**
   * En la TC, retirar equivale a realizar una compra.
   * Registra la deuda y calcula la cuota mensual.
   * @param {number} monto - Monto de la compra.
   * @returns {void}
   */
  retirar(monto) {
    this.comprar(monto, 1); // compra en 1 cuota por defecto
  }

  // ─────────────────────────────────────────────
  // Métodos propios de la Tarjeta
  // ─────────────────────────────────────────────

  /**
   * Realiza una compra con la tarjeta a un número de cuotas dado.
   * Valida el cupo disponible y registra la deuda + movimiento.
   * @param {number} monto - Valor de la compra.
   * @param {number} cuotas - Número de cuotas (define la tasa de interés).
   * @returns {{ cuotaMensual: number, totalPagar: number, tasa: number }}
   */
  comprar(monto, cuotas) {
    if (monto <= 0) throw new Error("El monto de compra debe ser mayor a 0.");
    if (!this.estaActiva()) throw new Error(`No se puede operar con una tarjeta ${this.estado}.`);
    if (monto > this.cupoDisponible) {
      throw new Error(
        `Cupo insuficiente. Disponible: $${this.cupoDisponible.toLocaleString()} | ` +
        `Compra solicitada: $${monto.toLocaleString()}`
      );
    }

    const tasa = this.calcularTasa(cuotas);
    const cuotaMensual = this.calcularCuotaMensual(monto, cuotas);
    const totalPagar = parseFloat((cuotaMensual * cuotas).toFixed(2));

    this.deuda += monto;
    this.saldo = this.deuda; // sincronizar con Cuenta base

    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.COMPRA_TC,
        monto,
        this.deuda,
        `Compra $${monto.toLocaleString()} en ${cuotas} cuota(s) | ` +
        `Cuota mensual: $${cuotaMensual.toLocaleString()} | Tasa: ${(tasa * 100).toFixed(1)}%`
      )
    );

    return { cuotaMensual, totalPagar, tasa };
  }

  /**
   * Realiza un pago a la deuda de la tarjeta.
   * @param {number} monto - Monto a abonar a la deuda.
   * @returns {void}
   */
  pagar(monto) {
    if (monto <= 0) throw new Error("El monto de pago debe ser mayor a 0.");
    if (monto > this.deuda) throw new Error(`El pago ($${monto}) supera la deuda actual ($${this.deuda}).`);

    this.deuda -= monto;
    this.saldo = this.deuda;

    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.PAGO_TC,
        monto,
        this.deuda,
        `Pago de $${monto.toLocaleString()} a tarjeta de crédito | Deuda restante: $${this.deuda.toLocaleString()}`
      )
    );
  }

  /**
   * Transfiere fondos desde la TC a otra cuenta (avance en efectivo).
   * @param {Cuenta} destino
   * @param {number} monto
   * @returns {void}
   */
  transferir(destino, monto) {
    if (!this.validarDestino(destino)) {
      throw new Error("La cuenta origen y destino no pueden ser la misma.");
    }
    if (monto > this.cupoDisponible) {
      throw new Error(`Cupo insuficiente para la transferencia.`);
    }
    this.deuda += monto;
    this.saldo = this.deuda;
    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.TRANSFERENCIA_OUT,
        monto,
        this.deuda,
        `Avance en efectivo a cuenta ${destino.numeroCuenta}`
      )
    );
    destino.consignarTransferencia(monto, this.numeroCuenta);
  }

  /**
   * Valida que la cuenta destino sea distinta.
   * @param {Cuenta} cuentaDestino
   * @returns {boolean}
   */
  validarDestino(cuentaDestino) {
    return cuentaDestino.numeroCuenta !== this.numeroCuenta;
  }

  /**
   * Determina la tasa de interés mensual según el número de cuotas.
   * Regla del docente: ≤2 → 0%, 3-6 → 1.9%, ≥7 → 2.3%
   * @param {number} cuotas
   * @returns {number} tasa decimal (ej: 0.019)
   */
  calcularTasa(cuotas) {
    if (cuotas <= 2) return TarjetaCredito.TASAS.SIN_INTERES.tasa;
    if (cuotas <= 6) return TarjetaCredito.TASAS.MEDIA.tasa;
    return TarjetaCredito.TASAS.ALTA.tasa;
  }

  /**
   * Calcula la cuota mensual usando la fórmula de amortización francesa.
   * Fórmula: Capital × tasa / (1 − (1 + tasa)^−n)
   * Si tasa = 0 (≤2 cuotas), simplemente divide el capital entre cuotas.
   * @param {number} capital
   * @param {number} cuotas
   * @returns {number}
   */
  calcularCuotaMensual(capital, cuotas) {
    const tasa = this.calcularTasa(cuotas);
    if (tasa === 0) {
      return parseFloat((capital / cuotas).toFixed(2));
    }
    const cuota = (capital * tasa) / (1 - Math.pow(1 + tasa, -cuotas));
    return parseFloat(cuota.toFixed(2));
  }

  /**
   * Genera la tabla de amortización completa para una compra.
   * @param {number} capital
   * @param {number} cuotas
   * @returns {{ cuota: number, cuotaMensual: number, capital: number, interes: number, saldo: number }[]}
   */
  generarTablaAmortizacion(capital, cuotas) {
    const tasa = this.calcularTasa(cuotas);
    const cuotaMensual = this.calcularCuotaMensual(capital, cuotas);
    const tabla = [];
    let saldoRestante = capital;

    for (let i = 1; i <= cuotas; i++) {
      const interesMes = parseFloat((saldoRestante * tasa).toFixed(2));
      const capitalMes = parseFloat((cuotaMensual - interesMes).toFixed(2));
      saldoRestante    = parseFloat((saldoRestante - capitalMes).toFixed(2));
      // Corrección de redondeo: la última cuota siempre cierra en 0
      if (i === cuotas) saldoRestante = 0;

      tabla.push({
        cuota: i,
        cuotaMensual,
        capital: capitalMes,
        interes: interesMes,
        saldo: saldoRestante,
      });
    }
    return tabla;
  }
}
