# Referencias clínicas del motor Axiom

Mapa entre los mecanismos que modela `use-computed-data-writer.ts` y la literatura
clínica que los respalda (o no). Para cada uno: el hallazgo con cifras reales, la
fuente, cómo está implementado hoy y una recomendación de calibración.

> ⚠️ **Honestidad científica.** Axiom es una herramienta de autoconocimiento, no un
> dispositivo médico. Varios "biomarcadores" del motor (dopamina, serotonina,
> foco como número 0-100) **no son magnitudes medibles** desde el registro de
> eventos de un usuario — son *proxies metafóricos* inspirados en la fisiología.
> Esta tabla sirve para que los **parámetros temporales y las direcciones de
> efecto** estén alineados con la evidencia, no para afirmar que medimos hormonas.

---

## 1. Cortisol — ritmo circadiano y vida media

**Evidencia**
- Vida media de eliminación del cortisol: **1.2–2.0 horas**.
- El cortisol sigue un ritmo circadiano marcado: pico ~30–45 min tras despertar,
  descenso progresivo, mínimo hacia medianoche.

**Implementación actual**
- `CIRCADIAN_PHASES.CORTISOL` con `peakHour: 8`, `amplitude: 0.16`.
- Decaimiento farmacocinético vía `DECAY_K` por hormona.

**Calibración recomendada**
- La constante de decaimiento del cortisol debería corresponder a su vida media:
  `k = ln(2) / 1.5h ≈ 0.46/h`. Verifica que `DECAY_K` del cortisol esté en ese
  rango (~0.4–0.5), no más lento.
- El pico a las 8h y amplitud ±16% es razonable.

**Fuentes:** [Cortisol (Wikipedia)](https://en.wikipedia.org/wiki/Cortisol) ·
[Hydrocortisone — half-life](https://en.wikipedia.org/wiki/Hydrocortisone)

---

## 2. Cortisol Awakening Response (CAR)

**Evidencia**
- Aumento del **38–75 % (media ~50 %)** del cortisol salival, pico **30–45 min**
  tras despertar.
- Presente en **~77 %** de personas sanas de todas las edades.
- Salival al despertar ~15 nmol/L → ~23 nmol/L a los 30 min.
- Patrón estable intra-individuo y en gran parte determinado genéticamente.

**Implementación actual**
- `physioCortisolContrib = 30 * exp(-0.25 * hoursAwakeCAR)` — exención fisiológica
  que decae a lo largo de la mañana.

**Calibración recomendada**
- El CAR es un **pico** (sube y baja en 45 min), no una exención que decae 14h.
  Considera modelarlo como una gaussiana centrada a +0.5h del despertar, no como
  una exponencial decreciente de amplitud 30 — esto evita el "acantilado matutino"
  que detectó la auditoría temporal.
- La media de +50 % justifica una amplitud moderada; +75 % solo para el extremo.

**Fuentes:** [Cortisol awakening response (Wikipedia)](https://en.wikipedia.org/wiki/Cortisol_awakening_response)

---

## 3. Ciclo ultradiano BRAC (~90 min)

**Evidencia**
- Kleitman (1963, revisión 1982): ciclo básico reposo-actividad de **~90 min
  (rango 80–120)** que continúa en vigilia.
- Primeros **60–70 min**: mayor alerta, foco y función ejecutiva.
- Últimos **~20 min**: enlentecimiento, las ondas cerebrales cambian, las hormonas
  caen.
- Corroborado por EEG, ensayos hormonales y expresión de genes reloj — pero la
  evidencia en vigilia es **más débil y variable** que durante el sueño.

**Implementación actual**
- `bracCycleMin = minutesSinceWake % 90`, fase pico `≤ 0.55`, valle `≥ 0.75`.

**Calibración recomendada**
- El periodo de 90 min es correcto. La fase de pico debería cubrir ~0.66 (60-70 min
  de 90), no 0.55 — alarga ligeramente la ventana de alta alerta.
- **Reduce amplitudes**: la auditoría mostró ±15 pts de foco cada 90 min, demasiado
  para una señal cuya evidencia en vigilia es modesta. ±3-5 pts es más defendible.

**Fuentes:** [Basic rest–activity cycle (Wikipedia)](https://en.wikipedia.org/wiki/Basic_rest%E2%80%93activity_cycle) ·
[Kleitman, "BRAC—22 Years Later", Sleep 1982](https://academic.oup.com/sleep/article-pdf/5/4/311/13677735/050401.pdf)

---

## 4. Deuda de sueño acumulativa

**Evidencia**
- Van Dongen et al. (2003, *Sleep*): 14 noches de **6h o 4h** producen déficits
  cognitivos **dosis-dependientes y acumulativos** (PVT), equivalentes a 1-2 noches
  de privación total.
- Hallazgo clave: los sujetos **subestimaban** su deterioro — la percepción
  subjetiva no rastrea la deuda objetiva.
- La deuda se acumula noche a noche; no se "salda" con una sola noche de
  recuperación.

**Implementación actual**
- `sleepDebtScore` con ventana ponderada de 7 noches, `NIGHTLY_IDEAL = 75`,
  `NIGHTLY_BASELINE = 65` cuando no hay datos.

**Calibración recomendada**
- El modelo acumulativo de 7 noches está **bien fundamentado** — es de los más
  sólidos del motor.
- Cuidado con `NIGHTLY_BASELINE = 65` (sin datos = déficit): introduce un sesgo
  pesimista en usuarios nuevos. Considera "sin datos = desconocido" (no penalizar).

**Fuentes:** [Van Dongen et al., chronic sleep restriction](https://en.wikipedia.org/wiki/Sleep_debt) ·
[Effects of sleep deprivation on cognition (Wikipedia)](https://en.wikipedia.org/wiki/Effects_of_sleep_deprivation_on_cognitive_performance)

---

## 5. Fatiga de decisión / ego depletion ⚠️

**Evidencia — y un aviso importante**
- El "ego depletion" (base de la fatiga de decisión) **falló la replicación**.
- Registered Replication Report (Hagger et al., 2016): 23 laboratorios, N=2141,
  efecto **d = 0.04, IC 95 % [−0.07, 0.15]** — el intervalo incluye el cero.
- El meta-análisis original (d≈0.62) tenía fuerte sesgo de estudios pequeños;
  corregido, el efecto se acerca a cero.

**Implementación actual**
- `decisionFatigueScore` con decaimiento de 24h, penaliza foco hasta −14 pts.

**Calibración recomendada**
- Este es el mecanismo **menos respaldado** del motor. Opciones:
  1. Reducir mucho su peso (−14 → −4 pts máx).
  2. Re-etiquetarlo como "carga cognitiva acumulada" (más neutral) en vez de
     afirmar "fatiga de decisión", que tiene connotación científica desacreditada.
  3. Basarlo en sobrecarga real (nº de eventos de alta intensidad) más que en un
     "depósito de fuerza de voluntad" que la evidencia no respalda.

**Fuentes:** [RRR ego depletion — multilab (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4971805/) ·
[Updated meta-analysis of ego depletion](https://www.researchgate.net/publication/315488844_An_Updated_Meta-Analysis_of_the_Ego_Depletion_Effect)

---

## 6. Soledad → HPA / recompensa social

**Evidencia (Cacioppo)**
- La soledad (aislamiento *percibido*) predice desregulación del eje HPA:
  cortisol matutino más alto y pendiente diurna alterada.
- Altera la expresión génica en leucocitos (patrón CTRA — más inflamación).
- Menor activación del estriado ventral ante estímulos sociales placenteros →
  **recompensa social reducida**.
- Es un efecto **crónico** (días-semanas), no horario.

**Implementación actual**
- `LONELINESS_DRAIN`: `daysSincePositiveContact`, drena conexión social/serotonina
  y sube cortisol, escalando hasta el día 8.

**Calibración recomendada**
- La dirección de efecto (soledad → ↑cortisol, ↓recompensa social) es correcta.
- La escala temporal de **días** es apropiada (no minutos). Mantén el guard de
  modo aprendizaje y, como recomendó la auditoría, **congela el contador cuando el
  usuario simplemente no registra** (distinguir "aislado" de "no usa la app").

**Fuentes:** [John T. Cacioppo (Wikipedia)](https://en.wikipedia.org/wiki/John_T._Cacioppo) ·
[Eje HPA (Wikipedia)](https://en.wikipedia.org/wiki/Hypothalamic%E2%80%93pituitary%E2%80%93adrenal_axis) ·
[Social buffering](https://en.wikipedia.org/wiki/Social_buffering)

---

## 7. Social jet lag / cronotipo

**Evidencia (Roenneberg)**
- Social jet lag = **diferencia del punto medio del sueño** entre días laborables y
  libres, medida **en horas**.
- Asociado a riesgo cardiometabólico: ↑triglicéridos, ↓HDL, ↓sensibilidad a la
  insulina.
- Se mide con el Munich Chronotype Questionnaire (MCTQ).

**Implementación actual**
- `chronotype`, `sjlMagnitude`, penalización de foco/cortisol cuando hay
  desalineación con el pico óptimo.

**Calibración recomendada**
- La métrica correcta es **horas de diferencia de midsleep** — si el motor no la
  deriva de datos reales de sueño, la penalización SJL es especulativa. Considera
  pedir hora de acostarse/levantarse (laboral vs libre) para calcularla bien.
- Suaviza el umbral duro `>6h` (la auditoría lo marcó como salto brusco).

**Fuentes:** [Social jetlag (Wikipedia)](https://en.wikipedia.org/wiki/Social_jetlag) ·
[Munich Chronotype Questionnaire](https://en.wikipedia.org/wiki/Munich_Chronotype_Questionnaire)

---

## 8. Carga alostática

**Evidencia (McEwen & Stellar 1993; Seeman et al. 2001, MacArthur)**
- "Desgaste" acumulado por estrés crónico en sistemas neuroendocrino, cardiovascular,
  inmune y metabólico.
- Operacionalización canónica: **conteo de biomarcadores en el cuartil de mayor
  riesgo** (índice 0–N, típicamente 10 marcadores: presión sistólica/diastólica,
  ratio cintura-cadera, colesterol total/HDL, HbA1c, DHEA-S, cortisol urinario,
  adrenalina, noradrenalina, IL-6/PCR).
- Mayor índice → mayor mortalidad y deterioro funcional.

**Implementación actual**
- `allostaticLoad` / `allostaticAccumulationScore` como acumulación continua sobre
  "semanas malas" del historial de score.

**Calibración recomendada**
- El enfoque canónico es un **conteo discreto** (cuántos ejes están en zona de
  riesgo), no un continuo. Podrías alinear: contar cuántos stats núcleo están en
  rango "malo" (p.ej. ≥3 de 5 bajos) como un índice 0–N interpretable.
- Evita el bucle de retroalimentación que detectó la auditoría (el score malo
  escrito alimenta "semanas malas" que re-bloquean CRITICO).

**Fuentes:** [Allostatic load (Wikipedia)](https://en.wikipedia.org/wiki/Allostatic_load) ·
[Bruce McEwen (Wikipedia)](https://en.wikipedia.org/wiki/Bruce_McEwen)

---

## 9. Dopamina — error de predicción de recompensa, habituación, tolerancia

**Evidencia (Schultz)**
- Las neuronas dopaminérgicas codifican el **error de predicción de recompensa**:
  disparan ante recompensas *inesperadas*, no ante las predichas.
- **Habituación**: la señal fásica se atenúa con la repetición; la satisfacción
  vuelve hacia la línea base.
- **Tolerancia**: con el tiempo las expectativas suben, hace falta "más dosis" para
  el mismo error de predicción → explica por qué los logros puntuales no sostienen
  la felicidad.

**Implementación actual**
- `carga_dopaminergica`, decaimiento por `rank` (habituación hedónica),
  `maxToleranceRank`/tolerancia por variable.

**Calibración recomendada**
- La **dirección y la lógica** (habituación + tolerancia con repetición) están
  **bien fundamentadas** conceptualmente — es de los modelos más fieles.
- Recordatorio: "nivel de dopamina 0-100" no es medible; trátalo como un índice de
  carga/habituación de recompensa, no como una concentración.

**Fuentes:** [Schultz, Predictive Reward Signal of Dopamine Neurons (J Neurophysiol 1998)](https://journals.physiology.org/doi/full/10.1152/jn.1998.80.1.1) ·
[Reward prediction error (BrainFacts)](https://www.brainfacts.org/brain-anatomy-and-function/genes-and-molecules/2021/discovering-dopamines-role-in-reward-prediction-error-122121)

---

## Resumen: solidez de cada mecanismo y estado de aplicación

| Mecanismo | Respaldo clínico | Acción | Estado |
|-----------|------------------|--------|--------|
| Vida media / ritmo cortisol | 🟢 Sólido | `DECAY_K` cortisol 0.2→0.46 (t½ 1.5h) | ✅ Aplicado |
| CAR | 🟢 Sólido | Gaussiana pico +0.5h, no exención 14h | ✅ Aplicado |
| Deuda de sueño acumulativa | 🟢 Sólido | "Sin datos = desconocido", no déficit | ✅ Aplicado |
| Dopamina habituación/tolerancia | 🟢 Conceptualmente sólido | Mantener; `k` 0.5→0.4 suaviza cliff | ✅ Aplicado |
| Soledad → HPA | 🟡 Dirección sólida, escala días | Guard modo aprendizaje | ✅ Previo |
| Social jet lag | 🟡 Sólido si midsleep real | Onset suave (rampa 5h), pesos ↓ | ✅ Aplicado |
| BRAC ultradiano | 🟡 Débil en vigilia | Amplitudes ↓ (foco 7→4), pico→0.66 | ✅ Aplicado |
| Carga alostática | 🟡 Sólido como conteo discreto | Reformular como índice 0-N | ⏳ Pendiente |
| **Fatiga de decisión** | 🔴 **Falló replicación** | Peso ↓ (14→5) + reetiquetado | ✅ Aplicado |

🟢 bien fundamentado · 🟡 parcial / depende de la implementación · 🔴 evidencia débil

### Validación
Las calibraciones se verifican en `scripts/sim-engine-stability.mjs` (escenario H):
vida media del cortisol 1.51h, CAR con pico a +30min y ~0 a las 2h, BRAC ≤5 pts,
carga cognitiva ≤5 pts, deuda de sueño 0 sin registros.

---

*Generado a partir de búsqueda en literatura clínica (junio 2026). Las fuentes son
mayoritariamente artículos de síntesis (Wikipedia) que citan los estudios primarios;
para publicación o uso clínico, consultar los papers originales (Van Dongen 2003,
Hagger 2016, Seeman 2001, Roenneberg 2006, Schultz 1998).*
