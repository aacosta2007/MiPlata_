import { Cuenta } from "../abstract/Cuenta.js";
import { Movimiento } from "../entities/Movimiento.js";
import TipoMovimiento from "../enums/TipoMovimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

export class CuentaCorriente extends Cuenta {
  static PORCENTAJE_SOBREGIRO = 0.20;

  constructor(numeroCuenta, saldo, fechaApertura, estado = EstadoCuenta.ACTIVA, limiteSobregiroBase = null) {
    super(numeroCuenta, saldo, fechaApertura, estado);
    this.porcentajeSobregiro = CuentaCorriente.PORCENTAJE_SOBREGIRO;
    // El límite de sobregiro se "fija" cuando el saldo es positivo.
    // Si no se pasa uno explícito, se calcula desde el saldo actual (caso inicial).
    this.limiteSobregiroBase = limiteSobregiroBase !== null
      ? parseFloat(Number(limiteSobregiroBase).toFixed(2))
      : parseFloat((Math.max(saldo, 0) * this.porcentajeSobregiro).toFixed(2));
    this.limiteSobregiro = this.limiteSobregiroBase;
  }

  /**
   * Actualiza el límite base cuando entra dinero. Sólo crece — nunca se reduce
   * automáticamente, de manera que el cupo de sobregiro siempre esté disponible
   * incluso cuando el saldo cae por debajo de 0.
   */
  _actualizarLimiteBase() {
    if (this.saldo > 0) {
      const nuevoLimite = parseFloat((this.saldo * this.porcentajeSobregiro).toFixed(2));
      if (nuevoLimite > this.limiteSobregiroBase) {
        this.limiteSobregiroBase = nuevoLimite;
        this.limiteSobregiro = nuevoLimite;
      }
    }
  }

  consignar(monto) {
    super.consignar(monto);
    this._actualizarLimiteBase();
  }

  retirar(monto) {
    if (monto <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (!this.estaActiva()) throw new Error(`No se puede retirar de una cuenta ${this.estado}.`);

    const saldoDisponibleTotal = parseFloat((this.saldo + this.limiteSobregiroBase).toFixed(2));

    if (monto > saldoDisponibleTotal) {
      throw new Error(
        `Fondos insuficientes. Saldo: $${this.saldo.toLocaleString()} | ` +
        `Cupo sobregiro (20%): $${this.limiteSobregiroBase.toLocaleString()} | ` +
        `Total disponible: $${saldoDisponibleTotal.toLocaleString()}`
      );
    }

    this.saldo = parseFloat((this.saldo - monto).toFixed(2));
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

  transferir(destino, monto) {
    if (!this.validarDestino(destino)) {
      throw new Error("La cuenta origen y destino no pueden ser la misma.");
    }
    if (monto <= 0) throw new Error("El monto de transferencia debe ser mayor a 0.");
    if (!this.estaActiva()) throw new Error(`No se puede operar con una cuenta ${this.estado}.`);

    const disponible = parseFloat((this.saldo + this.limiteSobregiroBase).toFixed(2));
    if (monto > disponible) {
      throw new Error(
        `Fondos insuficientes. Saldo: $${this.saldo.toLocaleString()} | ` +
        `Cupo sobregiro: $${this.limiteSobregiroBase.toLocaleString()} | ` +
        `Disponible total: $${disponible.toLocaleString()}`
      );
    }

    this.saldo = parseFloat((this.saldo - monto).toFixed(2));
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

  validarDestino(cuentaDestino) {
    return cuentaDestino.numeroCuenta !== this.numeroCuenta;
  }

  /**
   * Retorna el límite de sobregiro fijo (no se recalcula desde el saldo actual).
   * Para compatibilidad con código existente.
   */
  calcularLimiteSobregiro() {
    this.limiteSobregiro = this.limiteSobregiroBase;
    return this.limiteSobregiroBase;
  }

  /** Cuánto del cupo de sobregiro está utilizado (0 si saldo ≥ 0). */
  sobregiroUtilizado() {
    return this.saldo < 0 ? parseFloat(Math.abs(this.saldo).toFixed(2)) : 0;
  }

  /** Porcentaje del sobregiro usado (0..100). */
  porcentajeSobregiroUsado() {
    if (this.limiteSobregiroBase <= 0) return 0;
    return Math.min(100, (this.sobregiroUtilizado() / this.limiteSobregiroBase) * 100);
  }

  consignarTransferencia(monto, numeroCuentaOrigen) {
    this.saldo = parseFloat((this.saldo + monto).toFixed(2));
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
    this._actualizarLimiteBase();
  }
}
