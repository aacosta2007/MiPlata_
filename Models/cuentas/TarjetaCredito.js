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
    this.compras = [];
  }

  get cupoDisponible() {
    return parseFloat((this.cupo - this.deuda).toFixed(2));
  }

  get comprasActivas() {
    return this.compras.filter(c => c.estado === "activa");
  }

  get proximaCuotaTotal() {
    return parseFloat(this.comprasActivas.reduce((s, c) => s + c.cuotaMensual, 0).toFixed(2));
  }

  get cuotasPendientesTotales() {
    return this.comprasActivas.reduce((s, c) => s + (c.cuotasTotales - c.cuotasPagadas), 0);
  }

  retirar(monto) {
    this.comprar(monto, 1, "Avance en efectivo");
  }

  comprar(monto, cuotas, descripcion = "Compra a crédito") {
    if (monto <= 0) throw new Error("El monto de compra debe ser mayor a 0.");
    if (cuotas < 1) throw new Error("El número de cuotas debe ser al menos 1.");
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
    const capitalPorCuota = parseFloat((monto / cuotas).toFixed(2));

    const compra = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      fecha: new Date(),
      descripcion,
      montoOriginal: monto,
      cuotasTotales: cuotas,
      cuotasPagadas: 0,
      cuotaMensual,
      tasa,
      capitalPorCuota,
      saldoPendiente: monto,
      estado: "activa",
    };
    this.compras.push(compra);

    this.deuda = parseFloat((this.deuda + monto).toFixed(2));
    this.saldo = this.deuda;

    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.COMPRA_TC,
        monto,
        this.deuda,
        `${descripcion} — $${monto.toLocaleString()} en ${cuotas} cuota(s) | ` +
        `Cuota mensual: $${cuotaMensual.toLocaleString()} | Tasa: ${(tasa * 100).toFixed(1)}%`
      )
    );

    return { compraId: compra.id, cuotaMensual, totalPagar, tasa };
  }

  _validarCuentaOrigen(cuentaOrigen, monto, nombreOperacion = "pago") {
    if (!cuentaOrigen) {
      throw new Error("Debes seleccionar una cuenta de origen para el pago.");
    }
    if (typeof cuentaOrigen.saldo !== "number" || typeof cuentaOrigen.registrarMovimiento !== "function") {
      throw new Error("Cuenta de origen inválida.");
    }
    if (!cuentaOrigen.estaActiva || !cuentaOrigen.estaActiva()) {
      throw new Error(`La cuenta de origen no está activa.`);
    }
    if (monto > cuentaOrigen.saldo) {
      throw new Error(
        `Fondos insuficientes en cuenta ${cuentaOrigen.numeroCuenta}. ` +
        `Saldo: $${cuentaOrigen.saldo.toLocaleString()} | ` +
        `Requerido para ${nombreOperacion}: $${monto.toLocaleString()}`
      );
    }
  }

  _debitarCuentaOrigen(cuentaOrigen, monto, descripcion) {
    cuentaOrigen.saldo = parseFloat((cuentaOrigen.saldo - monto).toFixed(2));
    cuentaOrigen.registrarMovimiento(
      new Movimiento(
        cuentaOrigen.movimientos.length + 1,
        new Date(),
        TipoMovimiento.PAGO_TC,
        monto,
        cuentaOrigen.saldo,
        descripcion
      )
    );
  }

  pagarCuota(compraId, cuentaOrigen) {
    const compra = this.compras.find(c => c.id === compraId);
    if (!compra) throw new Error("Compra no encontrada.");
    if (compra.estado !== "activa") throw new Error("Esta compra ya está pagada totalmente.");

    this._validarCuentaOrigen(cuentaOrigen, compra.cuotaMensual, "cuota");

    const esUltima = compra.cuotasPagadas + 1 >= compra.cuotasTotales;
    const capitalDescontado = esUltima ? compra.saldoPendiente : compra.capitalPorCuota;
    const numCuota = compra.cuotasPagadas + 1;

    this._debitarCuentaOrigen(
      cuentaOrigen,
      compra.cuotaMensual,
      `Pago cuota ${numCuota}/${compra.cuotasTotales} TC ${this.numeroCuenta} — ${compra.descripcion}`
    );

    compra.cuotasPagadas += 1;
    compra.saldoPendiente = parseFloat((compra.saldoPendiente - capitalDescontado).toFixed(2));
    if (esUltima) {
      compra.saldoPendiente = 0;
      compra.estado = "pagada";
    }

    this.deuda = Math.max(0, parseFloat((this.deuda - capitalDescontado).toFixed(2)));
    this.saldo = this.deuda;

    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.PAGO_TC,
        compra.cuotaMensual,
        this.deuda,
        `Pago cuota ${compra.cuotasPagadas}/${compra.cuotasTotales} — ${compra.descripcion} | ` +
        `Origen: cuenta ${cuentaOrigen.numeroCuenta} | Cuota: $${compra.cuotaMensual.toLocaleString()}`
      )
    );

    return compra;
  }

  pagarCompraCompleta(compraId, cuentaOrigen) {
    const compra = this.compras.find(c => c.id === compraId);
    if (!compra) throw new Error("Compra no encontrada.");
    if (compra.estado !== "activa") throw new Error("Esta compra ya está pagada totalmente.");

    const cuotasRestantes = compra.cuotasTotales - compra.cuotasPagadas;
    const montoCuotasRestantes = parseFloat((compra.cuotaMensual * cuotasRestantes).toFixed(2));
    const capitalRestante = compra.saldoPendiente;

    this._validarCuentaOrigen(cuentaOrigen, montoCuotasRestantes, "pago total");

    this._debitarCuentaOrigen(
      cuentaOrigen,
      montoCuotasRestantes,
      `Pago anticipado total TC ${this.numeroCuenta} — ${compra.descripcion} (${cuotasRestantes} cuota(s))`
    );

    compra.cuotasPagadas = compra.cuotasTotales;
    compra.saldoPendiente = 0;
    compra.estado = "pagada";

    this.deuda = Math.max(0, parseFloat((this.deuda - capitalRestante).toFixed(2)));
    this.saldo = this.deuda;

    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.PAGO_TC,
        montoCuotasRestantes,
        this.deuda,
        `Pago anticipado total — ${compra.descripcion} (${cuotasRestantes} cuota(s) restantes) | ` +
        `Origen: cuenta ${cuentaOrigen.numeroCuenta} | Total pagado: $${montoCuotasRestantes.toLocaleString()}`
      )
    );

    return compra;
  }

  pagar(monto) {
    if (monto <= 0) throw new Error("El monto de pago debe ser mayor a 0.");
    if (monto > this.deuda) throw new Error(`El pago ($${monto}) supera la deuda actual ($${this.deuda}).`);

    this.deuda = parseFloat((this.deuda - monto).toFixed(2));
    this.saldo = this.deuda;

    this.registrarMovimiento(
      new Movimiento(
        this.movimientos.length + 1,
        new Date(),
        TipoMovimiento.PAGO_TC,
        monto,
        this.deuda,
        `Pago directo de $${monto.toLocaleString()} a tarjeta de crédito | Deuda restante: $${this.deuda.toLocaleString()}`
      )
    );
  }

  _cargarCompra(compraPlana) {
    const compra = {
      ...compraPlana,
      fecha: compraPlana.fecha instanceof Date ? compraPlana.fecha : new Date(compraPlana.fecha),
    };
    this.compras.push(compra);
    if (compra.estado === "activa" && this.deuda === 0) {
      this.deuda = parseFloat((this.deuda + compra.saldoPendiente).toFixed(2));
      this.saldo = this.deuda;
    }
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
