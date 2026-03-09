import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
// Note: Imagen 4 is accessed via model names depending on the Google AI library version.
// Often available as 'imagen-3.0-generate-001' or similar in genkit Google AI plugin.

// Inicializamos la instancia de Genkit
export const ai = genkit({
  plugins: [googleAI()],
});
