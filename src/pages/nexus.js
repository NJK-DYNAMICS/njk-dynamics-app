    /* ══════════════════════════════════════════════════════
       CONFIG — Edite as URLs quando os apps estiverem no ar
    ══════════════════════════════════════════════════════ */
    const CONFIG = {
      // Senha de acesso ao portal
      // ATENÇÃO: Para produção, use autenticação via Supabase Auth
      password: 'NJK@2025',

      // NJK Core API (Dataware backend)
      apiCore: 'https://njk-api.onrender.com',

      // AgroAta API — preencha quando o app estiver no ar
      apiAgroAta: '',

      // Finalyze API — preencha quando o app estiver no ar
      apiFinalyze: '',

      // URLs dos frontends
      urlDataware: '/dataware',
      urlAgroAta:  '',   // ex: '/agroata' quando o app existir
      urlFinalyze: '/finalyze',
    };

    const SESSION_KEY = 'njk_nexus_auth_v1';

    /* ══════════════════════════════════════════════════════
       AUTH
    ══════════════════════════════════════════════════════ */
    function checkAuth() {
      if (sessionStorage.getItem(SESSION_KEY) === 'ok') {
        hideLogin();
        initApp();
      }
    }

    function hideLogin() {
      document.getElementById('login-overlay').classList.add('hidden');
    }

    function doLogin() {
      const pass    = document.getElementById('login-pass').value;
      const btn     = document.getElementById('login-btn');
      const content = document.getElementById('login-btn-content');
      const error   = document.getElementById('login-error');

      if (!pass) return;

      btn.disabled = true;
      content.innerHTML = '<span class="spinner"></span> Verificando...';
      error.classList.remove('show');

      // Delay mínimo para UX
      setTimeout(() => {
        if (pass === CONFIG.password) {
          sessionStorage.setItem(SESSION_KEY, 'ok');
          hideLogin();
          initApp();
          showToast('success', 'Acesso concedido', 'Bem-vindo ao portal NJK Dynamics.');
        } else {
          error.classList.add('show');
          document.getElementById('login-pass').value = '';
          document.getElementById('login-pass').focus();
          btn.disabled = false;
          content.innerHTML = '🔓 Entrar no Portal';
        }
      }, 700);
    }

    function doLogout() {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.reload();
    }

    document.getElementById('login-pass').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });

    /* ══════════════════════════════════════════════════════
       RELÓGIO
    ══════════════════════════════════════════════════════ */
    function updateClock() {
      const now = new Date();
      const str = now.toLocaleDateString('pt-BR') + '  ' +
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      document.getElementById('topbar-clock').textContent = str;
    }
    updateClock();
    setInterval(updateClock, 1000);

    /* ══════════════════════════════════════════════════════
       TOAST
    ══════════════════════════════════════════════════════ */
    function showToast(type, title, msg) {
      const icons = { success: '✅', error: '❌', info: 'ℹ️' };
      const c = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      t.innerHTML =
        '<span class="toast-icon">' + icons[type] + '</span>' +
        '<div><div class="toast-title">' + title + '</div><div class="toast-msg">' + msg + '</div></div>';
      c.appendChild(t);
      setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 320); }, 3800);
    }

    /* ══════════════════════════════════════════════════════
       HELPERS para métricas
    ══════════════════════════════════════════════════════ */
    function setMetric(id, value) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = value;
      el.classList.remove('loading');
    }

    function setMetricError(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = '--';
      el.classList.remove('loading');
      el.style.opacity = '0.35';
    }

    /* ══════════════════════════════════════════════════════
       API HEALTH CHECK
    ══════════════════════════════════════════════════════ */
    async function checkApiHealth() {
      const pill  = document.getElementById('api-status-pill');
      const label = document.getElementById('api-status-text');
      const heroStatus = document.getElementById('hero-api-status');

      try {
        const r = await fetch(CONFIG.apiCore + '/health', { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          pill.style.cssText  = 'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:var(--accent-emerald)';
          pill.querySelector('.status-dot').style.background = 'var(--accent-emerald)';
          label.textContent   = 'API Online';
          if (heroStatus) heroStatus.textContent = 'Online';
        } else {
          throw new Error('not ok');
        }
      } catch {
        pill.style.cssText  = 'background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.25);color:var(--accent-rose)';
        pill.querySelector('.status-dot').style.background = 'var(--accent-rose)';
        label.textContent   = 'API Offline';
        if (heroStatus) heroStatus.textContent = 'Offline';
      }
    }

    /* ══════════════════════════════════════════════════════
       DATAWARE METRICS (NJK Core API)
    ══════════════════════════════════════════════════════ */
    async function loadDatawareMetrics() {
      try {
        const [rA, rI, rS] = await Promise.all([
          fetch(CONFIG.apiCore + '/api/clientes?status=ativo&limite=9999', { signal: AbortSignal.timeout(8000) }),
          fetch(CONFIG.apiCore + '/api/clientes?status=inativo&limite=9999', { signal: AbortSignal.timeout(8000) }),
          fetch(CONFIG.apiCore + '/api/clientes?status=suspenso&limite=9999', { signal: AbortSignal.timeout(8000) }),
        ]);

        let ativos = 0, inativos = 0, suspensos = 0;
        if (rA.ok) { const d = await rA.json(); ativos    = (d.clientes || []).length; }
        if (rI.ok) { const d = await rI.json(); inativos  = (d.clientes || []).length; }
        if (rS.ok) { const d = await rS.json(); suspensos = (d.clientes || []).length; }

        const total = ativos + inativos + suspensos;

        setMetric('dw-total',  total);
        setMetric('dw-ativos', ativos);
        setMetric('dw-outros', inativos + suspensos);
        setMetric('hero-clientes', total);

      } catch {
        ['dw-total','dw-ativos','dw-outros'].forEach(setMetricError);
      }
    }

    /* ══════════════════════════════════════════════════════
       AGROATA METRICS
       TODO: Substituir com o endpoint real quando disponível
         ex: CONFIG.apiAgroAta + '/api/atas/stats'
         Retorno esperado: { total: N, produtores: N, mes: N }
    ══════════════════════════════════════════════════════ */
    async function loadAgroAtaMetrics() {
      if (!CONFIG.apiAgroAta) {
        ['aa-atas','aa-produtores','aa-mes'].forEach(setMetricError);
        return;
      }
      try {
        const r = await fetch(CONFIG.apiAgroAta + '/api/atas/stats', { signal: AbortSignal.timeout(8000) });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setMetric('aa-atas',       d.total       ?? '--');
        setMetric('aa-produtores', d.produtores  ?? '--');
        setMetric('aa-mes',        d.mes         ?? '--');
      } catch {
        ['aa-atas','aa-produtores','aa-mes'].forEach(setMetricError);
      }
    }

    /* ══════════════════════════════════════════════════════
       FINALYZE METRICS
       TODO: Substituir com o endpoint real quando disponível
         ex: CONFIG.apiFinalyze + '/api/contratos/stats'
         Retorno esperado: { contratos: N, pdfs: N, relatorios: N }
    ══════════════════════════════════════════════════════ */
    async function loadFinalyzeMetrics() {
      if (!CONFIG.apiFinalyze) {
        ['fin-contratos','fin-pdfs','fin-relatorios'].forEach(setMetricError);
        return;
      }
      try {
        const r = await fetch(CONFIG.apiFinalyze + '/api/contratos/stats', { signal: AbortSignal.timeout(8000) });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setMetric('fin-contratos',  d.contratos  ?? '--');
        setMetric('fin-pdfs',       d.pdfs       ?? '--');
        setMetric('fin-relatorios', d.relatorios ?? '--');
      } catch {
        ['fin-contratos','fin-pdfs','fin-relatorios'].forEach(setMetricError);
      }
    }

    /* ══════════════════════════════════════════════════════
       CONFIGURA LINKS DOS BOTÕES
    ══════════════════════════════════════════════════════ */
    function setupButtons() {
      const btnDataware = document.getElementById('btn-dataware');
      const btnAgroAta  = document.getElementById('btn-agroata');
      const btnFinalyze = document.getElementById('btn-finalyze');

      if (CONFIG.urlDataware) {
        btnDataware.href = CONFIG.urlDataware;
      }

      if (CONFIG.urlAgroAta) {
        btnAgroAta.href = CONFIG.urlAgroAta;
      } else {
        btnAgroAta.style.opacity = '0.6';
        btnAgroAta.style.cursor  = 'not-allowed';
        btnAgroAta.onclick = (e) => { e.preventDefault(); showToast('info', 'AgroAta', 'App em configuração. URL ainda não definida.'); };
      }

      if (CONFIG.urlFinalyze) {
        btnFinalyze.href = CONFIG.urlFinalyze;
      } else {
        btnFinalyze.style.opacity = '0.6';
        btnFinalyze.style.cursor  = 'not-allowed';
        btnFinalyze.onclick = (e) => { e.preventDefault(); showToast('info', 'Finalyze', 'App em configuração. URL ainda não definida.'); };
      }
    }

    /* ══════════════════════════════════════════════════════
       FOOTER TIMESTAMP
    ══════════════════════════════════════════════════════ */
    function updateFooterTs() {
      const el = document.getElementById('footer-ts');
      if (el) {
        el.textContent = 'Atualizado às ' +
          new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
      }
    }

    /* ══════════════════════════════════════════════════════
       INIT APP
    ══════════════════════════════════════════════════════ */
    function initApp() {
      setupButtons();
      checkApiHealth();
      loadDatawareMetrics();
      loadAgroAtaMetrics();
      loadFinalyzeMetrics();
      updateFooterTs();

      // Auto-refresh
      setInterval(checkApiHealth,        30_000);  // 30s
      setInterval(() => {
        loadDatawareMetrics();
        loadAgroAtaMetrics();
        loadFinalyzeMetrics();
        updateFooterTs();
      }, 60_000); // 60s
    }

    /* ══════════════════════════════════════════════════════
       BOOT
    ══════════════════════════════════════════════════════ */
    checkAuth();
