# Axiom: Resumen Integral del Sistema

Fecha de actualizacion: 9 de marzo de 2026.

## 1) Que es Axiom

Axiom es un sistema de analitica personal y regulacion conductual que integra:

1. Registro operativo de senales (eventos, finanzas, interacciones).
2. Motor de calculo bio-conductual (estado global, areas, hormonas, score diario).
3. Capa de visualizacion avanzada (dashboards, matrices, correlaciones, timelines).
4. Capa de recomendaciones (protocolos, alertas inteligentes, directiva diaria).

No es un sistema de diagnostico medico. Es una simulacion computacional con inspiracion clinica y neurocientifica.

## 2) Funcionalidades por modulo

## 2.1 Dashboard General

1. Estado global del sistema (`OK`, `RIESGO`, `CRITICO`).
2. Score diario y tendencia temporal.
3. Drivers principales de drenaje y recuperacion.
4. Alertas contextuales con acceso directo a la seccion afectada.
5. Modo de soporte en estados criticos.

## 2.2 Analiticas

1. Series temporales de score global y estabilidad.
2. Timeline de estado global.
3. Heatmap semanal de actividad.
4. Correlaciones (descanso/productividad, estres/impulsividad, dopamina/disciplina).
5. Analisis de areas:
   - score por area,
   - tendencia por area,
   - matriz de estado diario por area,
   - contribucion positiva/negativa,
   - waterfall de eventos,
   - timeline de decaimiento (arrastre de impacto).
6. Analisis hormonal:
   - niveles actuales,
   - curva temporal,
   - disparadores principales.
7. Variables y patrones:
   - ranking por impacto,
   - frecuencia vs impacto,
   - dominancia diaria,
   - impacto impulsivo,
   - co-ocurrencias.
8. Matriz de impacto variable-hormona y top conexiones.
9. Metricas por habilidades, sistemas, habitos, protocolos y estados.
10. Finanzas/interacciones/cuentas/deudas en formato analitico.

## 2.3 Finanzas Inteligentes

1. KPIs de flujo de caja, ahorro, patrimonio y concentracion de gasto.
2. Registro de movimientos desde la pestana de finanzas.
3. Filtros de movimientos (tipo, categoria, cuenta, impulsividad, busqueda).
4. Alertas proactivas (cashflow negativo, deuda, impulsividad, runway, desvios).
5. Presupuesto vs real por categoria (pockets).
6. Forecast de cashflow (escenarios base/optimista/conservador).
7. Cohortes de ahorro + media movil.
8. Estacionalidad del gasto (dia/hora).
9. Flujo de dinero (vista Sankey + desglose principal).
10. Regla 50/30/20 con progreso por bloque.
11. Estrategia de deuda y tabla de amortizacion.

## 2.4 Notificaciones y Briefing

1. Centro de notificaciones inteligentes.
2. Directiva del dia (briefing operativo).
3. Enlaces directos a modulos accionables.
4. Control de lectura/completado.

## 2.5 Datos y CRUD Operativo

1. Tablas y formularios para areas, variables, hormonas, eventos, transacciones, relaciones, etc.
2. Persistencia en Firestore con lecturas reactivas.
3. Deduplicacion y saneamiento de datos en hooks de consumo.

## 3) Motor de calculo: capas y algoritmos

## 3.1 Senales de entrada (ultimos 7 dias y ventanas historicas)

1. Eventos.
2. Interacciones.
3. Transacciones.
4. Perfil de sensibilidad.
5. Matriz impacto variable-hormona.

## 3.2 Dinamica hormonal (simulada)

Se aplica por hormona:

1. Intensidad transformada por curva de respuesta de variable:
   - lineal,
   - umbral,
   - exponencial.
2. `delay_dias` antes de que aparezca el efecto.
3. Duracion efectiva (`duration_hours`/`duracion_dias`).
4. Decaimiento exponencial posterior (`exp(-k*t)`).
5. Modulacion circadiana por fase horaria.
6. Ajuste por sensibilidad del perfil.

Salida: niveles simulados de dopamina, serotonina, cortisol, foco, energia, sueno, conexion social y carga dopaminergica.

## 3.3 Acoplamientos sistemicos

1. Estres alto reduce foco/energia/serotonina.
2. Disregulacion dopaminergica incrementa carga dopaminergica.
3. Deficit de sueno amplifica cortisol y reduce foco.
4. Interacciones sociales afectan eje serotonina/cortisol/conexion social.
5. Senales financieras afectan cortisol, foco, energia, serotonina y carga dopaminergica.

## 3.4 Score global y estado

1. `resources` (motivacion, foco, energia, sueno, conexion).
2. `load` (cortisol + carga dopaminergica).
3. penalizacion por carga alostatica.
4. compensacion por reserva de recuperacion.
5. suavizado temporal vs score previo.
6. reglas de colapso para forzar estado critico.
7. histeresis de estado (`OK`/`RIESGO`/`CRITICO`) para evitar flips erraticos.

## 3.5 Motor clinico v2 (riesgo)

Ejes latentes:

1. `threat_load`
2. `reward_drive`
3. `executive_control`
4. `recovery_capacity`
5. `social_buffer`

Salida:

1. `risk_score` (0-100)
2. `risk_band` (`LOW`, `MODERATE`, `HIGH`, `SEVERE`)
3. `confidence`
4. `data_quality`
5. `markers` explicativos.

## 3.6 Calculo unificado de areas (single source of truth)

Se centraliza en `src/lib/area-scoring.ts` y lo consumen tanto writer como analytics.

Elementos:

1. Base de area.
2. Contribucion por evento usando curva + delay + duracion + decaimiento.
3. Clamp [0,100].
4. Cap por estado global.
5. Estado de area con umbrales configurables (`umbral_riesgo`, `umbral_critico`).

Esto elimina discrepancias entre calculo de backend local (writer) y visualizacion en analiticas.

## 3.7 Auto-calibracion de sensibilidad

1. Usa historico de eventos y transiciones de score diario.
2. Estima cargas por dominio (`stress`, `dopamine`, `sleep`, `emotional`, `pressure`, `environmental`).
3. Ajusta sensitivities con confianza y limites.
4. Persiste de forma espaciada (intervalo temporal y minimo de transiciones).

## 4) Matrices y estructuras analiticas

## 4.1 Matriz de Impacto Variable -> Hormona

Cada fila define:

1. variable origen,
2. hormona destino,
3. `effect_size`,
4. `duration_hours`.

Es la base causal del motor hormonal y del heatmap de impacto.

## 4.2 Matriz de estado por area (tiempo x areas)

1. Filas: areas.
2. Columnas: dias del rango.
3. Celda: estado diario (`OK`, `RIESGO`, `CRITICO`).

## 4.3 Matriz de co-ocurrencias (variables negativas)

1. Cuenta pares de variables negativas dentro de una ventana temporal.
2. Permite detectar disparadores en cadena.

## 4.4 Matriz relacional social

1. Relacion persona-energia-respeto-frecuencia.
2. Se cruza con interacciones para inferir efecto neto social.

## 5) Referencias bibliograficas y marco cientifico

Referencias principales usadas en la documentacion del proyecto:

1. McEwen BS (1998), allostatic load.
2. Keramati M, Gutkin B (2014), homeostatic reinforcement learning.
3. Schultz W (1997), reward prediction error.
4. Berridge KC, Robinson TE (1998), wanting vs liking.
5. Miller EK, Cohen JD (2001), control ejecutivo prefrontal.
6. Arnsten AFT (2009), estres y funcion prefrontal.
7. Heinrichs M et al. (2003), social buffering y cortisol.

Documentos internos de referencia:

1. `docs/scientific-model-v2-clinical.md`
2. `docs/clinical-validation-spec.md`

## 6) Stack tecnologico

## 6.1 Frontend

1. Next.js 15.5.9 (App Router, Turbopack).
2. React 19.
3. TypeScript 5.
4. TailwindCSS + utilidades de diseno.
5. Radix UI (base de componentes).
6. Recharts (visualizacion).
7. date-fns (fechas).

## 6.2 Backend / Datos

1. Firebase Firestore.
2. Firebase Auth.
3. Firebase Storage.
4. Firebase Functions (Node).
5. Emuladores Firebase para entorno local.

## 6.3 IA / Flujos

1. Genkit.
2. `@genkit-ai/google-genai`.
3. Flujos de briefing, insights y recomendaciones.

## 6.4 Calidad y DX

1. `tsc --noEmit` para typecheck.
2. ESLint.
3. scripts de seed/migracion/debug.

## 7) Documentos y rutas clave

1. Motor clinico v2: `src/lib/model-v2-clinical.ts`
2. Motor areas unificado: `src/lib/area-scoring.ts`
3. Writer computado: `src/hooks/use-computed-data-writer.ts`
4. Consumo de datos: `src/hooks/use-user-data.ts`
5. Dashboard analiticas: `src/app/dashboard/analytics/page.tsx`
6. Dashboard finanzas: `src/app/dashboard/finances/page.tsx`
7. Notificaciones: `src/hooks/use-smart-notifications.ts`
8. Workflow Git: `docs/GIT_WORKFLOW.md`
9. Changelog: `docs/CHANGELOG.md`

## 8) Limitaciones y criterios de uso

1. No sustituye evaluacion clinica profesional.
2. Riesgo y estado son inferencias de senales conductuales internas.
3. La calidad del resultado depende de densidad y calidad de registro.
4. Debe mantenerse gobernanza de modelo:
   - versionado,
   - explicabilidad,
   - validacion continua.

## 9) Proximos incrementos recomendados

1. Historial persistente de `computed_areas` diario (no solo snapshot actual).
2. Sensibilidad de decaimiento especifica por tipo de variable.
3. Validacion estadistica de v2 en shadow mode (Brier/AUROC/calibracion).
4. Documentar contrato de datos por coleccion Firestore (schema operativo).
