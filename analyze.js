const TIMEFRAMES = {
  "30s": "30 секунд",
  "1m": "1 минута",
  "2m": "2 минуты",
  "3m": "3 минуты",
  "4m": "4 минуты",
  "5m": "5 минут",
  "10m": "10 минут",
  "15m": "15 минут",
  "20m": "20 минут"
};

function cleanJson(text) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI не вернул JSON");
  return JSON.parse(match[0]);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY не настроен в Vercel → Settings → Environment Variables"
    });
  }

  const { image, timeframe } = req.body || {};

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Не найден корректный скриншот" });
  }

  if (!TIMEFRAMES[timeframe]) {
    return res.status(400).json({ error: "Неверный таймфрейм" });
  }

  // Ограничение размера входа на стороне приложения.
  if (image.length > 8_000_000) {
    return res.status(413).json({ error: "Скриншот слишком большой" });
  }

  const systemPrompt = `
Ты — модуль визуального анализа биржевого/трейдингового графика.
На входе один скриншот графика и выбранный горизонт ${TIMEFRAMES[timeframe]}.

Твоя задача — аккуратно извлечь только то, что действительно видно на изображении:
- направление последних свечей;
- структуру движения;
- приблизительный тренд;
- импульс;
- видимые уровни поддержки/сопротивления;
- возможный пробой/отбой;
- качество сетапа.

Не выдумывай значения, которых не видно.
Не утверждай, что результат гарантирован.
Если изображение нечёткое, график обрезан, свечей недостаточно или ситуация неоднозначна — используй NO_SIGNAL.

ВАЖНО: signal — это аналитическая классификация изображения, а не обещание прибыли.

Верни ТОЛЬКО валидный JSON без markdown:
{
  "signal": "UP" | "DOWN" | "NO_SIGNAL",
  "confidence": number от 0 до 100,
  "trend": "bullish" | "bearish" | "sideways" | "unclear",
  "momentum": "positive" | "negative" | "neutral" | "unclear",
  "setup_quality": "good" | "medium" | "weak" | "unclear",
  "reason": "краткое объяснение на русском, 1-3 предложения"
}

Если signal = NO_SIGNAL, confidence должен быть не выше 55.
Не подгоняй confidence под желаемый результат.
`;

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `${systemPrompt}\nВыбранный горизонт: ${TIMEFRAMES[timeframe]}. Проанализируй изображение.` },
            { type: "input_image", image_url: image, detail: "high" }
          ]
        ],
        max_output_tokens: 500
      })
    });

    const payload = await openaiResponse.json();

    if (!openaiResponse.ok) {
      const msg = payload?.error?.message || "OpenAI API error";
      return res.status(openaiResponse.status).json({ error: msg });
    }

    const text = payload.output_text || "";
    const parsed = cleanJson(text);

    if (!["UP", "DOWN", "NO_SIGNAL"].includes(parsed.signal)) {
      throw new Error("Некорректный signal от AI");
    }

    parsed.confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
    if (parsed.signal === "NO_SIGNAL") parsed.confidence = Math.min(parsed.confidence, 55);

    return res.status(200).json({
      signal: parsed.signal,
      confidence: parsed.confidence,
      trend: parsed.trend || "unclear",
      momentum: parsed.momentum || "unclear",
      setup_quality: parsed.setup_quality || "unclear",
      reason: parsed.reason || "Недостаточно данных для уверенного вывода.",
      timeframe,
      timeframe_label: TIMEFRAMES[timeframe]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || "Не удалось выполнить AI-анализ"
    });
  }
};
