export default async function handler(req, res) {
  const { q, exact } = req.query;
  if (!q && !exact) {
    return res.status(400).json({ error: 'Geen zoekterm opgegeven' });
  }

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Pixabay sleutel ontbreekt' });
  }

  const searchTerms = [];
  if (exact) searchTerms.push(exact);
  if (q && q !== exact) searchTerms.push(q);

  for (const term of searchTerms) {
    try {
      const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(term)}&image_type=photo&safesearch=true&per_page=8&min_width=400`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (data.hits && data.hits.length > 0) {
        const hit = data.hits[Math.floor(Math.random() * Math.min(5, data.hits.length))];
        return res.status(200).json({ url: hit.webformatURL });
      }
    } catch(e) {
      continue;
    }
  }

  return res.status(200).json({ url: null });
}
