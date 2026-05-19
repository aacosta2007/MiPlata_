# Mi Plata — Documentación Técnica del Proyecto

> Banca virtual demo (cajero electrónico) construida con HTML + CSS + JavaScript vanilla (ES modules) y persistencia en `localStorage`. Sin frameworks, sin build step, sin backend.

**Autores originales:** Adrian Alejandro Acosta Saavedra · Williams David Amaiz Fernández
**Última actualización del documento:** 2026-05-18 (rama `Terminando-funciones`)

---

## 1. Propósito y alcance

Mi Plata simula un portal de banca privada con:
- Registro y login de clientes (con bloqueo tras 3 intentos fallidos).
- Tres productos por cliente: Cuenta de Ahorros, Cuenta Corriente, Tarjeta de Crédito.
- Operaciones reales: consignar, retirar, transferir (entre cuentas propias y a otros usuarios), comprar con TC en cuotas, pagar cuotas/total de TC desde otra cuenta.
- **Cupo diario de transferencias** persistente con ventana de 24h y reset automático.
- **Generación de extractos mensuales en PDF** para las tres cuentas (jsPDF).
- Historial de movimientos unificado con filtros, búsqueda por texto **y por fecha**.
- Perfil con datos personales (incluyendo correo electrónico) y cambio de contraseña.
- **Centro de Ayuda** con FAQ y páginas legales públicas (Privacidad, Términos, Seguridad, Contacto).

Toda la información se guarda en `localStorage` del navegador. No hay red, no hay base de datos.

---

## 2. Stack y filosofía

| Capa | Tecnología |
|---|---|
| Markup | HTML5 |
| Estilos | CSS3 con variables nativas (`:root`), sin preprocesador |
| Lógica | JavaScript ES2022, módulos nativos `<script type="module">` |
| Persistencia | `localStorage` (JSON) |
| Fuentes | Google Fonts (DM Sans, DM Mono) |
| Generación PDF | jsPDF 2.5.1 + jspdf-autotable 3.8.2 (cargados vía CDN bajo demanda) |

**Convenciones:**
- **Modelos** usan clases con campos privados (`#`) y herencia clásica.
- **Interfaces** son clases base que arrojan errores si no se sobrescriben.
- **Enums** son objetos `Object.freeze({...})`.
- Cada página HTML carga su propio CSS local + el global, y un `<script type="module">` (a veces externo, a veces inline).
- Los formatos y utilidades comunes viven en [assets/app.js](assets/app.js).

---

## 3. Estructura de archivos

```
MiPlata/
├── index.html                                # Splash: redirige según sesión
├── README.md                                 # Lista de autores (mínimo)
├── documentacion.md                          # Este documento
│
├── assets/
│   ├── app.js                                # AppState (global) + utilidades + sidebar + PDF
│   └── css/global.css                        # Variables CSS, sidebar, topbar, .public-mode, etc.
│
├── Models/
│   ├── abstract/Cuenta.js                    # Clase abstracta base (saldo, movimientos, consignar)
│   ├── cuentas/
│   │   ├── CuentaAhorros.js                  # Retiro con interés 1.5%
│   │   ├── CuentaCorriente.js                # Retiro con sobregiro 20% (limiteSobregiroBase fijo)
│   │   └── TarjetaCredito.js                 # Compras en cuotas, pago por cuota o total
│   ├── entities/
│   │   ├── Cliente.js                        # Datos personales (con correo), autenticación
│   │   └── Movimiento.js                     # Transacción (id, fecha, tipo, valor, saldoPosterior, desc)
│   ├── enums/
│   │   ├── EstadoCuenta.js                   # ACTIVA / INACTIVA / BLOQUEADA / CERRADA
│   │   └── TipoMovimiento.js                 # CONSIGNACION / RETIRO / TRANSFERENCIA_OUT/IN / COMPRA_TC / PAGO_TC
│   └── interfaces/
│       ├── IAutenticable.js                  # autenticar, cerrarSesion, cambiarContrasena
│       ├── ITransaction.js                   # consignar, retirar, consultarSaldo, obtenerMovimientos
│       └── ITransferible.js                  # transferir, validarDestino
│
└── Pages/
    ├── iniciarSesion/                        # Login con tracking de intentos
    ├── registrar/                            # Wizard de 3 pasos (datos+correo → credenciales → resumen)
    ├── GestionDeCuentas/                     # Dashboard: saldos, modal consignar/retirar, botones PDF
    ├── Transacciones/                        # Tabs: entre cuentas, a otro usuario, consignar, retirar
    │                                         # Cupo diario persistente con countdown
    ├── TarjetaCredito/                       # Simulador + compras activas + pagos + extracto PDF
    ├── HistorialDeMovimientos/               # Lista paginada, filtros por cuenta, búsqueda inteligente
    │                                         # (texto + fecha en múltiples formatos), export PDF
    ├── PerfilSeguridad/                      # Editar perfil (con correo) + cambiar contraseña
    │
    ├── Ayuda/                                # Centro de ayuda con FAQ desplegable
    ├── Privacidad/                           # Política de privacidad (modo público o privado)
    ├── Terminos/                             # Términos y condiciones (modo público o privado)
    ├── Seguridad/                            # Información de seguridad (modo público o privado)
    └── Contacto/                             # Formulario + canales + sucursales (público o privado)
```

---

## 4. Modelos (capa de dominio)

### 4.1 `Cuenta` (abstracta) — [Models/abstract/Cuenta.js](Models/abstract/Cuenta.js)

Clase base de todas las cuentas. **No se puede instanciar directamente** (lanza error si `new.target === Cuenta`).

**Campos privados:** `#numeroCuenta`, `#saldo`, `#fechaApertura`, `#estado`, `#movimientos[]`.

**Métodos:**
- `consignar(monto)` — implementado aquí. Valida monto > 0 y estado ACTIVA. Suma al saldo y registra movimiento `CONSIGNACION`.
- `retirar(monto)` — **abstracto**, lanza error. Cada subclase lo implementa (polimorfismo).
- `obtenerMovimientos()` — devuelve copia ordenada DESC por fecha.
- `registrarMovimiento(mov)` — valida que sea instancia de `Movimiento`.
- `_cargarMovimiento(mov)` — interno para hidratación desde localStorage.
- Getters: `numeroCuenta`, `saldo`, `fechaApertura`, `estado`, `movimientos` (copia).
- Setters: `saldo`, `estado`.
- `estaActiva()` — booleano.

### 4.2 `CuentaAhorros` — [Models/cuentas/CuentaAhorros.js](Models/cuentas/CuentaAhorros.js)
- Constante `TASA_INTERES = 0.015` (1.5%).
- `retirar(monto)` cobra `monto + interés (1.5% sobre monto)`. Sin sobregiro.
- `transferir(destino, monto)` — debita y llama `destino.consignarTransferencia(...)`.
- `consignarTransferencia(monto, numeroCuentaOrigen)` — suma al saldo y registra `TRANSFERENCIA_IN`.

### 4.3 `CuentaCorriente` — [Models/cuentas/CuentaCorriente.js](Models/cuentas/CuentaCorriente.js)

**Modelo de sobregiro con límite base fijo** (no se recalcula desde el saldo actual).

- Constante `PORCENTAJE_SOBREGIRO = 0.20` (20%).
- Campo nuevo: `limiteSobregiroBase` — calculado al crear la cuenta y **solo crece** cuando entra dinero. Garantiza que el cupo de sobregiro siempre esté disponible aunque el saldo caiga a 0 o negativo.

**Constructor:** `(numeroCuenta, saldo, fechaApertura, estado, limiteSobregiroBase=null)`. Si no se pasa el límite, se calcula desde el saldo positivo inicial.

**Métodos clave:**
- `_actualizarLimiteBase()` — privado. Tras consignaciones, si saldo > 0, recalcula el límite y lo sube (nunca baja).
- `consignar(monto)` — sobrescribe la implementación base para invocar `_actualizarLimiteBase()` tras consignar.
- `retirar(monto)` — valida `monto > saldo + limiteSobregiroBase`. Cuando el saldo llega a `-limiteSobregiroBase` (100%), cualquier nueva operación tira error de fondos insuficientes.
- `transferir(destino, monto)` — misma validación. Bloquea al 100%.
- `calcularLimiteSobregiro()` — retorna `limiteSobregiroBase` (compatibilidad con código existente).
- **`sobregiroUtilizado()`** — devuelve `|saldo|` cuando saldo < 0, 0 en caso contrario.
- **`porcentajeSobregiroUsado()`** — `(sobregiroUtilizado / limiteSobregiroBase) * 100`, capped a 100.
- `consignarTransferencia(...)` — también invoca `_actualizarLimiteBase()`.

**Precisión float:** todos los cálculos usan `parseFloat(...toFixed(2))` para evitar errores de redondeo.

### 4.4 `TarjetaCredito` — [Models/cuentas/TarjetaCredito.js](Models/cuentas/TarjetaCredito.js)

**Modelo de cuotas reales** (sistema bancario simulado).

**Campos:** `cupo` (límite fijo), `deuda` (capital adeudado, no incluye intereses), `saldo = deuda` (compatibilidad), `compras[]`.

**Estructura de una compra:**
```js
{
  id: number,              // único
  fecha: Date,
  descripcion: string,
  montoOriginal: number,
  cuotasTotales: number,
  cuotasPagadas: number,
  cuotaMensual: number,
  tasa: number,
  capitalPorCuota: number,
  saldoPendiente: number,
  estado: "activa" | "pagada"
}
```

**Tabla de tasas** (`TarjetaCredito.TASAS`):
| Plazo | Tasa mensual |
|---|---|
| 1-2 cuotas | 0.0% (sin interés) |
| 3-6 cuotas | 1.9% |
| 7+ cuotas | 2.3% |

**Métodos clave:**
- `comprar(monto, cuotas, descripcion)` — valida cupo, crea objeto de compra con plan completo, suma `monto` a `tc.deuda`, registra movimiento `COMPRA_TC`. Retorna `{compraId, cuotaMensual, totalPagar, tasa}`.
- `pagarCuota(compraId, cuentaOrigen)` — **requiere cuenta origen** (Ahorros o Corriente). Valida fondos, debita la cuota completa, marca una cuota como pagada, descuenta el capital de la deuda. Ajusta residuos por redondeo en la última cuota.
- `pagarCompraCompleta(compraId, cuentaOrigen)` — debita todas las cuotas restantes y liquida la compra.
- `pagar(monto)` (legacy) — pago directo a la deuda total, sin cuenta origen.
- `_validarCuentaOrigen(cuenta, monto, nombreOp)` — privado. Valida cuenta activa y saldo suficiente.
- `_debitarCuentaOrigen(cuenta, monto, descripcion)` — privado. Resta del saldo y registra mov `PAGO_TC` en la cuenta.

**Getters:**
- `cupoDisponible` = `cupo - deuda`.
- `comprasActivas` — filtra estado `activa`.
- `proximaCuotaTotal` — suma de `cuotaMensual` de todas las activas.
- `cuotasPendientesTotales` — suma de cuotas restantes.

**Otros métodos útiles:**
- `calcularTasa(cuotas)` — devuelve la tasa según rango.
- `calcularCuotaMensual(capital, cuotas)` — fórmula de cuota fija (amortización francesa).
- `generarTablaAmortizacion(capital, cuotas)` — array `[{cuota, cuotaMensual, capital, interes, saldo}]`.

**Atomicidad:** todos los métodos de pago validan ANTES de mutar. Si la validación falla, nada cambia.

### 4.5 `Cliente` — [Models/entities/Cliente.js](Models/entities/Cliente.js)

**Campos:** `id, identificacion, nombreCompleto, celular, usuario, contrasena, intentosFallidos, bloqueado, correo` (nuevo).

- Hereda de `IAutenticable`.
- Constante `MAX_INTENTOS = 3`.
- `autenticar(usuario, contrasena)` — valida credenciales. Si fallan, incrementa intentos; si supera 3, marca `bloqueado = true`.
- `cambiarContrasena(actual, nueva)` — valida la actual y mínimo 6 caracteres.
- `editarPerfil(nombreCompleto, celular, correo)` — actualiza datos personales incluyendo el correo electrónico.
- `intentosRestantes()` — para mostrar en UI.

### 4.6 `Movimiento` — [Models/entities/Movimiento.js](Models/entities/Movimiento.js)
Estructura inmutable conceptualmente: `{id, fechaHora, tipo, valor, saldoPosterior, descripcion}`. Solo `toString()` adicional.

---

## 5. Estado global y persistencia — [assets/app.js](assets/app.js)

### 5.1 Claves de `localStorage`
- `miplata_users` — array con todos los clientes registrados (serializados como JSON).
- `miplata_session` — `{ usuario: "..." }` del cliente activo.
- `miplata_attempts` — `{ [usuario]: {intentos, bloqueado} }`.
- **`miplata_cupo_diario`** — `{ [usuario]: { usado, inicioVentana } }` para el cupo diario de transferencias.
- `miplata_state` — **legacy**. La función `migrarDatosAntiguos()` lo absorbe y lo elimina.

### 5.2 Funciones de (de)serialización
- `serializarUsuario(datos)` — convierte instancias de modelos a JSON plano. **Ahora incluye** `cliente.correo`, `corriente.limiteSobregiroBase` y `tarjeta.compras[]`.
- `deserializarUsuario(p)` — reconstruye instancias reales. Hidrata el correo del cliente, el límite de sobregiro de la corriente y las compras de la tarjeta. Compatible hacia atrás (datos viejos sin estos campos se manejan con defaults).
- `serMovimiento(m)` / `deserMovimiento(p)` — helpers.

### 5.3 `AppState` (objeto exportado)

API pública usada por todas las páginas:

| Método | Propósito |
|---|---|
| `iniciarSesion(usuario, contrasena)` | Devuelve `{exito, cliente, bloqueado, intentosRestantes, mensaje}`. |
| `registrarUsuario({identificacion, nombreCompleto, celular, correo, usuario, contrasena})` | Valida unicidad de usuario, identificación **y correo**. Crea las 3 cuentas. Cupo TC: $5.000.000. |
| `cerrarSesion()` | Limpia sesión y redirige a login. |
| `getClienteActivo()` / `getCuentaAhorros()` / `getCuentaCorriente()` / `getTarjetaCredito()` | Acceso a datos en memoria. |
| `guardar()` | Re-serializa el cliente activo a `miplata_users`. |
| `requireAuth()` | Redirige a login si no hay sesión. |
| `buscarDestinatario(query)` | Busca por usuario o número de cuenta entre los otros clientes. |
| `transferirAOtroUsuario(...)` | Transferencia interbancos demo. |
| `getTodosMovimientos()` | Concatena movimientos de las 3 cuentas, agrega `m.cuenta`, ordena DESC. |
| **`actualizarPerfil(nombreCompleto, celular, correo)`** | Cambia datos personales **incluyendo correo**. |
| `resetearDatos()` | Borra todo localStorage y recarga. |
| **`getCupoDiario()`** | Lee cupo diario del usuario activo. Aplica reset si ventana de 24h expiró. Retorna `{usado, inicioVentana, resetEnMs}`. |
| **`agregarCupoDiario(monto)`** | Suma al cupo del usuario. Si es la primera transferencia, inicia la ventana de 24h. |
| **`resetCupoDiario()`** | Limpia el cupo del usuario activo (útil para debug). |

### 5.4 Utilidades exportadas
- `formatCurrency(n)` — `$ X.XXX.XXX,XX` formato es-CO.
- `formatDate(d)` — `DD/MM/YYYY HH:MM`.
- `showToast(msg, type, duration)` — toast en bottom-right.
- `maskAccount(num)` — `•••• 1234`.
- `buildSidebar(activeId)` — genera el sidebar dinámicamente. Asigna `window.appLogout` y expone `window.AppState`. **Botón "Ayuda" enlaza a `Pages/Ayuda/Ayuda.html`** (antes mostraba alert).

### 5.5 Generación de extractos PDF (sección nueva)

**Carga bajo demanda:** `jsPDF` y el plugin `autotable` se cargan vía CDN solo la primera vez que se solicita un PDF. No penalizan la carga inicial.

| Función | Propósito |
|---|---|
| `_cargarJsPDF()` | Promesa interna que carga ambos scripts en orden. |
| `obtenerMovimientosMes(tipoCuenta, mes, año)` | Filtra movimientos de una cuenta en un mes/año. Orden ASC. |
| `calcularSaldoInicialMes(tipoCuenta, mes, año)` | Calcula saldo al inicio del mes desde el primer movimiento (inverso al signo del tipo). |
| **`generarPDFExtractoSimple(tipoCuenta, mes, año)`** | PDF para Ahorros/Corriente. Header azul institucional, datos del cliente, resumen (saldo inicial/final, ingresos, egresos), tabla de movimientos. |
| **`generarPDFTarjetaCredito(mes, año)`** | PDF completo para TC. Resumen de crédito, tabla de amortización (próximas 3 cuotas por compra activa), compras a crédito, historial de movimientos del mes. |

**Estilo común del PDF:**
- Tamaño A4, márgenes 15-20 mm.
- Banner superior azul `#1A3A6B` con logo "Mi Plata".
- Tablas con cabecera azul y filas alternadas.
- Footer con número de página y aviso legal.
- Archivos: `Extracto-{tipo}-{MM}-{YYYY}.pdf`.

### 5.6 Inicialización automática
Al importar `app.js` por primera vez:
1. `migrarDatosAntiguos()` — absorbe `miplata_state` legacy.
2. `inicializarDemoSiVacio()` — si `miplata_users` está vacío, crea cliente demo:
   - **Usuario:** `alejandro` / **Pass:** `123456` / **Correo:** `alejandro@miplata.com`
   - Ahorros: $12.450.000 / Corriente: $3.120.500 / TC: cupo $10M con compra "Compra electrodomésticos" $1.760.000 en 12 cuotas.
3. Carga la sesión activa si existe en `miplata_session`.

---

## 6. Páginas (capa UI)

Cada página privada sigue el mismo patrón:
```js
import { AppState, ... } from '../../assets/app.js';
try { AppState.requireAuth(); } catch(e) { if(e.message==='NO_AUTH') throw e; }
buildSidebar('id-del-item-activo');
// ... lógica específica
```

Las **páginas legales públicas** (Privacidad, Términos, Seguridad, Contacto) usan un patrón híbrido — se adaptan según haya sesión o no (ver sección 6.8).

### 6.1 [iniciarSesion](Pages/iniciarSesion/iniciarSesion.html) + `.js`
- Form con usuario/contraseña.
- Toggle de mostrar contraseña.
- Barra de "intentos fallidos" tras error.
- Si bloqueado → botón deshabilitado, toast persistente.
- Imprime credenciales demo en la consola al cargar.
- **Footer con enlaces funcionales** a Privacidad, Términos, Seguridad y Contacto.

### 6.2 [registrar](Pages/registrar/registrar.html) + `.js`
Wizard de 3 pasos:
1. **Datos personales:** nombre, identificación, celular, **correo electrónico** (con validación de formato).
2. **Credenciales:** usuario (regex `[a-zA-Z0-9_]+`, min 4), contraseña con medidor de fortaleza (5 niveles), confirmar.
3. **Resumen:** muestra todos los datos + preview de las 3 cuentas que se crearán.

El correo se valida con regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` y se chequea unicidad contra otros usuarios.

### 6.3 [GestionDeCuentas](Pages/GestionDeCuentas/GestionDeCuentas.html) (Dashboard) + `.js`
- Saludo dinámico según hora.
- Banner con enlace **"⬇ DESCARGAR TODOS"** (genera los 3 extractos PDF del mes actual).
- **Card Ahorros**: saldo + "+2.4% este mes" + botón **"⬇ Extracto"** alineado abajo a la derecha (CSS `.cuenta-footer`).
- **Card Corriente**: saldo + barra de sobregiro **con porcentaje numérico** y colores de riesgo (azul <50%, naranja 50-80%, rojo >80%/100%) + botón **"⬇ Extracto"**.
- **Card Tarjeta de Crédito** (visual oscura): cupo disp + botón **"⬇ Extracto"**.
- **Actividad reciente** (últimos 4 movs).
- Botones: **Consignar** (modal), **Retirar** (modal), **Transferir** (navega).
- Los modales reutilizan `.modal-overlay` / `.modal-card`.

### 6.4 [Transacciones](Pages/Transacciones/Transacciones.html) (script inline)
**4 tabs:** Entre Mis Cuentas, A Otro Usuario, Consignar, Retirar.

**Cupo diario** ($5.000.000) ahora **persistente y completo**:
- Carga el `usadoDiario` desde `AppState.getCupoDiario()` al iniciar.
- Tras cada transferencia (propia o externa), llama `AppState.agregarCupoDiario(monto)`.
- **Validación en AMBOS botones** (propio y externo): bloquea si `usadoDiario >= LIMITE_DIARIO`.
- **Countdown dinámico**: texto `Se restablece en X h Y min.` se actualiza cada 60s.
- **Auto-reset**: la ventana de 24h se resetea sola al consultar el cupo después de expirar.
- **Botones se deshabilitan visualmente** cuando se alcanza el 100%, con tooltip explicativo.

### 6.5 [TarjetaCredito](Pages/TarjetaCredito/TarjetaCredito.html) (inline)
**Header:** 4 stats — Límite de Crédito, Deuda Actual, Cupo Disponible (con barra de % usado y color por riesgo), Próxima Cuota Total. **Botón "⬇ Descargar Extracto"** siempre visible en el header.

**Simulador (panel izquierdo):** descripción, monto, plazo. Dos botones:
- **📊 Calcular Cuotas (Solo Simulación)** — gris, solo calcula.
- **✅ Realizar Compra** — azul, registra la compra y baja el cupo.

**Resultado (panel derecho):** Resumen + tabla de amortización. Botón **"⬇ Exportar PDF"** en el header de la tabla (también descarga el extracto completo).

**Mis Compras a Crédito:**
- Selector global "Cuenta para pagar tus cuotas" (Ahorros / Corriente).
- Por cada compra: descripción, fecha, plazo, tasa, cuota mensual, cuotas pagadas/totales, barra de progreso, saldo pendiente, botones **"💰 Pagar Cuota"** y **"⚡ Pagar Total"**.

### 6.6 [HistorialDeMovimientos](Pages/HistorialDeMovimientos/HistorialDeMovimientos.html) (inline)
- Filtros por cuenta (chips): Todas / Ahorros / Corriente / Crédito.
- **Búsqueda inteligente** en la topbar — el input detecta automáticamente si es texto o fecha:
  - **Texto**: filtra por descripción, tipo, cuenta o fecha formateada.
  - **Fechas** soportadas: `15/06/2026`, `15-06-2026`, `15/06`, `06/2026`, `2026`, `2026-06`, `2026-06-15`, `junio`, `jun 2026`.
  - **Chip indicador**: arriba de la tabla aparece "📅 Filtrando por fecha: 15/06/2026 — 3 resultados" o "🔍 Filtrando por texto: ...".
- **Selectores de mes/año** + botón **"⬇ Exportar PDF"** del período seleccionado. Respeta el filtro de cuenta:
  - Filtro "Todos" → descarga los 3 extractos en secuencia.
  - Filtro específico → descarga solo el de esa cuenta.
- Tabla paginada (8 por página), botón "Cargar más".
- Iconos por tipo (consignación → 🏛, retiro → 💸, transferencia → ↗/↙, compra TC → 🛍, pago TC → ✅).

### 6.7 [PerfilSeguridad](Pages/PerfilSeguridad/PerfilSeguridad.html) (inline)
- Datos personales: nombre, identificación, teléfono, **correo electrónico real** (ya no es inventado `${usuario}@miplata.com`; se usa `cliente.correo` con fallback al formato antiguo si está vacío).
- **Modo edición**: edita nombre, teléfono **y correo** (con validación de formato).
- Cambio de contraseña con 3 campos (actual / nueva / confirmar) y medidor de fortaleza.

### 6.8 Páginas públicas/privadas adaptativas (sección nueva)

**Páginas:** [Ayuda](Pages/Ayuda/Ayuda.html), [Privacidad](Pages/Privacidad/Privacidad.html), [Terminos](Pages/Terminos/Terminos.html), [Seguridad](Pages/Seguridad/Seguridad.html), [Contacto](Pages/Contacto/Contacto.html).

**Ayuda** (`Pages/Ayuda/Ayuda.html`) — **requiere auth**:
- Hero con bienvenida, 6 cards de accesos rápidos, FAQ con 10 preguntas desplegables, CTA a Contacto.

**Privacidad, Términos, Seguridad, Contacto** — **modo adaptativo**:
```js
import { AppState, buildSidebar } from '../../assets/app.js';
if (AppState.getClienteActivo()) {
  buildSidebar('');                              // Hay sesión → sidebar normal
} else {
  document.body.classList.add('public-mode');    // Sin sesión → modo público
  document.getElementById('publicHeader').style.display = '';
}
```

- **Con sesión**: aparecen con el sidebar y topbar normales (como cualquier página privada).
- **Sin sesión**: se aplica la clase `.public-mode` (en `global.css`), que oculta sidebar/topbar y muestra `.public-header` (logo + navegación entre páginas legales + botón "Iniciar Sesión").

Esto permite que los enlaces del footer del login y del registro lleguen a estas páginas sin redirigir a login.

**Contacto** específicamente:
- Formulario con validación (nombre, email, asunto, mensaje mínimo 10 caracteres).
- Se prellena automáticamente con `nombreCompleto` y `correo` si hay sesión activa.
- Lista de 4 sucursales (Bogotá, Medellín, Cali, Barranquilla).
- 6 canales de atención.

---

## 7. Flujos críticos paso a paso

### 7.1 Login
1. Usuario escribe credenciales y hace submit.
2. `AppState.iniciarSesion(usuario, contrasena)` busca el usuario.
3. Hidrata como `Cliente` con `deserializarUsuario`. Carga intentos.
4. Llama `cliente.autenticar(...)`. Lanza error si está bloqueado.
5. Persiste intentos. Si OK, guarda sesión y redirige al dashboard.

### 7.2 Compra con TC
1. Usuario llena descripción, monto, cuotas → "Realizar Compra".
2. `tc.comprar(monto, cuotas, desc)` valida cupo, crea objeto compra, suma a `tc.deuda`, registra `COMPRA_TC`.
3. `AppState.guardar()` persiste.
4. UI: refresca stats y lista de compras.

### 7.3 Pago de cuota (desde Ahorros o Corriente)
1. Usuario selecciona cuenta de pago.
2. Click en "Pagar Cuota" de una compra.
3. `tc.pagarCuota(compraId, cuentaOrigen)`:
   - Valida fondos y atomicidad.
   - Debita la cuenta origen y registra `PAGO_TC`.
   - Incrementa `cuotasPagadas`. Si es la última, marca pagada.
   - Resta el capital de `tc.deuda`.
   - Registra `PAGO_TC` en la TC (reduce deuda).
4. UI: refresca todo.

### 7.4 Transferencia con cupo diario
1. Usuario inicia transferencia (propia o externa).
2. **Validación previa**: `usadoDiario = AppState.getCupoDiario().usado` (aplica reset si la ventana de 24h venció).
3. Si `usadoDiario >= LIMITE_DIARIO` → error "Ya alcanzaste el límite diario".
4. Si `usadoDiario + monto > LIMITE_DIARIO` → error con monto disponible.
5. Ejecuta la transferencia.
6. `AppState.agregarCupoDiario(monto)` persiste el nuevo usado.
7. UI: refresca barra de cupo, porcentaje, countdown y deshabilita botones si llegó al 100%.

### 7.5 Operación en Cuenta Corriente con sobregiro
1. Cuenta arranca con `limiteSobregiroBase = saldoInicial * 0.20`.
2. Al **consignar**: `_actualizarLimiteBase()` sube el límite si el nuevo saldo positivo es mayor.
3. Al **retirar/transferir**: valida `monto > saldo + limiteSobregiroBase`.
4. El usuario puede dejar el saldo negativo hasta `-limiteSobregiroBase`.
5. **Al 100% (saldo = -limiteSobregiroBase)**: cualquier nueva operación de salida tira error "Fondos insuficientes" y el dashboard pinta la barra de rojo.

### 7.6 Generación de extracto PDF
1. Usuario hace clic en "⬇ Extracto" (Dashboard, Historial o TC).
2. Si jsPDF no está cargado, `_cargarJsPDF()` baja los scripts del CDN.
3. Se invoca `generarPDFExtractoSimple(tipo, mes, año)` o `generarPDFTarjetaCredito(mes, año)`.
4. Se filtran movimientos del período, se calcula saldo inicial/final, totales.
5. Se construye el PDF (header azul, secciones, tablas con `autotable`).
6. `doc.save('Extracto-{tipo}-{MM}-{YYYY}.pdf')` dispara la descarga.
7. Toast de confirmación.

---

## 8. CSS y design system — [assets/css/global.css](assets/css/global.css)

### Variables principales
```css
--primary:        #1A3A6B;
--accent:         #2563EB;
--success:        #16A34A;
--error:          #DC2626;
--warning:        #D97706;
--gray-50..900:   escala neutra
--radius-sm/md/lg/xl: 6/10/16/24px
--shadow-sm/md/lg/blue
--font-main: 'DM Sans'
--font-mono: 'DM Mono'
```

### Componentes reutilizables
- `.app-shell` → `.sidebar` (220px fijo) + `.main-content`.
- `.topbar` (sticky 64px).
- **`.public-header`** (nuevo) — header alternativo para páginas legales sin sesión.
- **`.public-mode`** (nuevo) — clase del `<body>` que oculta sidebar/topbar y muestra public-header.
- `.card` / `.card-dark` / `.card-section-title`.
- `.btn .btn-primary | .btn-secondary | .btn-icon | .btn-sm | .btn-lg | .btn-full`.
- `.form-group` + `.form-label` + `.form-control` (+ variantes).
- `.alert` (info / success / error / warning).
- `.toast`.
- `.chip` (blue / green / red / gray).
- `.data-table`.
- `.amount-large` + `.amount-positive` / `.amount-negative`.
- `.progress-bar` + `.progress-fill`.
- **`.cuenta-card`** (nuevo): flex-column, min-height 220px.
- **`.cuenta-footer`** (nuevo): margin-top auto, alinea porcentaje izq y botón der.
- Utilities: `.flex`, `.flex-col`, `.items-center`, `.justify-between`, `.gap-*`, `.mt-*`, `.w-full`, `.text-*`, `.font-bold`, `.text-muted/primary/accent`, `.grid-2`, `.grid-3`, `.hidden`.

---

## 9. Cómo correr el proyecto

1. Servidor HTTP estático (ES modules requieren `http://`, no `file://`).
   ```bash
   npx http-server . -p 5500 -c-1
   # o Live Server, o python -m http.server 5500
   ```
2. Abre `http://localhost:5500/` → redirige a login.
3. Credenciales demo: `alejandro` / `123456` (correo: `alejandro@miplata.com`).
4. Para resetear todo: en consola → `localStorage.clear(); location.reload()`.
5. Para resetear solo el cupo diario: `AppState.resetCupoDiario(); location.reload()`.

> El proyecto tiene un `.claude/launch.json` con un dev server `miplata` en el puerto 5501.

---

## 10. Estado actual: qué está hecho y qué falta

### ✅ Completado en esta rama

| # | Funcionalidad | Detalles |
|---|---|---|
| 1 | **Retirar** desde Dashboard y Transacciones | Modal con info dinámica por cuenta. |
| 2 | **TarjetaCredito con cuotas reales** | Array `compras[]` con plan de pagos. |
| 3 | **Realizar compra desde simulador** | Botón "✅ Realizar Compra". |
| 4 | **Pagar cuota / pagar total** | Desde Ahorros o Corriente, con validación de fondos. |
| 5 | **Visualización correcta PAGO_TC** | Negativo en cuentas, positivo en TC. |
| 6 | **Cupo dinámico con feedback visual TC** | Barra de % usado y colores por riesgo. |
| 7 | **Generación de extractos PDF** | jsPDF + autoTable. 3 funciones (simple, TC, con secciones). Botones en Dashboard, TC e Historial. |
| 8 | **Campo `correo` electrónico** | Agregado al modelo Cliente, formulario de registro, perfil y serialización. Validación de formato + unicidad. |
| 9 | **Cupo diario persistente** | `localStorage` con ventana de 24h, countdown dinámico, reset automático y botones deshabilitados al 100%. |
| 10 | **Sobregiro de Corriente con `limiteSobregiroBase` fijo** | Bug del 100% corregido. Bloqueo estricto. Dashboard muestra porcentaje con colores de riesgo. |
| 11 | **Buscador de historial inteligente** | Detecta fechas en múltiples formatos (dd/mm/yyyy, mm/yyyy, yyyy, ISO, nombres de mes en español). Chip indicador del filtro activo. |
| 12 | **Sidebar limpio** | "Cuentas" eliminado (apuntaba al mismo lugar que Dashboard). Botón "Ayuda" ahora enlaza a página real. |
| 13 | **5 páginas nuevas funcionales** | Ayuda (FAQ), Privacidad, Términos, Seguridad, Contacto (con formulario). |
| 14 | **Modo público adaptativo** | Las 4 páginas legales detectan si hay sesión y se muestran con sidebar o con `.public-header`. |
| 15 | **Footers conectados en todas las páginas** | Login, registro, dashboard, transacciones, TC, historial, perfil. |
| 16 | **Style fix cards Ahorros/Corriente** | `.cuenta-footer` alinea correctamente porcentaje y botón de extracto. |

### ❌ Pendiente / decorativo

| # | Funcionalidad | Dónde | Notas |
|---|---|---|---|
| 1 | **Crecimiento "+2.4%" hardcodeado** | [GestionDeCuentas.html](Pages/GestionDeCuentas/GestionDeCuentas.html) | Calcular % real comparando saldo de hace 30 días vs hoy. |
| 2 | **Notificaciones (🔔)** | Topbar | Botón sin acción. Podría desplegar panel con últimos movs no leídos. |
| 3 | **"¿Olvidó sus credenciales?"** | [iniciarSesion.html](Pages/iniciarSesion/iniciarSesion.html) | Link a `#`. Implementar flujo de recuperación. |
| 4 | **Aviso "extracto mensual"** | [GestionDeCuentas.html](Pages/GestionDeCuentas/GestionDeCuentas.html) | El link "VER MÁS" ya descarga los 3, pero el texto podría ser más descriptivo. |
| 5 | **Biometría / 2FA reales** | [PerfilSeguridad.html](Pages/PerfilSeguridad/PerfilSeguridad.html) | Decorativo. Implementar pregunta de seguridad como mínimo. |
| 6 | **Buscador en Perfil** | [PerfilSeguridad.html](Pages/PerfilSeguridad/PerfilSeguridad.html) | Input vacío sin handler. |
| 7 | **Pago de TC sin cuotas (legacy)** | [TarjetaCredito.js](Models/cuentas/TarjetaCredito.js) | El método `pagar(monto)` directo está, pero ninguna UI lo expone. |
| 8 | **Validación de identificación / celular** | [registrar.js](Pages/registrar/registrar.js) | Validación muy laxa. Considerar regex de cédula colombiana. |
| 9 | **Envío real del formulario de Contacto** | [Contacto.html](Pages/Contacto/Contacto.html) | Actualmente solo simula con setTimeout. Integrar API o servicio de email si aplica. |
| 10 | **Filtros combinables en Historial** | [HistorialDeMovimientos.html](Pages/HistorialDeMovimientos/HistorialDeMovimientos.html) | Buscar por texto + fecha al mismo tiempo (actualmente uno excluye al otro). |

---

## 11. Convenciones y tips para agentes que continúen

1. **No introducir frameworks.** El proyecto es deliberadamente vanilla.
2. **Llamar `AppState.guardar()` después de CUALQUIER mutación** sobre cuentas, tarjeta o cliente.
3. **Validar montos** con `parseFloat(String(input.value).trim().replace(',','.'))`.
4. **Cuando agregues un campo a un modelo**, actualiza también:
   - `serializarUsuario` y `deserializarUsuario` en [app.js](assets/app.js).
   - Demo data en `inicializarDemoSiVacio` si aplica.
   - Constructor con valor por defecto para compatibilidad con datos viejos.
5. **Para mostrar errores al usuario**, usa `showToast(msg, 'error', duration)` o inline en `<div class="form-error hidden">`.
6. **Para agregar una nueva página**, sigue el patrón:
   - Crear `Pages/MiPagina/MiPagina.html` que importa `assets/css/global.css`.
   - Al inicio del módulo: `AppState.requireAuth()` + `buildSidebar('mipagina')` (o usar el patrón adaptativo para páginas públicas).
   - Añadir entrada en el array `nav` dentro de `buildSidebar` ([app.js](assets/app.js)).
7. **Para páginas accesibles sin sesión** (como las legales):
   - Incluir el `<header class="public-header" id="publicHeader" style="display:none;">` con navegación.
   - En el script: `if (AppState.getClienteActivo()) buildSidebar(...); else document.body.classList.add('public-mode'); document.getElementById('publicHeader').style.display = '';`.
8. **Iconos** son emojis Unicode. No hay librería de iconos.
9. **Para inspeccionar el estado** desde devtools: `window.AppState` está expuesto globalmente.
10. **Precisión float**: cuando hagas cálculos monetarios usa `parseFloat((x).toFixed(2))` para evitar errores.
11. **Persistencia de cupo diario**: usa `AppState.getCupoDiario()` / `agregarCupoDiario()` en lugar de variables locales en cada página.

---

## 12. Glosario rápido

- **Cliente** — usuario humano del banco. Ahora incluye `correo` electrónico.
- **Cuenta** — abstracción que agrupa saldo + movimientos. Hay 3 tipos por cliente.
- **Movimiento** — registro inmutable de cada operación.
- **Compra** (TC) — pedido a crédito con su plan de cuotas.
- **Cupo (TC)** — límite máximo de la tarjeta vs. cupo disponible (cupo − deuda).
- **Cupo diario** — límite de $5M para transferencias en ventana de 24h, persistente por usuario.
- **Deuda** — capital adeudado en la TC. No incluye intereses.
- **Sobregiro** — solo en Corriente: permite saldo negativo hasta el `limiteSobregiroBase` (20% del saldo positivo más alto registrado).
- **`limiteSobregiroBase`** — campo fijo en CuentaCorriente. Solo crece (cuando entra dinero), nunca se reduce. Garantiza que el sobregiro permanezca disponible al gastar.
- **Modo público** — clase `.public-mode` en `<body>` que oculta sidebar/topbar para permitir navegación legal sin sesión.

---

*Fin del documento. Para preguntas sobre decisiones de diseño históricas, revisa el historial de commits de Git.*
