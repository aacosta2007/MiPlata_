import { Cuenta } from "../abstract/Cuenta.js";
import { Movimiento } from "../entities/Movimiento.js";
import TipoMovimiento from "../enums/TipoMovimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";

export class TarjetaCredito extends Cuenta {
  static TASAS = {
    SIN_INTERES: { max_cuotas: 2, tasa: 0.00 },
    MEDIA: { min_cuotas: 3, max_cuotas: 6, tasa: 0.019 },
    ALTA: { min_cuotas: 7, tasa: 0.023 },
  };

  constructor(numeroCuenta, cupo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    super(numeroCuenta, 0, fechaApertura, estado);
    this.cupo = cupo;
    this.deuda = 0;
    this.numeroCuotas = 1;
  }

  get cupoDisponible() {
    return this.cupo - this.deuda;
  }

  retirar(monto) {
    this.comprar(monto, 1); 
  }

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
    this.saldo = this.deuda; 

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

  validarDestino(cuentaDestino) {
    return cuentaDestino.numeroCuenta !== this.numeroCuenta;
  }

  calcularTasa(cuotas) {
    if (cuotas <= 2) return TarjetaCredito.TASAS.SIN_INTERES.tasa;
    if (cuotas <= 6) return TarjetaCredito.TASAS.MEDIA.tasa;
    return TarjetaCredito.TASAS.ALTA.tasa;
  }

  calcularCuotaMensual(capital, cuotas) {
    const tasa = this.calcularTasa(cuotas);
    if (tasa === 0) {
      return parseFloat((capital / cuotas).toFixed(2));
    }
    const cuota = (capital * tasa) / (1 - Math.pow(1 + tasa, -cuotas));
    return parseFloat(cuota.toFixed(2));
  }

  generarTablaAmortizacion(capital, cuotas) {
    const tasa = this.calcularTasa(cuotas);
    const cuotaMensual = this.calcularCuotaMensual(capital, cuotas);
    const tabla = [];
    let saldoRestante = capital;

    for (let i = 1; i <= cuotas; i++) {
      const interesMes = parseFloat((saldoRestante * tasa).toFixed(2));
      const capitalMes = parseFloat((cuotaMensual - interesMes).toFixed(2));
      saldoRestante    = parseFloat((saldoRestante - capitalMes).toFixed(2));
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
