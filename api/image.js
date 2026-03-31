export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Geen zoekterm opgegeven' });
  }

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Pixabay sleutel ontbreekt' });
  }

  try {
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=5&lang=nl`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Pixabay fout');

    const data = await response.json();

    if (data.hits && data.hits.length > 0) {
      // Kies een willekeurig plaatje uit de eerste 5 resultaten
      const hit = data.hits[Math.floor(Math.random() * data.hits.length)];
      return res.status(200).json({ url: hit.webformatURL });
    } else {
      return res.status(200).json({ url: null });
    }
  } catch (err) {
    console.error('Plaatje ophalen mislukt:', err);
    return res.status(200).json({ url: null });
  }
}
