export default async function handler(req, res) {
  const { q, word } = req.query;
  if (!q && !word) return res.status(400).json({ error: 'Geen zoekterm' });

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Geen Pixabay sleutel' });

  // Zoekstrategie: meerdere termen proberen, meest specifiek eerst
  const terms = [];
  if (word) terms.push(word);           // exact Nederlands woord
  if (q && q !== word) terms.push(q);   // Engelse vertaling als backup

  for (const term of terms) {
    try {
      // Probeer eerst alleen foto's van objecten/dingen (illustraties zien er beter uit voor kinderen)
      for (const type of ['photo', 'illustration']) {
        const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(term)}&image_type=${type}&safesearch=true&per_page=10&min_width=300&editors_choice=false&order=popular`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (data.hits?.length > 0) {
          // Kies het best scorende plaatje (meeste likes/downloads = meest relevant)
          const hit = data.hits[0];
          return res.status(200).json({ url: hit.webformatURL, term });
        }
      }
    } catch(e) { continue; }
  }

  return res.status(200).json({ url: null });
}
