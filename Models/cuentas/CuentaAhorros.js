import { Cuenta } from "../abstract/Cuenta.js";
import { Movimiento } from "../entities/Movimiento.js";
import TipoMovimiento from "../enums/TipoMovimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

export class CuentaAhorros extends Cuenta {
  static TASA_INTERES = 0.015; 

  constructor(numeroCuenta, saldo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    super(numeroCuenta, saldo, fechaApertura, estado);
    this.tasaInteres = CuentaAhorros.TASA_INTERES;
  }

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

  validarDestino(cuentaDestino) {
    return cuentaDestino.numeroCuenta !== this.numeroCuenta;
  }

  calcularIntereses(monto) {
    return parseFloat((monto * this.tasaInteres).toFixed(2));
  }

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
