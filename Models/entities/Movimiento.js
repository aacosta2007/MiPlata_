export class Movimiento {
  constructor(id, fechaHora, tipo, valor, saldoPosterior, descripcion) {
    this.id = id;
    this.fechaHora = fechaHora instanceof Date ? fechaHora : new Date(fechaHora);
    this.tipo = tipo;
    this.valor = valor;
    this.saldoPosterior = saldoPosterior;
    this.descripcion = descripcion;
  }

  toString() {
    return `[${this.fechaHora.toLocaleString()}] ${this.tipo} - $${this.valor.toLocaleString()} | Saldo: $${this.saldoPosterior.toLocaleString()} | ${this.descripcion}`;
  }
}
