export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image' });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'No API key' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-instruct', // ВОТ ЗДЕСЬ ИЗМЕНЕНИЕ
        messages: [{ role: 'user', content: [
          { type: 'text', text: 'Проанализируй график. Направление (ПОКУПКА/ПРОДАЖА), время, вероятность.' },
          { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }
        ]}]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.status(200).json({ result: data.choices[0].message.content });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
