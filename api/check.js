export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { word } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Geen woord opgegeven' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API sleutel ontbreekt' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Controleer het volgende Nederlandse woord op spelling: "${word}"

Antwoord ALLEEN met een geldig JSON object, geen uitleg, geen markdown backticks:
{
  "correct": true of false,
  "correctWord": "het juiste Nederlandse woord",
  "uitleg": "korte uitleg voor een kind van 6-10 jaar (max 10 woorden)",
  "imageQuery": "Engels zoekwoord voor een plaatje (1-2 woorden)"
}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API fout: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Spelling check fout:', err);
    return res.status(500).json({ error: 'Kon het woord niet controleren' });
  }
}
