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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Controleer het volgende Nederlandse woord op spelling: "${word}"\n\nAntwoord ALLEEN met een geldig JSON object, geen uitleg, geen markdown backticks:\n{\n  "correct": true of false,\n  "correctWord": "het juiste Nederlandse woord",\n  "uitleg": "korte uitleg voor een kind van 6-10 jaar (max 10 woorden)",\n  "imageQuery": "Engels zoekwoord voor een plaatje (1-2 woorden)"\n}`
            }]
          }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API fout: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Spelling check fout:', err);
    return res.status(500).json({ error: 'Kon het woord niet controleren' });
  }
}
