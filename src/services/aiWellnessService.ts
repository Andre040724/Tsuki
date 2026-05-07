/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface WellnessInsight {
  headline: string;
  advice: string;
  actionItem: string;
  tag: string;
}

export async function getWellnessInsight(
  phase: string, 
  symptoms: string[], 
  mood: string, 
  energy: string,
  mode: 'hubby' | 'wifey' | 'solo' = 'wifey'
): Promise<WellnessInsight> {
  const modeContext = {
    hubby: "You are giving advice to the hubby/partner. Help him understand her needs and suggest a gesture.",
    wifey: "You are giving supportive, high-end advice directly to her.",
    solo: "You are giving empowering, functional health advice directly to her."
  }[mode];

  const prompt = `
    ${modeContext}
    
    Current Status:
    - Cycle Phase: ${phase}
    - Symptoms logged today: ${symptoms.join(', ') || 'None'}
    - Mood: ${mood}
    - Energy Level: ${energy}
    
    Provide a concise, science-backed wellness insight.
    Format your response as a JSON object with these keys:
    - headline: A catchy, empathetic 3-5 word title.
    - advice: A 1-2 sentence supportive explanation.
    - actionItem: One specific, small thing they can do right now.
    - tag: A short 1-word category (e.g., NUTRITION, HYDRATION, MOVEMENT, REST, SUPPORT).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback insight
    return {
      headline: "Tune into your rhythm",
      advice: `You're currently in your ${phase} phase. Every body is different, so listen to what yours is telling you.`,
      actionItem: "Try a glass of warm lemon water to start your day.",
      tag: "WELLNESS"
    };
  }
}
