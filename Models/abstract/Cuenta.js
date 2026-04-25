import { ITransaction } from "../interfaces/ITransaction.js";
import { Movimiento } from "../entities/Movimiento.js";
import EstadoCuenta from "../enums/EstadoCuenta.js";
export class Cuenta extends ITransaction {
  #numeroCuenta;
  #saldo;
  #fechaApertura;
  #estado;
  #movimientos;

  constructor(numeroCuenta, saldo, fechaApertura, estado = EstadoCuenta.ACTIVA) {
    super();

    if (new.target === Cuenta) {
      throw new Error("Cuenta es una clase abstracta y no puede instanciarse directamente.");
    }

    this.#numeroCuenta = numeroCuenta;
    this.#saldo = saldo;
    this.#fechaApertura = fechaApertura instanceof Date ? fechaApertura : new Date(fechaApertura);
    this.#estado = estado;
    this.#movimientos = [];
  }

  get numeroCuenta() { return this.#numeroCuenta; }
  get saldo() { return this.#saldo; }
  get fechaApertura() { return this.#fechaApertura; }
  get estado() { return this.#estado; }
  get movimientos() { return [...this.#movimientos]; } 

  set saldo(nuevoSaldo) {
    this.#saldo = nuevoSaldo;
  }

  set estado(nuevoEstado) {
    this.#estado = nuevoEstado;
  }

  consultarSaldo() {
    return this.#saldo;
  }

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

  retirar(monto) {
    throw new Error("El método 'retirar' debe ser implementado por la subclase. (Polimorfismo)");
  }

  obtenerMovimientos() {
    return [...this.#movimientos].sort((a, b) =>
      new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }

  registrarMovimiento(movimiento) {
    if (!(movimiento instanceof Movimiento)) {
      throw new Error("Solo se pueden registrar instancias de Movimiento.");
    }
    this.#movimientos.push(movimiento);
  }

  estaActiva() {
    return this.#estado === EstadoCuenta.ACTIVA;
  }

  _cargarMovimiento(movimiento) {
    this.#movimientos.push(movimiento);
  }
}
