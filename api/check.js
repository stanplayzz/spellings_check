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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Controleer het volgende Nederlandse woord op spelling: "${word}"

Antwoord ALLEEN met een geldig JSON object, geen uitleg, geen markdown backticks:
{
  "correct": true of false,
  "correctWord": "het juiste Nederlandse woord",
  "uitleg": "korte uitleg voor een kind van 6-10 jaar (max 10 woorden)",
  "imageQuery": "Engels zoekwoord voor een plaatje (1-2 woorden)"
}`
            }]
          }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (response.status === 429) {
      // Bereken reset-tijd: middernacht Pacific Time omgezet naar Nederlandse tijd
      const now = new Date();
      const pacificOffset = -7; // PDT (zomer), -8 in winter (PST)
      const dutchOffset = 2;    // CEST (zomer), 1 in winter (CET)
      const diffHours = dutchOffset - pacificOffset; // 9 uur verschil

      // Middernacht Pacific = 09:00 Nederlandse tijd
      const resetNL = new Date(now);
      resetNL.setUTCHours(7, 0, 0, 0); // 07:00 UTC = 09:00 NL (CEST)
      if (resetNL <= now) resetNL.setUTCDate(resetNL.getUTCDate() + 1);

      const resetStr = resetNL.toLocaleTimeString('nl-NL', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam'
      });
      const resetDay = resetNL.toLocaleDateString('nl-NL', {
        weekday: 'long', timeZone: 'Europe/Amsterdam'
      });

      return res.status(429).json({
        error: 'quotum_vol',
        resetTime: `${resetDay} om ${resetStr}`
      });
    }

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
