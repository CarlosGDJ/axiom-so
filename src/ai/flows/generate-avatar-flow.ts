
'use server';

/**
 * @fileOverview Generates an avatar image based on a text prompt.
 *
 * - generateAvatar - A function that takes a text prompt and returns an image data URL.
 * - GenerateAvatarInput - The input type for the generateAvatar function.
 * - GenerateAvatarOutput - The return type for the generateAvatar function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAvatarInputSchema = z.object({
  prompt: z.string().describe('A text description of the avatar to generate.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

const GenerateAvatarOutputSchema = z.object({
  avatarDataUrl: z.string().describe('The generated avatar image as a data URI.'),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export async function generateAvatar(input: GenerateAvatarInput): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a square digital avatar based on the following description. The style should be modern, clean, and suitable for a user profile picture. Description: ${input.prompt}`,
      config: {
        aspectRatio: "1:1",
      }
    });
    
    if (!media) {
      throw new Error('Image generation failed entirely and did not return a media object.');
    }

    if (!media.url) {
      throw new Error('Image generation failed to return a URL.');
    }

    return { avatarDataUrl: media.url };
  }
);
