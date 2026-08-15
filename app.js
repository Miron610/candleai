const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const input = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusEl = document.getElementById('status');
const result = document.getElementById('result');
const historyEl = document.getElementById('history');

let selectedTimeframe = null;
let selectedFile = null;
const history = [];

document.querySelectorAll('#timeframes button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#timeframes button').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    selectedTimeframe = btn.dataset.tf;
    updateButton();
  };
});

input.onchange = () => {
  selectedFile = input.files?.[0] || null;
  if (!selectedFile) return;
  preview.src = URL.createObjectURL(selectedFile);
  preview.classList.remove('hidden');
  statusEl.textContent = 'Скриншот выбран';
  updateButton();
};

function updateButton() {
  analyzeBtn.disabled = !(selectedFile && selectedTimeframe);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Сжимаем скриншот перед отправкой, чтобы запрос был быстрым и укладывался
// в лимиты serverless-функции.
async function compressImage(file) {
  const dataUrl = await fileToDataURL(file);
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

analyzeBtn.onclick = async () => {
  if (!selectedFile || !selectedTimeframe) return;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'AI анализирует…';
  statusEl.textContent = 'Анализируем график';
  result.classList.add('hidden');

  try {
    const image = await compressImage(selectedFile);

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ image, timeframe: selectedTimeframe })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка анализа');

    renderResult(data);
    addHistory(data);
    statusEl.textContent = 'Готово';
  } catch (err) {
    statusEl.textContent = 'Ошибка';
    alert(err.message);
  } finally {
    analyzeBtn.textContent = 'Анализировать график';
    updateButton();
  }
};

function renderResult(data) {
  const direction = document.getElementById('direction');
  direction.textContent = data.signal === 'NO_SIGNAL' ? 'NO SIGNAL' : data.signal;
  direction.className = 'direction ' + (
    data.signal === 'UP' ? 'up' :
    data.signal === 'DOWN' ? 'down' : 'wait'
  );

  document.getElementById('confidence').textContent = `${data.confidence}%`;
  document.getElementById('resultTf').textContent = data.timeframe_label;
  document.getElementById('trend').textContent = data.trend;
  document.getElementById('momentum').textContent = data.momentum;
  document.getElementById('setup').textContent = data.setup_quality;
  document.getElementById('reason').textContent = data.reason;
  result.classList.remove('hidden');
}

function addHistory(data) {
  history.unshift(data);
  history.splice(10);
  historyEl.innerHTML = history.map(x => {
    const cls = x.signal === 'UP' ? 'up' : x.signal === 'DOWN' ? 'down' : 'wait';
    return `<div class="history-item">
      <span class="${cls}"><b>${x.signal}</b> · ${x.timeframe_label}</span>
      <span>${x.confidence}%</span>
    </div>`;
  }).join('');
}
