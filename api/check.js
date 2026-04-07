const PROMPT = (word) => `Controleer het volgende Nederlandse woord op spelling: "${word}"

Antwoord ALLEEN met een geldig JSON object, geen uitleg, geen markdown backticks:
{
  "correct": true of false,
  "correctWord": "het juiste Nederlandse woord",
  "uitleg": "korte uitleg voor een kind van 6-10 jaar (max 10 woorden)",
  "imageQuery": "Engels zoekwoord voor een plaatje (1-4 woorden)"
}`;

// Reset-tijd: middernacht Pacific = 09:00 Nederlandse tijd
function getResetTime() {
  const now = new Date();
  const reset = new Date(now);
  reset.setUTCHours(7, 0, 0, 0);
  if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1);
  const tijd = reset.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
  const dag  = reset.toLocaleDateString('nl-NL', { weekday: 'long', timeZone: 'Europe/Amsterdam' });
  return `${dag} om ${tijd}`;
}

async function tryGemini(word, apiKey) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT(word) }] }],
        generationConfig: { temperature: 0.1 }
      })
    }
  );
  if (resp.status === 429) return { exhausted: true };
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text };
}

async function tryGroq(word, apiKey, model) {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: PROMPT(word) }],
      temperature: 0.1,
      max_tokens: 300
    })
  });
  if (resp.status === 429) return { exhausted: true };
  if (!resp.ok) throw new Error(`Groq ${resp.status}`);
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text };
}

function parseResult(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word } = req.body;
  if (!word || typeof word !== 'string') return res.status(400).json({ error: 'Geen woord opgegeven' });

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey   = process.env.GROQ_API_KEY;

  const providers = [];
  if (geminiKey) providers.push({ name: 'Gemini',      fn: () => tryGemini(word, geminiKey) });
  if (groqKey)   providers.push({ name: 'Groq Llama',  fn: () => tryGroq(word, groqKey, 'llama-3.3-70b-versatile') });
  if (groqKey)   providers.push({ name: 'Groq klein',  fn: () => tryGroq(word, groqKey, 'llama-3.1-8b-instant') });

  for (const provider of providers) {
    try {
      console.log(`Probeer ${provider.name}...`);
      const result = await provider.fn();
      if (result.exhausted) {
        console.log(`${provider.name} is vol, volgende proberen...`);
        continue;
      }
      const parsed = parseResult(result.text);
      return res.status(200).json({ ...parsed, _provider: provider.name });
    } catch (err) {
      console.error(`${provider.name} fout:`, err.message);
      continue;
    }
  }

  // Alle providers zijn op
  return res.status(429).json({
    error: 'quotum_vol',
    resetTime: getResetTime()
  });
}
