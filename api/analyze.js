export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Проанализируй график торговой пары. Укажи направление сделки (ПОКУПКА / ПРОДАЖА), время экспирации и процент вероятности.'
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Не удалось получить ответ';

    return res.status(200).json({ result: resultText });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
