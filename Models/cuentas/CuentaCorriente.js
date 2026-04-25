import { Cuenta } from "../abstract/Cuenta.js";
import { Movimiento } from "../entities/Movimiento.js";
import TipoMovimiento from "../enums/TipoMovimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

export class CuentaCorriente extends Cuenta {
  static PORCENTAJE_SOBREGIRO = 0.20; 

  constructor(numeroCuenta, saldo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    super(numeroCuenta, saldo, fechaApertura, estado);
    this.porcentajeSobregiro = CuentaCorriente.PORCENTAJE_SOBREGIRO;
    this.limiteSobregiro = this.calcularLimiteSobregiro();
  }

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

  validarDestino(cuentaDestino) {
    return cuentaDestino.numeroCuenta !== this.numeroCuenta;
  }

  calcularLimiteSobregiro() {
    const limite = parseFloat((Math.max(this.saldo, 0) * this.porcentajeSobregiro).toFixed(2));
    this.limiteSobregiro = limite;
    return limite;
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
