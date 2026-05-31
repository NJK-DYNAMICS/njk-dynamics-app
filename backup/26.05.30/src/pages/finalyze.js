/* FINALYZE — Análise de contratos de financiamento (NJK Dynamics) */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const STORAGE_KEY = 'geminiApiKey';

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  uploadSection: document.getElementById('uploadSection'),
  processingSection: document.getElementById('processingSection'),
  processingText: document.getElementById('processingText'),
  resultsSection: document.getElementById('resultsSection'),
  metaGrid: document.getElementById('metaGrid'),
  hdrContrato: document.getElementById('hdrContrato'),
  amortTableBody: document.getElementById('amortTableBody'),
  amortTableFoot: document.getElementById('amortTableFoot'),
  tableMeta: document.getElementById('tableMeta'),
  downloadBtn: document.getElementById('downloadBtn'),
  newUploadBtn: document.getElementById('newUploadBtn'),
  configSection: document.getElementById('configSection'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  showApiKeyBtn: document.getElementById('showApiKeyBtn'),
  toastContainer: document.getElementById('toastContainer'),
  footerTs: document.getElementById('footerTs'),
};

let globalReport = null;

/* ── Init ─────────────────────────────────────────── */
(function init() {
  const saved = localStorage.getItem(STORAGE_KEY)?.trim();
  if (saved && els.apiKeyInput) els.apiKeyInput.value = saved;
  updateApiKeyPanel(!!saved);

  els.saveApiKeyBtn?.addEventListener('click', () => {
    const key = els.apiKeyInput.value.trim();
    if (!key) {
      showToast('error', 'API Key', 'Informe uma chave válida.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, key);
    updateApiKeyPanel(true);
    showToast('success', 'Salvo', 'Chave armazenada neste navegador.');
  });

  els.showApiKeyBtn?.addEventListener('click', () => {
    updateApiKeyPanel(false);
    els.apiKeyInput?.focus();
  });

  els.dropZone.addEventListener('click', () => els.fileInput.click());
  els.dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      els.fileInput.click();
    }
  });

  ['dragover', 'dragenter'].forEach((ev) => {
    els.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    els.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropZone.classList.remove('dragover');
    });
  });

  els.dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  els.fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    els.fileInput.value = '';
  });

  els.downloadBtn.addEventListener('click', exportExcel);
  els.newUploadBtn.addEventListener('click', resetUpload);

  tickFooterClock();
  setInterval(tickFooterClock, 1000);
})();

function updateApiKeyPanel(keySaved) {
  if (els.configSection) {
    els.configSection.classList.toggle('hidden', keySaved);
  }
  if (els.showApiKeyBtn) {
    els.showApiKeyBtn.classList.toggle('hidden', !keySaved);
  }
}

function tickFooterClock() {
  if (els.footerTs) {
    els.footerTs.textContent = new Date().toLocaleString('pt-BR');
  }
}

function showToast(type, title, msg) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<strong>${escapeHtml(title)}</strong><br>${escapeHtml(msg)}`;
  els.toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function handleFile(file) {
  if (file.type !== 'application/pdf') {
    showToast('error', 'Formato inválido', 'Envie apenas arquivos PDF.');
    return;
  }
  processPDF(file);
}

function resetUpload() {
  globalReport = null;
  els.resultsSection.classList.add('hidden');
  els.uploadSection.classList.remove('hidden');
}

async function processPDF(file) {
  const apiKey = localStorage.getItem(STORAGE_KEY)?.trim();

  try {
    els.uploadSection.classList.add('hidden');
    els.processingSection.classList.remove('hidden');
    els.resultsSection.classList.add('hidden');

    setProcessing('Extraindo texto do PDF…');
    const pdfText = await extractTextFromPDF(file);

    let contract;
    if (apiKey) {
      setProcessing('Analisando contrato com IA…');
      contract = await callGeminiAPI(pdfText, apiKey);
    } else {
      showToast('info', 'Modo local', 'Sem API Key — usando leitura heurística do PDF.');
      contract = parseHeuristic(pdfText);
    }

    setProcessing('Montando cronograma de amortização…');
    const normalized = normalizeContract(contract);
    const schedule = buildSchedule(normalized);
    globalReport = { contract: normalized, schedule, fileName: file.name };

    renderReport(globalReport);
    els.processingSection.classList.add('hidden');
    els.resultsSection.classList.remove('hidden');
    showToast('success', 'Contrato processado', `${schedule.length} parcelas no cronograma.`);
  } catch (err) {
    console.error(err);
    showToast('error', 'Erro', err.message || 'Falha ao processar o PDF.');
    els.processingSection.classList.add('hidden');
    els.uploadSection.classList.remove('hidden');
  }
}

function setProcessing(msg) {
  els.processingText.textContent = msg;
}

async function extractTextFromPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const numPages = Math.min(pdf.numPages, 25);
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return fullText;
}

async function callGeminiAPI(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = `Você é especialista em contratos de financiamento bancário e rural no Brasil.
Analise o texto do contrato e retorne APENAS um JSON válido (sem markdown).

Extraia ou infira com cuidado:
- cliente: nome do cliente / mutuário / beneficiário principal
- agenteFinanceiro: banco, cooperativa ou instituição credora
- tomador: tomador do crédito (pessoa ou empresa obrigada)
- valorCaptado: valor principal financiado (número)
- dataEmissao: data de emissão ou assinatura (YYYY-MM-DD)
- taxaJurosMensal: taxa de juros mensal em decimal (ex: 1,2% a.m. = 0.012)
- taxaJurosAnual: taxa anual em decimal se estiver explícita (opcional)
- sistemaAmortizacao: "PRICE", "SAC" ou "OUTRO"
- numeroParcelas: quantidade de parcelas (número inteiro)
- dataPrimeiroVencimento: primeira data de vencimento (YYYY-MM-DD)
- numeroContrato: identificador do contrato se houver
- indexador: CDI, IPCA, pré-fixado etc. se houver
- garantias: resumo curto de garantias se houver
- parcelas: se o contrato trouxer cronograma explícito, array de objetos:
  { "numero", "vencimento" (YYYY-MM-DD), "saldoDevedor", "amortizacao", "juros", "totalPago" }

Use null para campos não encontrados. Valores monetários sempre como número (sem R$).

JSON esperado:
{
  "cliente": null,
  "agenteFinanceiro": null,
  "tomador": null,
  "valorCaptado": null,
  "dataEmissao": null,
  "taxaJurosMensal": null,
  "taxaJurosAnual": null,
  "sistemaAmortizacao": null,
  "numeroParcelas": null,
  "dataPrimeiroVencimento": null,
  "numeroContrato": null,
  "indexador": null,
  "garantias": null,
  "parcelas": []
}

Contrato:
${text.substring(0, 45000)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Falha na análise: ${response.status}. Verifique a API Key. ${errBody.slice(0, 120)}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia da IA.');

  return parseJsonSafe(raw);
}

function parseJsonSafe(raw) {
  let t = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function parseHeuristic(text) {
  const valorMatch = text.match(/R\$\s*([\d.,]+)/i) || text.match(/valor[:\s]+([\d.,]+)/i);
  const taxaMatch = text.match(/([\d,]+)\s*%\s*(?:a\.?\s*m|ao\s*m[eê]s)/i);
  const parcelasMatch = text.match(/(\d+)\s*(?:parcelas|prestações|prestacoes)/i);
  const dateMatch = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);

  let valorCaptado = null;
  if (valorMatch) {
    valorCaptado = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
  }

  let taxaJurosMensal = null;
  if (taxaMatch) {
    taxaJurosMensal = parseFloat(taxaMatch[1].replace(',', '.')) / 100;
  }

  let dataEmissao = null;
  if (dateMatch) {
    dataEmissao = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  const upper = text.toUpperCase();
  let sistemaAmortizacao = 'PRICE';
  if (upper.includes('SAC') && !upper.includes('PRICE')) sistemaAmortizacao = 'SAC';

  return {
    cliente: null,
    agenteFinanceiro: null,
    tomador: null,
    valorCaptado,
    dataEmissao,
    taxaJurosMensal,
    sistemaAmortizacao,
    numeroParcelas: parcelasMatch ? parseInt(parcelasMatch[1], 10) : 12,
    dataPrimeiroVencimento: dataEmissao,
    numeroContrato: null,
    indexador: null,
    garantias: null,
    parcelas: [],
  };
}

function normalizeContract(raw) {
  const taxa = raw.taxaJurosMensal ?? raw.interestRateMonthly ?? null;
  let taxaMensal = taxa;
  if (taxaMensal == null && raw.taxaJurosAnual != null) {
    taxaMensal = Math.pow(1 + Number(raw.taxaJurosAnual), 1 / 12) - 1;
  }
  if (taxaMensal == null) taxaMensal = 0.01;

  const valor = Number(raw.valorCaptado ?? raw.principal ?? 0) || 0;
  const n = parseInt(raw.numeroParcelas ?? raw.numero_parcelas ?? 12, 10) || 12;
  const sistema = String(raw.sistemaAmortizacao ?? raw.amortizationSystem ?? 'PRICE').toUpperCase();

  const firstDue =
    raw.dataPrimeiroVencimento ?? raw.dueDate ?? raw.dataEmissao ?? new Date().toISOString().slice(0, 10);

  return {
    cliente: raw.cliente ?? raw.client ?? '—',
    agenteFinanceiro: raw.agenteFinanceiro ?? raw.credor ?? raw.banco ?? '—',
    tomador: raw.tomador ?? raw.mutuario ?? raw.cliente ?? '—',
    valorCaptado: valor,
    dataEmissao: raw.dataEmissao ?? raw.dataAssinatura ?? null,
    taxaJurosMensal: taxaMensal,
    taxaJurosAnual: raw.taxaJurosAnual ?? null,
    sistemaAmortizacao: sistema.includes('SAC') ? 'SAC' : sistema.includes('PRICE') ? 'PRICE' : sistema,
    numeroParcelas: n,
    dataPrimeiroVencimento: firstDue,
    numeroContrato: raw.numeroContrato ?? raw.contrato ?? null,
    indexador: raw.indexador ?? null,
    garantias: raw.garantias ?? null,
    parcelas: Array.isArray(raw.parcelas) ? raw.parcelas : [],
  };
}

function buildSchedule(contract) {
  if (contract.parcelas?.length > 0) {
    return normalizeParcelas(contract.parcelas, contract.valorCaptado);
  }

  const P = contract.valorCaptado;
  const i = contract.taxaJurosMensal;
  const n = contract.numeroParcelas;
  const start = parseDate(contract.dataPrimeiroVencimento);

  if (contract.sistemaAmortizacao === 'SAC') {
    return buildSAC(P, i, n, start);
  }
  return buildPRICE(P, i, n, start);
}

function normalizeParcelas(parcelas, valorInicial) {
  return parcelas
    .map((p, idx) => ({
      numero: p.numero ?? idx + 1,
      saldoDevedor: Number(p.saldoDevedor ?? p.saldo ?? 0),
      vencimento: p.vencimento ?? p.dataVencimento ?? p.dueDate,
      amortizacao: Number(p.amortizacao ?? p.amortization ?? 0),
      juros: Number(p.juros ?? p.interest ?? 0),
      totalPago: Number(p.totalPago ?? p.total ?? p.valorParcela ?? 0),
    }))
    .sort((a, b) => a.numero - b.numero);
}

function buildPRICE(P, i, n, startDate) {
  const rows = [];
  let balance = P;
  const rate = i > 0 ? i : 0.0001;
  const pmt =
    rate < 1e-9
      ? P / n
      : (P * (rate * Math.pow(1 + rate, n))) / (Math.pow(1 + rate, n) - 1);

  for (let k = 1; k <= n; k++) {
    const juros = balance * rate;
    const amort = Math.min(balance, pmt - juros);
    const total = amort + juros;
    rows.push({
      numero: k,
      saldoDevedor: balance,
      vencimento: formatDateISO(addMonths(startDate, k)),
      amortizacao: amort,
      juros,
      totalPago: total,
    });
    balance = Math.max(0, balance - amort);
  }
  return rows;
}

function buildSAC(P, i, n, startDate) {
  const rows = [];
  let balance = P;
  const amortFix = P / n;
  const rate = i > 0 ? i : 0;

  for (let k = 1; k <= n; k++) {
    const juros = balance * rate;
    const amort = Math.min(balance, amortFix);
    const total = amort + juros;
    rows.push({
      numero: k,
      saldoDevedor: balance,
      vencimento: formatDateISO(addMonths(startDate, k)),
      amortizacao: amort,
      juros,
      totalPago: total,
    });
    balance = Math.max(0, balance - amort);
  }
  return rows;
}

function parseDate(iso) {
  if (!iso) return new Date();
  const d = new Date(iso + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDateISO(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const dt = d instanceof Date ? d : parseDate(d);
  return dt.toISOString().slice(0, 10);
}

function formatDateBR(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatPercentMonthly(rate) {
  if (rate == null) return '—';
  return `${(Number(rate) * 100).toFixed(4).replace(/\.?0+$/, '')}% a.m.`;
}

function renderReport(report) {
  const { contract, schedule } = report;

  els.hdrContrato.textContent = contract.numeroContrato
    ? `Contrato ${contract.numeroContrato}`
    : 'Contrato de financiamento';

  const metaFields = [
    { label: 'Cliente', value: contract.cliente },
    { label: 'Agente financeiro', value: contract.agenteFinanceiro },
    { label: 'Tomador', value: contract.tomador },
    { label: 'Valor captado', value: formatCurrency(contract.valorCaptado), mono: true },
    { label: 'Data de emissão', value: formatDateBR(contract.dataEmissao) },
    {
      label: 'Taxa de juros',
      value: formatPercentMonthly(contract.taxaJurosMensal),
      mono: true,
    },
    { label: 'Sistema de amortização', value: contract.sistemaAmortizacao },
    { label: 'Parcelas', value: String(contract.numeroParcelas), mono: true },
    { label: '1º vencimento', value: formatDateBR(contract.dataPrimeiroVencimento) },
  ];

  if (contract.indexador) {
    metaFields.push({ label: 'Indexador', value: contract.indexador });
  }
  if (contract.garantias) {
    metaFields.push({ label: 'Garantias', value: contract.garantias });
  }

  els.metaGrid.innerHTML = metaFields
    .map(
      (f) => `
    <dl class="meta-item">
      <dt>${escapeHtml(f.label)}</dt>
      <dd class="${f.mono ? 'mono' : ''}">${escapeHtml(f.value)}</dd>
    </dl>`
    )
    .join('');

  els.tableMeta.textContent = `${schedule.length} linhas · ${contract.sistemaAmortizacao}`;

  els.amortTableBody.innerHTML = schedule
    .map(
      (row) => `
    <tr>
      <td>${row.numero}</td>
      <td>${formatCurrency(row.saldoDevedor)}</td>
      <td>${formatDateBR(row.vencimento)}</td>
      <td>${formatCurrency(row.amortizacao)}</td>
      <td>${formatCurrency(row.juros)}</td>
      <td>${formatCurrency(row.totalPago)}</td>
    </tr>`
    )
    .join('');

  const totAmort = schedule.reduce((s, r) => s + r.amortizacao, 0);
  const totJuros = schedule.reduce((s, r) => s + r.juros, 0);
  const totPago = schedule.reduce((s, r) => s + r.totalPago, 0);

  els.amortTableFoot.innerHTML = `
    <tr>
      <td colspan="3">Totais</td>
      <td>${formatCurrency(totAmort)}</td>
      <td>${formatCurrency(totJuros)}</td>
      <td>${formatCurrency(totPago)}</td>
    </tr>`;
}

function exportExcel() {
  if (!globalReport) return;

  const { contract, schedule, fileName } = globalReport;
  const wsData = [
    ['NJK Dynamics — Finalyze · Relatório de Financiamento'],
    ['Arquivo', fileName || ''],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Campo', 'Valor'],
    ['Cliente', contract.cliente],
    ['Agente financeiro', contract.agenteFinanceiro],
    ['Tomador', contract.tomador],
    ['Valor captado', contract.valorCaptado],
    ['Data emissão', contract.dataEmissao],
    ['Taxa juros mensal', contract.taxaJurosMensal],
    ['Sistema amortização', contract.sistemaAmortizacao],
    ['Nº parcelas', contract.numeroParcelas],
    ['Indexador', contract.indexador || ''],
    [],
    ['#', 'Saldo devedor', 'Vencimento', 'Amortização', 'Juros', 'Total pago'],
  ];

  schedule.forEach((r) => {
    wsData.push([
      r.numero,
      r.saldoDevedor,
      r.vencimento,
      r.amortizacao,
      r.juros,
      r.totalPago,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cronograma');
  XLSX.writeFile(wb, `finalyze_${contract.numeroContrato || 'contrato'}.xlsx`.replace(/[^\w\-]+/g, '_'));
  showToast('success', 'Excel', 'Planilha exportada com sucesso.');
}
