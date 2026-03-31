import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { word } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Geen woord opgegeven' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API sleutel ontbreekt' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Controleer het volgende Nederlandse woord op spelling: "${word}"

Antwoord ALLEEN met een geldig JSON object, geen uitleg, geen markdown backticks:
{
  "correct": true of false,
  "correctWord": "het juiste Nederlandse woord",
  "uitleg": "korte uitleg voor een kind van 6-10 jaar (max 10 woorden)",
  "imageQuery": "Engels zoekwoord voor een plaatje (1-2 woorden)"
}`
    });

    const text = response.text;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Spelling check fout:', err);
    return res.status(500).json({ error: 'Kon het woord niet controleren' });
  }
}
