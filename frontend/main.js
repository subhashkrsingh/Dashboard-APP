import { toPercentChange, toIndexed, toRaw } from './utils/normalize.js';

const maxPoints = 60;
const seriesRaw = {}; // symbol -> array of {ts: Date, price: number}
const companyMap = {};

const modeSelect = document.getElementById('mode');
let chartMode = modeSelect?.value || 'raw';

function updateCardNames() {
  Object.keys(seriesRaw).forEach(symbol => {
    const id = 'card-' + symbol.replace(/[^a-zA-Z0-9_-]/g, '_');
    const card = document.getElementById(id);
    if (card) {
      const name = companyMap[symbol]?.name ?? symbol;
      const titleElem = card.querySelector('h3');
      if (titleElem) titleElem.textContent = name;
      let tickerElem = card.querySelector('.ticker');
      if (!tickerElem) {
        tickerElem = document.createElement('div');
        tickerElem.className = 'ticker';
        card.insertBefore(tickerElem, card.querySelector('.price'));
      }
      tickerElem.textContent = symbol;
    }
  });
}

fetch('/api/companies')
  .then(r => r.json())
  .then(arr => {
    arr.forEach(c => (companyMap[c.symbol] = c));
    updateCardNames();
  })
  .catch(() => {});

const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    animation: false,
    parsing: false,
    normalized: true,
    scales: {
      x: { type: 'time', time: { unit: 'minute' } },
      y: { beginAtZero: false, title: { display: true, text: 'Price' } }
    }
  }
});

const palette = ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40','#8aff8a','#ff7b7b','#7bd1ff'];

function pickColorForSymbol(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function ensureDataset(symbol) {
  if (!seriesRaw[symbol]) {
    seriesRaw[symbol] = [];
    const color = pickColorForSymbol(symbol);
    chart.data.datasets.push({
      label: symbol,
      data: [],
      borderColor: color,
      backgroundColor: color,
      tension: 0.2,
      fill: false,
      pointRadius: 0
    });
  }
}

function updateYAxisTitle() {
  const text =
    chartMode === 'percent'
      ? 'Percent Change'
      : chartMode === 'indexed'
        ? 'Indexed (Base 100)'
        : 'Price';
  chart.options.scales.y.title.text = text;
}

function transformSeries(raw) {
  const cleaned = (raw || []).filter(p => Number.isFinite(p.price));
  if (cleaned.length === 0) return [];
  const baseSeries = cleaned.map(p => ({ ts: p.ts, price: p.price }));
  if (chartMode === 'percent') return toPercentChange(baseSeries);
  if (chartMode === 'indexed') return toIndexed(baseSeries);
  return toRaw(baseSeries);
}

function updateChart() {
  const allT = Array.from(
    new Set(
      [].concat(...Object.values(seriesRaw).map(arr => arr.map(p => p.ts.toISOString())))
    )
  ).sort();
  chart.data.labels = allT.map(t => new Date(t));

  chart.data.datasets.forEach(dataset => {
    const raw = seriesRaw[dataset.label] || [];
    const transformed = transformSeries(raw);
    const map = new Map(transformed.map(p => [p.ts.toISOString(), p.value]));
    dataset.data = chart.data.labels.map(l => ({ x: l, y: map.get(l.toISOString()) ?? null }));
  });

  updateYAxisTitle();
  chart.update();
}

if (modeSelect) {
  modeSelect.addEventListener('change', () => {
    chartMode = modeSelect.value;
    updateChart();
  });
}

const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${wsProtocol}://${location.host}`);
ws.addEventListener('open', () => console.log('WS open'));
ws.addEventListener('message', evt => {
  const msg = JSON.parse(evt.data);
  if (msg.type === 'quotes') {
    msg.data.forEach(q => {
      if (!Number.isFinite(q.price)) return;
      ensureDataset(q.symbol);
      seriesRaw[q.symbol].push({ ts: new Date(q.timestamp), price: q.price });
      if (seriesRaw[q.symbol].length > maxPoints) seriesRaw[q.symbol].shift();

      const cardId = 'card-' + q.symbol.replace(/[^a-zA-Z0-9_-]/g, '_');
      let card = document.getElementById(cardId);
      if (!card) {
        card = document.createElement('div');
        card.id = cardId;
        const displayName = companyMap[q.symbol]?.name ?? q.symbol;
        card.innerHTML = `<h3>${displayName}</h3><div class="ticker">${q.symbol}</div><div class="price">-</div><div class="change">-</div>`;
        document.getElementById('cards').appendChild(card);
      }
      card.querySelector('.price').textContent = q.price != null ? q.price.toFixed(2) : 'N/A';
      card.querySelector('.change').textContent = q.changePercent != null ? (q.changePercent * 100).toFixed(2) + '%' : '';
    });
    updateChart();
  }
});
