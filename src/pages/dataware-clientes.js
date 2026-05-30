    // ── Config
    let API_URL = 'https://njk-api.onrender.com';
    let currentFilter = 'ativo';
    let allClientes = [];

    // Estado do modal de exclusao
    let pendingDeleteId   = null;
    let pendingDeleteNome = '';

    function onApiUrlChange() {
      API_URL = document.getElementById('api-url-input').value.replace(/\/$/, '');
      document.getElementById('display-api-url').textContent = API_URL.replace(/https?:\/\//, '');
      checkApiHealth();
      loadClientes();
    }

    // ── Relogio
    function updateClock() {
      const now = new Date();
      document.getElementById('topbar-clock').textContent =
        now.toLocaleDateString('pt-BR') + '  ' +
        now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ── Toast
    function showToast(type, title, msg) {
      const icons = { success:'\u2705', error:'\u274C', info:'\u2139\uFE0F' };
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.innerHTML =
        '<span class="toast-icon">' + icons[type] + '</span>' +
        '<div><div class="toast-title">' + title + '</div><div class="toast-msg">' + msg + '</div></div>';
      container.appendChild(toast);
      setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3500);
    }

    // ── Health Check
    async function checkApiHealth() {
      const pill  = document.getElementById('api-status-pill');
      const label = document.getElementById('api-status-text');
      try {
        const r = await fetch(API_URL + '/health', { signal: AbortSignal.timeout(4000) });
        if (r.ok) {
          pill.style.cssText = 'background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.25);color:var(--accent-emerald)';
          label.textContent  = 'API Online';
        } else throw new Error();
      } catch {
        pill.style.cssText = 'background:rgba(244,63,94,0.1);border-color:rgba(244,63,94,0.25);color:var(--accent-rose)';
        label.textContent  = 'API Offline';
      }
    }

    // ── Load Clientes
    async function loadClientes() {
      const btn = document.getElementById('btn-refresh');
      btn.style.opacity = '0.5';
      try {
        const [rA, rI, rS] = await Promise.all([
          fetch(API_URL + '/api/clientes?status=ativo&limite=500'),
          fetch(API_URL + '/api/clientes?status=inativo&limite=500'),
          fetch(API_URL + '/api/clientes?status=suspenso&limite=500'),
        ]);
        let ativos = [], inativos = [], suspensos = [];
        if (rA.ok) { const d = await rA.json(); ativos    = d.clientes || []; }
        if (rI.ok) { const d = await rI.json(); inativos  = d.clientes || []; }
        if (rS.ok) { const d = await rS.json(); suspensos = d.clientes || []; }

        const total = ativos.length + inativos.length + suspensos.length;
        document.getElementById('kpi-total').textContent     = total;
        document.getElementById('kpi-ativos').textContent    = ativos.length;
        document.getElementById('kpi-inativos').textContent  = inativos.length;
        document.getElementById('kpi-suspensos').textContent = suspensos.length;
        document.getElementById('badge-count').textContent   = total;

        if (currentFilter === 'ativo')    allClientes = ativos;
        if (currentFilter === 'inativo')  allClientes = inativos;
        if (currentFilter === 'suspenso') allClientes = suspensos;

        renderTable(allClientes);

        const ts = new Date().toLocaleTimeString('pt-BR');
        document.getElementById('display-last-sync').textContent = ts;
        document.getElementById('table-ts').textContent = 'Atualizado as ' + ts;
      } catch {
        renderError('Nao foi possivel conectar a API. Verifique se o servidor esta rodando.');
      } finally {
        btn.style.opacity = '1';
      }
    }

    // ── Render Table
    function renderTable(data) {
      const tbody = document.getElementById('clientes-tbody');
      if (!data || data.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5"><div class="empty-state">' +
          '<div class="empty-icon">\uD83D\uDCED</div>' +
          '<div class="empty-title">Nenhum cliente encontrado</div>' +
          '<div class="empty-desc">Cadastre um novo cliente pelo formulario ao lado.</div>' +
          '</div></td></tr>';
        document.getElementById('table-info').textContent = '0 registros';
        return;
      }

      tbody.innerHTML = data.map(c => {
        const statusOpts = ['ativo','inativo','suspenso'].map(s =>
          '<option value="' + s + '"' + (c.status === s ? ' selected' : '') + '>' +
          s.charAt(0).toUpperCase() + s.slice(1) + '</option>'
        ).join('');

        return '<tr data-nome="' + escAttr((c.nome || '').toLowerCase()) + '">' +
          '<td class="td-id">#' + c.id + '</td>' +
          '<td class="td-nome">' + escHtml(c.nome) + '</td>' +
          '<td><span class="badge badge-' + c.status + '">' + c.status + '</span></td>' +
          '<td class="td-date">' + formatDate(c.criado_em) + '</td>' +
          '<td><div class="table-actions">' +
            '<select class="status-select" title="Alterar status" onchange="updateStatus(' + c.id + ', this.value)">' + statusOpts + '</select>' +
            '<button class="btn-delete" title="Excluir cliente" onclick="openDeleteModal(' + c.id + ', \'' + escJs(c.nome) + '\')">' +
              '&#128465;' +
            '</button>' +
          '</div></td>' +
          '</tr>';
      }).join('');

      document.getElementById('table-info').textContent = data.length + ' registro' + (data.length !== 1 ? 's' : '');
    }

    function renderError(msg) {
      document.getElementById('clientes-tbody').innerHTML =
        '<tr><td colspan="5"><div class="empty-state">' +
        '<div class="empty-icon">\u26A0\uFE0F</div>' +
        '<div class="empty-title">Erro de conexao</div>' +
        '<div class="empty-desc">' + msg + '</div>' +
        '</div></td></tr>';
    }

    // ── Filtro / Busca
    function filterTable() {
      const q = document.getElementById('search-input').value.toLowerCase();
      document.querySelectorAll('#clientes-tbody tr[data-nome]').forEach(row => {
        row.style.display = row.dataset.nome.includes(q) ? '' : 'none';
      });
    }

    function setFilter(status) {
      currentFilter = status;
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + status).classList.add('active');
      loadClientes();
    }

    // ── Adicionar Cliente
    async function addCliente() {
      const nome   = document.getElementById('input-nome').value.trim();
      const status = document.getElementById('input-status').value;
      if (!nome) {
        showToast('error', 'Campo obrigatorio', 'Informe o nome do cliente.');
        document.getElementById('input-nome').focus();
        return;
      }
      const btn = document.getElementById('btn-add');
      const content = document.getElementById('btn-add-content');
      btn.disabled = true;
      content.innerHTML = '<span class="spinner"></span> Cadastrando...';
      try {
        const r = await fetch(API_URL + '/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, status }),
        });
        const data = await r.json();
        if (r.ok && data.sucesso) {
          showToast('success', 'Cliente cadastrado!', '"' + nome + '" adicionado como #' + data.cliente.id + '.');
          clearForm();
          loadClientes();
        } else {
          showToast('error', 'Erro ao cadastrar', data.detail || 'Verifique a API.');
        }
      } catch {
        showToast('error', 'Erro de conexao', 'Nao foi possivel conectar a API.');
      } finally {
        btn.disabled = false;
        content.innerHTML = '+ Cadastrar Cliente';
      }
    }

    // ── Atualizar Status
    async function updateStatus(id, novoStatus) {
      try {
        const r = await fetch(API_URL + '/api/clientes/' + id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: novoStatus }),
        });
        const data = await r.json();
        if (r.ok && data.sucesso) {
          showToast('success', 'Status atualizado', 'Cliente #' + id + ' -> "' + novoStatus + '".');
          loadClientes();
        } else {
          showToast('error', 'Erro ao atualizar', data.detail || 'Tente novamente.');
        }
      } catch {
        showToast('error', 'Erro de conexao', 'Nao foi possivel atualizar o status.');
      }
    }

    // ── Modal de Exclusao
    function openDeleteModal(id, nome) {
      pendingDeleteId   = id;
      pendingDeleteNome = nome;
      document.getElementById('modal-cliente-name').textContent = '"' + nome + '" (ID #' + id + ')';
      document.getElementById('delete-modal').classList.remove('hidden');
      document.getElementById('btn-confirm-content').innerHTML = '\uD83D\uDDD1\uFE0F Excluir';
      document.getElementById('btn-modal-confirm').disabled = false;
    }

    function closeDeleteModal() {
      pendingDeleteId   = null;
      pendingDeleteNome = '';
      document.getElementById('delete-modal').classList.add('hidden');
    }

    async function confirmDelete() {
      if (!pendingDeleteId) return;
      const id   = pendingDeleteId;
      const nome = pendingDeleteNome;
      const btn  = document.getElementById('btn-modal-confirm');
      btn.disabled = true;
      document.getElementById('btn-confirm-content').innerHTML = '<span class="spinner"></span> Excluindo...';
      try {
        const r = await fetch(API_URL + '/api/clientes/' + id, { method: 'DELETE' });
        const data = await r.json();
        if (r.ok && data.sucesso) {
          closeDeleteModal();
          showToast('success', 'Cliente excluido', '"' + nome + '" foi removido com sucesso.');
          loadClientes();
        } else {
          showToast('error', 'Erro ao excluir', data.detail || 'Tente novamente.');
          closeDeleteModal();
        }
      } catch {
        showToast('error', 'Erro de conexao', 'Nao foi possivel excluir o cliente.');
        closeDeleteModal();
      }
    }

    // Fechar modal ao clicar no overlay
    document.getElementById('delete-modal').addEventListener('click', function(e) {
      if (e.target === this) closeDeleteModal();
    });

    // ── Utilitarios
    function clearForm() {
      document.getElementById('input-nome').value = '';
      document.getElementById('input-status').value = 'ativo';
    }
    function escHtml(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(s) { return escHtml(s); }
    function escJs(s)   { return String(s||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\'); }
    function formatDate(iso) {
      if (!iso) return '--';
      try { return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
      catch { return iso; }
    }

    // ── Enter para submeter formulario
    document.getElementById('input-nome').addEventListener('keydown', e => {
      if (e.key === 'Enter') addCliente();
    });

    // ── Escape para fechar modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDeleteModal();
    });

    // ── Init
    checkApiHealth();
    loadClientes();
    setInterval(checkApiHealth, 30000);
    setInterval(loadClientes,   60000);
