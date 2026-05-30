// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Elementos da UI
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const processingSection = document.getElementById('processingSection');
const processingText = document.getElementById('processingText');
const resultsSection = document.getElementById('resultsSection');
const downloadBtn = document.getElementById('downloadBtn');

// Estado
let globalData = null;

// Drag and Drop
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/pdf') {
            processPDF(file);
        } else {
            alert('Por favor, envie apenas arquivos PDF.');
        }
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        processPDF(e.target.files[0]);
    }
});

async function processPDF(file) {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        alert('Por favor, salve sua Gemini API Key primeiro.');
        return;
    }

    try {
        // Mostrar loading
        dropZone.parentElement.classList.add('hidden');
        processingSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');

        // 1. Extrair Texto do PDF
        processingText.textContent = 'Lendo PDF (isso pode demorar um pouco)...';
        const pdfText = await extractTextFromPDF(file);

        // 2. Enviar para IA (Gemini)
        processingText.textContent = 'Analisando contrato com IA...';
        const extractedData = await callGeminiAPI(pdfText, apiKey);

        // 3. Calcular
        processingText.textContent = 'Calculando juros...';
        const calculatedData = calculateInterest(extractedData);
        globalData = calculatedData;

        // 4. Mostrar Resultados
        renderResults(calculatedData);
        
        processingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        alert('Erro ao processar: ' + error.message);
        processingSection.classList.add('hidden');
        dropZone.parentElement.classList.remove('hidden');
    }
}

async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                
                // Limitar páginas para não exceder o token limit rapidamente, caso seja muito grande
                const numPages = Math.min(pdf.numPages, 15); 
                
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                resolve(fullText);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function callGeminiAPI(text, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
Você é um especialista em análise de contratos financeiros. 
Analise o seguinte contrato e extraia as informações financeiras solicitadas.
Retorne APENAS um objeto JSON válido, sem formatação markdown (\`\`\`json) e sem texto adicional.
Se não encontrar alguma informação, faça o seu melhor para inferir pelo contexto ou retorne null.

Formato esperado:
{
  "principal": 150000.00, // Valor principal numérico
  "interestRateMonthly": 0.015, // Taxa de juros mensal em decimal (ex: 1.5% = 0.015)
  "dueDate": "YYYY-MM-DD", // Data de vencimento principal ou da primeira parcela
  "amortizationSystem": "PRICE" // "SAC" ou "PRICE" ou "Outro"
}

Contrato:
${text.substring(0, 30000)} // Limite de caracteres para segurança
    `;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        throw new Error('Falha ao comunicar com a API do Gemini. Verifique sua chave.');
    }

    const data = await response.json();
    let resultText = data.candidates[0].content.parts[0].text;
    
    // Limpar markdown caso a IA ainda retorne
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(resultText);
}

function calculateInterest(data) {
    const today = new Date();
    const dueDate = new Date(data.dueDate);
    
    let daysOverdue = 0;
    let total = data.principal;
    let isOverdue = false;

    if (dueDate < today) {
        isOverdue = true;
        const diffTime = Math.abs(today - dueDate);
        daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Cálculo de Juros Compostos
        // Assumindo a taxa mensal e convertendo para dias (aproximado 30 dias/mês)
        const monthsOverdue = daysOverdue / 30.0;
        total = data.principal * Math.pow(1 + data.interestRateMonthly, monthsOverdue);
    }

    return {
        ...data,
        daysOverdue,
        total,
        isOverdue
    };
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function renderResults(data) {
    document.getElementById('resPrincipal').textContent = formatCurrency(data.principal);
    
    const dateObj = new Date(data.dueDate);
    document.getElementById('resDueDate').textContent = dateObj.toLocaleDateString('pt-BR');
    
    document.getElementById('resInterestRate').textContent = (data.interestRateMonthly * 100).toFixed(2) + '% ao mês';
    document.getElementById('resSystem').textContent = data.amortizationSystem || 'Não identificado';
    
    document.getElementById('resDays').textContent = data.daysOverdue + ' dias';
    document.getElementById('resTotal').textContent = formatCurrency(data.total);
}

// Download Excel
downloadBtn.addEventListener('click', () => {
    if (!globalData) return;

    // Criar dados para a planilha
    const wsData = [
        ['Calculadora de Contratos - Relatório'],
        [''],
        ['Parâmetro', 'Valor'],
        ['Valor Principal', globalData.principal],
        ['Data de Vencimento', globalData.dueDate],
        ['Taxa de Juros Mensal (%)', globalData.interestRateMonthly * 100],
        ['Sistema de Amortização', globalData.amortizationSystem],
        [''],
        ['Atualização para Data de Hoje', new Date().toLocaleDateString('pt-BR')],
        ['Dias em Atraso', globalData.daysOverdue],
        ['Saldo Devedor Atualizado (Juros Compostos)', globalData.total]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");

    // Formatar células de moeda no Excel se possível, ou deixar como número
    
    XLSX.writeFile(wb, "calculo_contrato.xlsx");
});
