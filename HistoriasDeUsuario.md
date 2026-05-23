# Mi Plata — Historias de Usuario

> Documento de planificación ágil del proyecto **Mi Plata** (banca virtual demo).
> Estructura: **Lanzamientos → Épicas → Sprints → Historias de Usuario**.
>
> **Autores:** Adrian Alejandro Acosta Saavedra · Williams David Amaiz Fernández
> **Última actualización:** 2026-05-18
> **Formato de historia:** `Como [rol] quiero [funcionalidad] para [beneficio]` (Mike Cohn)
> **Story points:** escala Fibonacci (1, 2, 3, 5, 8, 13)
> **Duración del sprint:** 2 semanas
> **Capacidad por sprint:** 25–30 puntos

---

## 📅 Roadmap general

| Lanzamiento | Tema | Sprints | Estado |
|-------------|------|---------|--------|
| **R1.0** | MVP — Banca Básica | 1–4 | ✅ Liberado |
| **R2.0** | Tarjeta de Crédito y Movilidad | 5–8 | ✅ Liberado |
| **R3.0** | Extractos, Reportes y Seguridad | 9–11 | ✅ Liberado |
| **R4.0** | Soporte, Ayuda y Páginas Legales | 12–13 | ✅ Liberado |

---

## 🎭 Personas (perfiles de usuario)

| Persona | Descripción |
|---------|-------------|
| **Cliente Final** | Usuario común de Mi Plata. Realiza operaciones bancarias diarias desde el navegador. |
| **Cliente Nuevo** | Persona que se registra por primera vez. Necesita un proceso de onboarding claro. |
| **Cliente Recurrente** | Usuario que ya tiene cuenta. Espera rapidez, persistencia y trazabilidad. |
| **Visitante** | Persona sin sesión que consulta información legal o de contacto. |
| **Soporte (interno)** | Equipo de Mi Plata. No es usuario directo del frontend pero su trabajo se ve facilitado por la trazabilidad del sistema. |

---

# 🚀 Lanzamiento 1.0 — MVP Banca Básica

> **Objetivo:** Permitir a un cliente registrarse, iniciar sesión y operar sus dos cuentas básicas (Ahorros y Corriente) con seguridad.
> **Duración:** Sprints 1–4 (8 semanas)
> **Total story points:** 89

## 📦 Épica E1 — Autenticación y Registro

> Permitir la creación segura de cuentas y el ingreso al sistema.

### 🏃 Sprint 1 — Onboarding básico

#### HU-01 · Registro de nuevo cliente · `8 pts` · 🔴 Alta
**Como** cliente nuevo
**quiero** crear una cuenta en Mi Plata con mis datos personales y credenciales
**para** acceder a los servicios bancarios desde mi navegador.

**Criterios de aceptación:**
- El registro se realiza en un wizard de **3 pasos** (datos personales → credenciales → resumen).
- Se valida nombre (≥3 caracteres), identificación (≥5 dígitos), celular (≥7 caracteres) y correo electrónico con formato válido (regex `aaa@bbb.ccc`).
- El usuario debe ser único en el sistema (`miplata_users`).
- La identificación y el correo también deben ser únicos.
- La contraseña debe tener mínimo 6 caracteres con medidor visual de fortaleza (5 niveles).
- Al finalizar, se crean automáticamente 3 cuentas: Ahorros (saldo $0), Corriente (saldo $0) y Tarjeta de Crédito (cupo $5.000.000).
- El cliente es redirigido a la pantalla de inicio de sesión con mensaje de confirmación.

---

#### HU-02 · Inicio de sesión · `5 pts` · 🔴 Alta
**Como** cliente registrado
**quiero** iniciar sesión con mi usuario y contraseña
**para** acceder de forma segura a mis cuentas.

**Criterios de aceptación:**
- Formulario con campos de usuario, contraseña y toggle para mostrar/ocultar contraseña.
- Si las credenciales son correctas, se redirige al Dashboard y se guarda la sesión en `localStorage` (`miplata_session`).
- Si las credenciales son incorrectas, se muestra un toast de error indicando intentos restantes.
- La sesión persiste entre recargas de la página.

---

#### HU-03 · Bloqueo de cuenta tras intentos fallidos · `5 pts` · 🔴 Alta
**Como** equipo de seguridad de Mi Plata
**quiero** que la cuenta se bloquee tras 3 intentos fallidos consecutivos
**para** proteger al usuario contra ataques de fuerza bruta.

**Criterios de aceptación:**
- Cada intento fallido incrementa el contador `intentosFallidos` del cliente.
- Al llegar a 3 intentos, se marca `bloqueado = true` y se persiste en `miplata_attempts`.
- Una cuenta bloqueada muestra un toast persistente y deshabilita el botón de login.
- Solo un proceso administrativo manual puede desbloquear (o resetear datos).
- Los intentos se persisten por usuario aunque cierre el navegador.

---

#### HU-04 · Cerrar sesión · `2 pts` · 🟡 Media
**Como** cliente
**quiero** poder cerrar mi sesión activa
**para** proteger mi información cuando termino de usar el aplicativo.

**Criterios de aceptación:**
- Botón "Cerrar Sesión" visible en la topbar de todas las páginas privadas.
- También accesible desde el menú lateral.
- Al cerrar sesión se limpia `miplata_session` y se redirige al login.
- No se eliminan los datos del usuario, solo la sesión activa.

**Total Sprint 1:** 20 puntos

---

## 📦 Épica E2 — Gestión de Cuentas

> Visualizar saldos y estados de las cuentas del cliente.

### 🏃 Sprint 2 — Dashboard y consultas

#### HU-05 · Visualizar Dashboard con resumen general · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** ver un dashboard con el saldo de mis tres cuentas
**para** tener una visión general de mi situación financiera en un solo vistazo.

**Criterios de aceptación:**
- Saludo dinámico según la hora ("Buenos días/tardes/noches").
- Card de Cuenta de Ahorros con número, saldo disponible y crecimiento mensual.
- Card de Cuenta Corriente con saldo, barra de sobregiro utilizado y porcentaje numérico.
- Card de Tarjeta de Crédito con número enmascarado, fecha de vencimiento y cupo disponible.
- Sección de "Actividad Reciente" con los últimos 4 movimientos.
- Botones de acceso rápido: Consignar, Retirar, Transferir.

---

#### HU-06 · Consultar saldo de cuenta de ahorros · `2 pts` · 🟡 Media
**Como** cliente
**quiero** ver el saldo actualizado de mi cuenta de ahorros
**para** conocer cuánto dinero tengo disponible.

**Criterios de aceptación:**
- El saldo se muestra en formato `$ X.XXX.XXX,XX` (locale es-CO).
- Se actualiza inmediatamente después de cada operación.
- Se muestra el número de cuenta enmascarado (`•••• 8829`).

---

#### HU-07 · Consultar saldo y sobregiro de cuenta corriente · `3 pts` · 🟡 Media
**Como** cliente
**quiero** ver el saldo de mi cuenta corriente y mi cupo de sobregiro
**para** saber cuánto puedo gastar incluyendo el sobregiro disponible.

**Criterios de aceptación:**
- El saldo total se muestra en formato `$ X.XXX.XXX,XX`.
- Se muestra "SOBREGIRO UTILIZADO: $X / $Y" + porcentaje numérico.
- Barra de progreso con color de riesgo: azul (<50%), naranja (50-80%), rojo (>80% o 100%).
- El cupo de sobregiro es el 20% del saldo positivo más alto histórico.

**Total Sprint 2:** 13 puntos

---

## 📦 Épica E3 — Operaciones Básicas

> Permitir al cliente consignar y retirar dinero de sus cuentas.

### 🏃 Sprint 3 — Consignar, retirar

#### HU-08 · Consignar dinero a una cuenta · `5 pts` · 🔴 Alta
**Como** cliente
**quiero** consignar dinero a mi cuenta de Ahorros o Corriente
**para** aumentar mi saldo disponible.

**Criterios de aceptación:**
- Modal con selector de cuenta destino (Ahorros o Corriente).
- Campo de monto que solo acepta valores positivos > 0.
- Validación de errores con mensaje claro.
- Al confirmar, el saldo se actualiza y se registra un movimiento tipo `CONSIGNACION`.
- Toast de éxito con el monto formateado.

---

#### HU-09 · Retirar dinero de cuenta de ahorros con interés · `5 pts` · 🔴 Alta
**Como** cliente
**quiero** retirar dinero de mi cuenta de ahorros
**para** disponer de mis fondos, aceptando el costo del 1.5% de interés.

**Criterios de aceptación:**
- Modal con monto a retirar.
- El sistema cobra `monto + (monto × 1.5%)` del saldo.
- Si los fondos son insuficientes, se muestra error.
- No se permite saldo negativo en cuenta de ahorros.
- Se registra un movimiento tipo `RETIRO`.

---

#### HU-10 · Retirar dinero de cuenta corriente con sobregiro · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** retirar dinero de mi cuenta corriente usando el sobregiro si es necesario
**para** disponer de fondos más allá de mi saldo positivo cuando lo necesite.

**Criterios de aceptación:**
- Modal con monto a retirar.
- Si saldo es positivo, se puede usar hasta `saldo + (20% del saldo positivo más alto)`.
- El `limiteSobregiroBase` es fijo y solo crece cuando entra dinero.
- Al alcanzar el 100% del sobregiro, **se bloquean** todas las operaciones de salida.
- Se muestra un error claro: "Fondos insuficientes. Saldo: $X | Cupo sobregiro: $Y | Disponible: $Z".

**Total Sprint 3:** 18 puntos

---

## 📦 Épica E4 — Transferencias

> Permitir movimientos de dinero entre cuentas propias y a otros usuarios.

### 🏃 Sprint 4 — Transferencias internas y externas

#### HU-11 · Transferir entre mis propias cuentas · `5 pts` · 🔴 Alta
**Como** cliente
**quiero** transferir dinero entre mis cuentas de Ahorros y Corriente
**para** redistribuir mis fondos sin costos adicionales.

**Criterios de aceptación:**
- Pestaña dedicada en la página de Transacciones.
- Selectores de cuenta origen y destino con validación de no ser la misma.
- Monto válido > 0.
- Se debita el origen y se acredita el destino atómicamente.
- Se registran movimientos `TRANSFERENCIA_OUT` en origen y `TRANSFERENCIA_IN` en destino.

---

#### HU-12 · Buscar destinatario por usuario o número de cuenta · `5 pts` · 🟡 Media
**Como** cliente
**quiero** buscar a otra persona por su usuario o número de cuenta
**para** confirmar su identidad antes de transferirle dinero.

**Criterios de aceptación:**
- Input de búsqueda con botón "Buscar".
- Al encontrar, se muestra una card verde con nombre del destinatario, usuario y tipo de cuenta.
- Si no se encuentra, se muestra error rojo con mensaje claro.
- No se puede buscar al propio usuario activo.

---

#### HU-13 · Transferir dinero a otro usuario · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** transferirle dinero a otro usuario de Mi Plata
**para** pagar a terceros o enviar dinero a familiares.

**Criterios de aceptación:**
- Después de buscar destinatario, seleccionar cuenta origen, monto y concepto opcional.
- El dinero siempre se acredita a la cuenta de **Ahorros** del destinatario.
- Validación de fondos suficientes (incluyendo sobregiro si es corriente).
- Movimientos registrados en ambos lados.
- Toast de confirmación con nombre del destinatario.

---

#### HU-14 · Operaciones en la página de Transacciones · `5 pts` · 🟢 Baja
**Como** cliente
**quiero** consignar y retirar desde la misma página de Transacciones
**para** tener todas las operaciones de movimiento de dinero en un solo lugar.

**Criterios de aceptación:**
- Pestaña "Consignar" con selector + monto.
- Pestaña "Retirar" con info dinámica según cuenta (interés Ahorros / sobregiro Corriente).
- Misma lógica que los modales del Dashboard.

**Total Sprint 4:** 23 puntos

---

# 🚀 Lanzamiento 2.0 — Tarjeta de Crédito y Movilidad

> **Objetivo:** Habilitar el producto de Tarjeta de Crédito con sistema de cuotas reales y un historial unificado de movimientos.
> **Duración:** Sprints 5–8 (8 semanas)
> **Total story points:** 84

## 📦 Épica E5 — Tarjeta de Crédito y Simulador

### 🏃 Sprint 5 — Modelo de tarjeta y simulador

#### HU-15 · Visualizar resumen de Tarjeta de Crédito · `5 pts` · 🔴 Alta
**Como** cliente
**quiero** ver el resumen de mi tarjeta de crédito con cupo, deuda y disponible
**para** conocer mi situación de crédito en tiempo real.

**Criterios de aceptación:**
- Página dedicada `TarjetaCredito.html` con 4 stats: Límite de Crédito, Deuda Actual, Cupo Disponible, Próxima Cuota Total.
- Barra de progreso del % usado con colores de riesgo (azul/naranja/rojo).
- Badge informativo de tasas actuales.

---

#### HU-16 · Simular compra con plan de cuotas · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** simular una compra con diferentes plazos
**para** decidir cuánto pagaré en cuotas antes de confirmar.

**Criterios de aceptación:**
- Inputs: descripción, monto, plazo (cuotas).
- Botón "📊 Calcular Cuotas (Solo Simulación)" — gris, solo muestra resultado sin afectar saldos.
- Cálculo según tasas:
  - 1-2 cuotas: 0% (sin interés)
  - 3-6 cuotas: 1.9% mensual
  - 7+ cuotas: 2.3% mensual
- Se muestra cuota mensual, total a pagar y tasa aplicada.
- Tabla de amortización con: Cuota, Cuota Mensual, Capital, Interés, Saldo.

---

#### HU-17 · Realizar compra real con tarjeta de crédito · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** registrar una compra real con mi tarjeta de crédito en cuotas
**para** usar mi cupo de crédito y poder pagar en partes.

**Criterios de aceptación:**
- Botón "✅ Realizar Compra" — azul, diferenciado de la simulación.
- Valida que el monto no exceda el `cupoDisponible`.
- Crea un objeto compra con `{id, fecha, descripcion, montoOriginal, cuotasTotales, cuotasPagadas:0, cuotaMensual, tasa, capitalPorCuota, saldoPendiente, estado:"activa"}`.
- Suma el monto a `tc.deuda` y registra movimiento `COMPRA_TC`.
- La compra aparece en la sección "Mis Compras a Crédito".

**Total Sprint 5:** 21 puntos

---

## 📦 Épica E6 — Pago de cuotas TC

### 🏃 Sprint 6 — Pago de cuotas y total

#### HU-18 · Pagar cuota mensual desde otra cuenta · `13 pts` · 🔴 Alta
**Como** cliente
**quiero** pagar la cuota mensual de una compra usando mi cuenta de Ahorros o Corriente
**para** mantener al día mi tarjeta de crédito.

**Criterios de aceptación:**
- Selector global de "Cuenta para pagar tus cuotas" arriba de la lista (Ahorros / Corriente).
- Botón "💰 Pagar Cuota" en cada compra activa.
- Valida fondos suficientes en la cuenta origen.
- Debita la cuota completa de la cuenta origen y registra `PAGO_TC` (negativo).
- Incrementa `cuotasPagadas`, descuenta `capitalPorCuota` de `tc.deuda`.
- Si es la última cuota, ajusta residuos por redondeo y marca `estado="pagada"`.
- Registra `PAGO_TC` en la TC (positivo, reduce deuda).
- **Atomicidad**: si la validación falla, nada cambia.

---

#### HU-19 · Pagar compra completa anticipadamente · `8 pts` · 🟡 Media
**Como** cliente
**quiero** pagar de una vez todas las cuotas pendientes de una compra
**para** liberarme de la deuda y dejar de pagar intereses.

**Criterios de aceptación:**
- Botón "⚡ Pagar Total" con el monto total restante en el label.
- Calcula `cuotaMensual × cuotasRestantes`.
- Valida fondos y debita atómicamente.
- Marca la compra como `pagada` con `saldoPendiente=0`.
- Registra un movimiento descriptivo en ambas cuentas.

---

#### HU-20 · Visualizar compras pagadas · `3 pts` · 🟢 Baja
**Como** cliente
**quiero** ver mis compras ya pagadas en una vista diferenciada
**para** llevar el historial de mi crédito sin confundirlas con las activas.

**Criterios de aceptación:**
- Las compras `estado="pagada"` aparecen en una card verde con chip "✅ Pagada".
- No tienen botones de pago.
- Muestran fecha de la compra, monto original y cuotas pagadas (X/X).

**Total Sprint 6:** 24 puntos

---

## 📦 Épica E7 — Historial de Movimientos

### 🏃 Sprint 7 — Historial unificado y dashboard

#### HU-21 · Ver historial unificado de movimientos · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** ver todos mis movimientos (de las 3 cuentas) en un solo lugar
**para** revisar mi actividad financiera sin saltar entre páginas.

**Criterios de aceptación:**
- Tabla con columnas: Fecha, Tipo de Movimiento, Cuenta, Valor, Saldo Resultante.
- Movimientos ordenados DESC por fecha.
- Iconos diferenciados por tipo (`🏛` consignación, `💸` retiro, `↗/↙` transferencia, `🛍` compra TC, `✅` pago TC).
- Color del valor: verde "+" para ingresos, rojo "−" para egresos.
- Paginación: 8 movimientos por página, botón "Cargar más".

---

#### HU-22 · Filtrar historial por tipo de cuenta · `3 pts` · 🟡 Media
**Como** cliente
**quiero** filtrar los movimientos por cuenta (Ahorros, Corriente, Tarjeta)
**para** enfocarme solo en una cuenta específica.

**Criterios de aceptación:**
- Chips de filtro: Todas / Ahorros / Corriente / Crédito.
- El chip activo se resalta.
- Al cambiar el filtro, la paginación vuelve a la página 1.

---

#### HU-23 · Buscar movimientos por texto · `3 pts` · 🟡 Media
**Como** cliente
**quiero** buscar movimientos por descripción o tipo
**para** encontrar rápidamente una operación específica.

**Criterios de aceptación:**
- Input "🔍 Buscar" en la topbar.
- Búsqueda case-insensitive en descripción y tipo.
- Resultado se actualiza en vivo mientras se escribe.

**Total Sprint 7:** 14 puntos

---

## 📦 Épica E8 — Dashboard avanzado

### 🏃 Sprint 8 — Mejoras visuales y UX del dashboard

#### HU-24 · Visualizar actividad reciente en dashboard · `3 pts` · 🟢 Baja
**Como** cliente
**quiero** ver mis últimos 4 movimientos en el Dashboard
**para** tener acceso rápido a mi actividad sin entrar al historial.

**Criterios de aceptación:**
- Card "Actividad Reciente" en el dashboard.
- Muestra los últimos 4 movimientos con icono, descripción, fecha corta y monto coloreado.
- Link "Ver Todo" que redirige al historial completo.

---

#### HU-25 · Visualizar tarjeta de crédito con estilo financiero · `3 pts` · 🟢 Baja
**Como** cliente
**quiero** ver mi tarjeta de crédito con un estilo visual similar a una tarjeta real
**para** que sea visualmente atractivo y fácil de identificar.

**Criterios de aceptación:**
- Card con gradiente oscuro (azul institucional).
- Muestra "VISA PLATINUM", número enmascarado tipo `•••• •••• •••• 4402`.
- Fecha de vencimiento y cupo disponible.
- Icono de antena 📶 en la esquina superior izquierda.

---

#### HU-26 · Sidebar navegacional con datos del usuario · `5 pts` · 🟡 Media
**Como** cliente
**quiero** un menú lateral persistente con mis cuentas y navegación principal
**para** moverme por la app sin perder contexto.

**Criterios de aceptación:**
- Sidebar de 220px con logo, avatar con iniciales, nombre y usuario.
- Lista de navegación: Dashboard, Tarjeta de Crédito, Transacciones, Historial, Perfil.
- Item activo resaltado.
- Botones inferiores: Cerrar Sesión, Ayuda.

**Total Sprint 8:** 11 puntos

---

# 🚀 Lanzamiento 3.0 — Extractos, Reportes y Seguridad

> **Objetivo:** Permitir descarga de extractos en PDF, implementar el cupo diario de transferencias y reforzar la seguridad operacional.
> **Duración:** Sprints 9–11 (6 semanas)
> **Total story points:** 73

## 📦 Épica E9 — Extractos en PDF

### 🏃 Sprint 9 — Generación de PDFs

#### HU-27 · Descargar extracto mensual de cuenta de ahorros en PDF · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** descargar un extracto mensual en PDF de mi cuenta de ahorros
**para** tener un respaldo formal de mis movimientos.

**Criterios de aceptación:**
- Botón "⬇ Extracto" en la card de Ahorros del Dashboard.
- El PDF incluye: banner azul institucional, datos del cliente (nombre, identificación, cuenta enmascarada), período seleccionado (mes/año).
- Sección de resumen: Saldo Inicial, Total Ingresos, Total Egresos, Saldo Final.
- Tabla de movimientos del período con: Fecha, Tipo, Descripción, Valor, Saldo.
- Si no hay movimientos en el período: mensaje "Sin movimientos en este período".
- Nombre del archivo: `Extracto-ahorros-MM-YYYY.pdf`.
- jsPDF se carga vía CDN bajo demanda (no penaliza la carga inicial).

---

#### HU-28 · Descargar extracto de cuenta corriente · `3 pts` · 🟡 Media
**Como** cliente
**quiero** descargar el extracto de mi cuenta corriente
**para** documentar mis operaciones, incluyendo el uso del sobregiro.

**Criterios de aceptación:**
- Misma funcionalidad que el extracto de ahorros pero filtrando movimientos de Corriente.
- Botón "⬇ Extracto" en la card de Corriente.
- Archivo: `Extracto-corriente-MM-YYYY.pdf`.

---

#### HU-29 · Descargar extracto completo de tarjeta de crédito · `13 pts` · 🔴 Alta
**Como** cliente
**quiero** descargar un extracto completo de mi tarjeta de crédito
**para** revisar mi deuda, tabla de amortización y compras del mes.

**Criterios de aceptación:**
- Botón "⬇ Descargar Extracto" en el header de la página TC + el botón "⬇ Exportar PDF" en la tabla de amortización.
- PDF con 4 secciones:
  1. **Resumen de Crédito**: Límite, Deuda Actual, Cupo Disponible, Utilización %, Próxima Cuota, Cuotas Pendientes.
  2. **Tabla de Amortización**: próximas 3 cuotas por cada compra activa.
  3. **Compras a Crédito**: descripción, monto, plazo, cuota mensual, estado, saldo pendiente.
  4. **Historial de Movimientos** del mes en la TC.
- Footer con recordatorio del pago mínimo.
- Archivo: `Extracto-TC-MM-YYYY.pdf`.

---

#### HU-30 · Descargar todos los extractos a la vez · `3 pts` · 🟢 Baja
**Como** cliente
**quiero** descargar los 3 extractos (Ahorros, Corriente, TC) con un solo clic
**para** ahorrar tiempo cuando quiero archivar mis estados de cuenta.

**Criterios de aceptación:**
- Link "⬇ DESCARGAR TODOS" en el banner del Dashboard.
- Genera los 3 PDFs del mes actual en secuencia.
- Toast informativo durante el proceso.

---

#### HU-31 · Seleccionar período del extracto en Historial · `5 pts` · 🟡 Media
**Como** cliente
**quiero** seleccionar mes y año específicos para descargar un extracto
**para** poder consultar períodos pasados, no solo el mes actual.

**Criterios de aceptación:**
- Selectores de mes y año en la página de Historial.
- Botón "⬇ Exportar PDF" del período seleccionado.
- Respeta el filtro de cuenta activo:
  - "Todas" → descarga los 3 extractos.
  - Cuenta específica → solo esa.
- Lista de años seleccionables: 3 años hacia atrás + el actual.

**Total Sprint 9:** 32 puntos

---

## 📦 Épica E10 — Seguridad de Transferencias

### 🏃 Sprint 10 — Cupo diario y bloqueo de sobregiro

#### HU-32 · Limitar transferencias diarias a $5.000.000 · `8 pts` · 🔴 Alta
**Como** equipo de seguridad de Mi Plata
**quiero** establecer un cupo diario de $5.000.000 para transferencias
**para** minimizar el impacto en caso de un acceso no autorizado.

**Criterios de aceptación:**
- Card en la página de Transacciones con: monto utilizado, porcentaje y barra de progreso.
- Tope absoluto de $5.000.000.
- Aplica tanto a transferencias entre cuentas propias como a otros usuarios.
- Si la transferencia supera el cupo restante, se muestra error con el monto disponible.
- Al alcanzar el 100%, los botones de transferir se **deshabilitan** automáticamente con tooltip explicativo.

---

#### HU-33 · Persistencia del cupo diario · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** que el cupo diario que ya consumí se mantenga aunque cierre la página y vuelva a abrir
**para** que el sistema no se "reinicie" y permita exceder el límite real de seguridad.

**Criterios de aceptación:**
- El cupo se persiste en `localStorage` bajo la clave `miplata_cupo_diario` por usuario.
- Estructura: `{ [usuario]: { usado, inicioVentana: ISO timestamp } }`.
- La ventana de 24 horas inicia con la **primera transferencia** del usuario.
- Funciones `AppState.getCupoDiario()`, `agregarCupoDiario(monto)`, `resetCupoDiario()`.

---

#### HU-34 · Reset automático del cupo a las 24 horas · `5 pts` · 🟡 Media
**Como** cliente
**quiero** que mi cupo se restablezca automáticamente 24 horas después del primer uso
**para** poder volver a transferir al día siguiente sin intervención.

**Criterios de aceptación:**
- `getCupoDiario()` detecta si han pasado ≥24h desde `inicioVentana` y resetea automáticamente.
- Si la página está abierta cuando expira la ventana, el `setInterval` (60s) detecta el cambio y refresca la UI.
- El texto "Se restablece en X h Y min" se actualiza en vivo.

---

#### HU-35 · Bloquear operaciones de cuenta corriente al 100% del sobregiro · `8 pts` · 🔴 Alta
**Como** equipo de riesgo de Mi Plata
**quiero** que las operaciones de salida se bloqueen cuando el cliente llegue al 100% del sobregiro
**para** evitar saldos negativos más allá del cupo otorgado.

**Criterios de aceptación:**
- Se introduce el campo `limiteSobregiroBase` en `CuentaCorriente`, fijo y serializable.
- El límite solo crece cuando entra dinero (consignaciones o transferencias entrantes); **nunca decrece**.
- Validación estricta: si `monto > saldo + limiteSobregiroBase`, se rechaza la operación.
- Mensaje de error: "Fondos insuficientes. Saldo: $X | Cupo sobregiro: $Y | Disponible total: $Z".
- Nuevos métodos: `sobregiroUtilizado()`, `porcentajeSobregiroUsado()`.

---

#### HU-36 · Mostrar porcentaje de sobregiro con colores de riesgo · `3 pts` · 🟡 Media
**Como** cliente
**quiero** ver visualmente el porcentaje de sobregiro que estoy usando
**para** ser consciente de mi nivel de endeudamiento.

**Criterios de aceptación:**
- En la card de Corriente del dashboard se muestra "$X / $Y" + "P%".
- Color del porcentaje y la barra:
  - 🔵 Azul si <50%
  - 🟠 Naranja si 50-80%
  - 🔴 Rojo si ≥80% o llegó al 100%

**Total Sprint 10:** 32 puntos

---

## 📦 Épica E11 — Perfil y Datos Personales

### 🏃 Sprint 11 — Perfil completo

#### HU-37 · Capturar correo electrónico durante el registro · `5 pts` · 🟡 Media
**Como** cliente nuevo
**quiero** registrar mi correo electrónico al crear la cuenta
**para** recibir notificaciones y extractos en mi email.

**Criterios de aceptación:**
- Campo "Correo Electrónico" en el Paso 1 del wizard de registro.
- Validación de formato (regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
- Validación de unicidad (no se permite el mismo correo en dos cuentas).
- El correo se almacena en `cliente.correo` y se persiste.

---

#### HU-38 · Visualizar y editar correo electrónico en el perfil · `3 pts` · 🟡 Media
**Como** cliente
**quiero** ver y actualizar mi correo electrónico desde mi perfil
**para** mantener mis datos al día.

**Criterios de aceptación:**
- En `PerfilSeguridad.html` se muestra el correo real (no inventado como `${usuario}@miplata.com`).
- En modo edición, hay un campo editable de correo con validación de formato.
- `cliente.editarPerfil(nombre, celular, correo)` actualiza el campo.

---

#### HU-39 · Cambiar contraseña desde el perfil · `5 pts` · 🟡 Media
**Como** cliente
**quiero** cambiar mi contraseña desde mi perfil
**para** mantener mi cuenta segura.

**Criterios de aceptación:**
- Tres campos: contraseña actual, nueva, confirmar.
- Validación: actual correcta + nueva ≥6 caracteres + confirmar coincide.
- Medidor visual de fortaleza de la nueva contraseña.
- Toast de éxito al guardar.

**Total Sprint 11:** 13 puntos

---

# 🚀 Lanzamiento 4.0 — Soporte, Ayuda y Páginas Legales

> **Objetivo:** Brindar al usuario información de ayuda, soporte y cumplimiento legal accesible incluso sin sesión iniciada.
> **Duración:** Sprints 12–13 (4 semanas)
> **Total story points:** 47

## 📦 Épica E12 — Centro de Ayuda

### 🏃 Sprint 12 — Ayuda y FAQ

#### HU-40 · Acceder al Centro de Ayuda · `5 pts` · 🟡 Media
**Como** cliente
**quiero** acceder a un centro de ayuda desde el menú lateral
**para** resolver mis dudas sin contactar soporte.

**Criterios de aceptación:**
- Página `Pages/Ayuda/Ayuda.html` accesible desde el sidebar.
- Hero con saludo amigable.
- 6 cards de accesos rápidos: Cómo usar tu tarjeta, Transferencias, Extractos PDF, Seguridad, Tu perfil, Contacto.
- CTA "Contactar Soporte" al final.

---

#### HU-41 · Consultar FAQ con preguntas desplegables · `8 pts` · 🔴 Alta
**Como** cliente
**quiero** consultar respuestas a preguntas frecuentes sin tener que escribir a soporte
**para** obtener información de forma autónoma.

**Criterios de aceptación:**
- Sección "Preguntas Frecuentes" con al menos 10 preguntas.
- Cada pregunta es un botón que despliega su respuesta con animación.
- Cubre: cambio de contraseña, transferencias a terceros, límite diario, tasas de TC, pago de cuotas, descarga de extractos, intentos fallidos, sobregiro, seguridad de datos, cierre de sesión.
- Respuestas incluyen enlaces internos a Privacidad y Seguridad cuando aplica.

---

#### HU-42 · Búsqueda en historial por fecha · `8 pts` · 🟡 Media
**Como** cliente
**quiero** buscar movimientos por fecha en múltiples formatos
**para** encontrar transacciones de períodos específicos rápidamente.

**Criterios de aceptación:**
- El input de búsqueda detecta automáticamente formatos de fecha:
  - `dd/mm/yyyy` o `dd-mm-yyyy` → día exacto
  - `dd/mm` → día y mes (cualquier año)
  - `mm/yyyy` → mes específico
  - `yyyy` → todo el año
  - `yyyy-mm-dd` (ISO) → día exacto
  - Nombres de mes: `junio`, `jun`, `junio 2026`
- Chip indicador arriba de la tabla: "📅 Filtrando por fecha: 15/06/2026 — 3 resultados".
- Si no es fecha, busca por texto (descripción, tipo, cuenta).
- Funciona combinado con el filtro de cuenta.

**Total Sprint 12:** 21 puntos

---

## 📦 Épica E13 — Páginas Legales y Contacto

### 🏃 Sprint 13 — Cumplimiento y contacto

#### HU-43 · Consultar Política de Privacidad · `3 pts` · 🟡 Media
**Como** visitante o cliente
**quiero** leer la política de privacidad
**para** entender cómo se trata mi información personal.

**Criterios de aceptación:**
- Página `Pages/Privacidad/Privacidad.html`.
- 10 secciones: introducción, datos recopilados, uso, almacenamiento, derechos del titular, cookies, seguridad, menores de edad, cambios, contacto.
- Información de versión y última actualización.
- Accesible **con o sin sesión iniciada**.

---

#### HU-44 · Consultar Términos y Condiciones · `3 pts` · 🟡 Media
**Como** visitante o cliente
**quiero** leer los términos y condiciones
**para** conocer los derechos y responsabilidades de usar Mi Plata.

**Criterios de aceptación:**
- Página `Pages/Terminos/Terminos.html` con 13 secciones.
- Aviso legal de que es app demo con fines académicos.
- Información de productos financieros, límites, tarifas, responsabilidades, ley aplicable.

---

#### HU-45 · Consultar información de Seguridad · `5 pts` · 🟡 Media
**Como** visitante o cliente
**quiero** conocer cómo Mi Plata protege mi información
**para** sentirme seguro al usar la plataforma.

**Criterios de aceptación:**
- Página `Pages/Seguridad/Seguridad.html`.
- Estado de seguridad de la cuenta (si hay sesión).
- 6 medidas implementadas (SSL, bloqueo, monitoreo, límites, validación, sesiones).
- 6 recomendaciones para el usuario.
- CTA "Reportar Ahora" para actividades sospechosas.

---

#### HU-46 · Contactar a soporte mediante formulario · `8 pts` · 🔴 Alta
**Como** visitante o cliente
**quiero** enviar un mensaje al equipo de soporte
**para** resolver mis dudas o reportar incidentes.

**Criterios de aceptación:**
- Página `Pages/Contacto/Contacto.html` con formulario.
- Campos: Nombre, Correo, Asunto (select), Mensaje (textarea).
- Validaciones: nombre ≥2 caracteres, correo formato válido, asunto requerido, mensaje ≥10 caracteres.
- Si hay sesión activa, los campos de nombre y correo se prellenan.
- Mensaje de éxito al enviar (simulado con setTimeout en este demo).
- Información lateral: 4 sucursales (Bogotá, Medellín, Cali, Barranquilla), 6 canales de atención.

---

#### HU-47 · Acceder a páginas legales sin sesión iniciada · `5 pts` · 🔴 Alta
**Como** visitante (sin sesión)
**quiero** acceder a las páginas de Privacidad, Términos, Seguridad y Contacto
**para** consultar información antes de registrarme.

**Criterios de aceptación:**
- Las 4 páginas legales tienen un **modo adaptativo**:
  - Si `AppState.getClienteActivo()` retorna un cliente: sidebar normal + topbar.
  - Si no hay sesión: clase `.public-mode` en `<body>` + header alternativo (`.public-header`).
- El header público muestra: logo "Mi Plata", links a las 4 páginas legales y botón "Iniciar Sesión".
- Los enlaces del footer del login y del registro funcionan correctamente.

---

#### HU-48 · Eliminar item duplicado del sidebar · `2 pts` · 🟢 Baja
**Como** cliente
**quiero** que el menú lateral sea limpio y no tenga opciones redundantes
**para** navegar sin confusión.

**Criterios de aceptación:**
- El item "Cuentas" del sidebar (que apuntaba al mismo Dashboard) ha sido eliminado.
- El menú queda: Dashboard, Tarjeta de Crédito, Transacciones, Historial, Perfil.
- El botón "Ayuda" enlaza a la página real (antes mostraba `alert`).

**Total Sprint 13:** 26 puntos

---

# 📊 Resumen ejecutivo

## Por lanzamiento

| Release | Épicas | Sprints | Historias | Story Points |
|---------|--------|---------|-----------|--------------|
| R1.0 — MVP Banca Básica | 4 | 4 | 14 | 74 |
| R2.0 — TC y Movilidad | 4 | 4 | 12 | 70 |
| R3.0 — Extractos y Seguridad | 3 | 3 | 13 | 77 |
| R4.0 — Ayuda y Legal | 2 | 2 | 9 | 47 |
| **Total** | **13** | **13** | **48** | **268** |

## Distribución por prioridad

| Prioridad | Cantidad | % |
|-----------|----------|---|
| 🔴 Alta | 19 | 39.5% |
| 🟡 Media | 22 | 45.8% |
| 🟢 Baja | 7 | 14.7% |

## Trazabilidad técnica

Las historias se implementan sobre los siguientes módulos:

| Capa | Archivos clave |
|------|----------------|
| Estado global | `assets/app.js` (AppState, serialización, PDF, cupo diario) |
| Modelos | `Models/abstract/Cuenta.js`, `Models/cuentas/*`, `Models/entities/Cliente.js` |
| Páginas privadas | `Pages/GestionDeCuentas`, `Pages/TarjetaCredito`, `Pages/Transacciones`, `Pages/HistorialDeMovimientos`, `Pages/PerfilSeguridad`, `Pages/Ayuda` |
| Páginas públicas/adaptativas | `Pages/Privacidad`, `Pages/Terminos`, `Pages/Seguridad`, `Pages/Contacto` |
| Autenticación | `Pages/iniciarSesion`, `Pages/registrar` |
| Estilos | `assets/css/global.css` (variables, sidebar, public-mode) |

---

## 🎯 Definición de "Terminado" (Definition of Done)

Para considerar una historia completada se debe cumplir:

- ✅ Código implementado siguiendo las convenciones del proyecto (vanilla JS, ES modules, sin frameworks).
- ✅ Validaciones de entrada en frontend (montos, formatos, longitudes).
- ✅ Persistencia en `localStorage` cuando corresponda, con serialización adecuada.
- ✅ Compatibilidad hacia atrás con datos antiguos del navegador.
- ✅ Feedback visual al usuario (toasts, mensajes inline, deshabilitación de botones).
- ✅ Manejo de casos límite (saldo insuficiente, sesión expirada, datos faltantes).
- ✅ Pruebas manuales del flujo principal y al menos 2 casos de error.
- ✅ Documentación actualizada en `documentacion.md` si la historia introduce nuevos conceptos.
- ✅ Sin warnings en consola del navegador en flujos normales.

---

*Fin del documento — Mi Plata · Historias de Usuario v1.0*
