
# Análisis del Estado del Proyecto Axiom v2.0

Este documento detalla la arquitectura técnica y los algoritmos biológicos refinados para la simulación multihormonal sistémica.

## 🚀 Stack Tecnológico

*   **Core:** Next.js 15 (App Router) + React 19 + TypeScript.
*   **UI/UX:** Tailwind CSS + ShadCN UI + Lucide React.
*   **Visualización:** Recharts (Gráficos dinámicos y Matrix Heatmaps).
*   **Backend:** Firebase (Firestore & Authentication).
*   **AI Engine (Google AI Provider):** 
    *   **Orquestación:** Google Genkit.
    *   **Modelos de Lenguaje:** Gemini 2.5 Flash (para insights, briefings y protocolos).
    *   **Modelos de Imagen:** Imagen 4 (para generación de avatares).
*   **Algoritmos:** Axiom Bio-Engine v2.0 (Modelo Farmacocinético de decaimiento exponencial).

## 🧬 Algoritmos Biológicos (Axiom Bio-Engine v2.0)

### 1. Simulación Orgánica de Alta Fidelidad
Implementación del modelo farmacocinético para el cálculo de niveles hormonales en tiempo real:
*   **Fórmula:** $V(t) = Peak \times e^{-k(t-d)}$
    *   $Peak$: Magnitud del impacto ($effect\_size \times \frac{intensidad}{5}$).
    *   $d$: Duración del pico (meseta) antes de empezar el decay.
    *   $k$: Constante de eliminación específica por biomarcador.

### 2. Constantes de Recuperación ($k$)
| Molécula | k | Persistencia |
| :--- | :---: | :--- |
| **Dopamina** | 0.6 | Muy volátil (picos cortos) |
| **Cortisol** | 0.2 | Persistencia moderada (estrés) |
| **Serotonina** | 0.1 | Muy estable (bienestar base) |
| **Endorfinas** | 0.3 | Moderada |
| **Focus** | 0.4 | Volátil (resaca atencional) |
| **Energía** | 0.1 | Estable (metabolismo) |

### 3. Matriz de Eventos Fisiológicos Humanos (v2.0)
Contiene 44 eventos únicos con impactos multihormonales sistémicos sincronizados con la UI de registro.

## 💰 Arquitectura Financiera
*   **Patrimonio:** Cálculo dinámico `Σ(Cuentas) - Σ(Deudas)`.
*   **Deuda:** Estrategia "Bola de Nieve" con proyecciones de amortización extra y ahorro de intereses.
*   **Pockets:** Sistema de presupuesto interactivo comparado con gastos medios históricos reales.
