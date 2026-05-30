# NJK Nexus — Portal de Aplicativos

Este é o repositório do **NJK NEXUS**, o painel de controle e porta de entrada centralizada do ecossistema de micro-aplicativos da **NJK Dynamics**.

---

## 📂 Estrutura do Workspace

*   `index.html`: O portal central desenvolvido com HTML5, CSS3 Vanilla de alta fidelidade visual (Cyber-Tech Dark Theme) e JavaScript assíncrono integrado às APIs do Dataware.
*   `../master_context.md`: O documento mestre que dita as integrações, design system e arquitetura unificada de dados de todo o ecossistema.
*   `../.cursorrules`: Regras e instruções específicas estruturadas para o desenvolvimento assistido por IA dentro do Cursor.

---

## ⚡ Funcionalidades Atuais do NEXUS

1.  **Tela de Autenticação Integrada:** Bloqueio inicial via login com senha (`NJK@2025`).
2.  **Monitoramento Dinâmico:** Checagem da latência e integridade do barramento de dados (`API Online` / `API Offline`).
3.  **Dashboard de 12 Módulos:**
    *   **Dataware (Ativo):** Integrado em tempo real com estatísticas de clientes totais, ativos e inativos puxados do Render/Supabase.
    *   **AgroAta (Ativo):** Interface desenhada e preparada para receber a URL de destino e métricas.
    *   **Finalyze (Ativo):** Interface desenhada e preparada para auditoria e OCR.
    *   **Módulos de 4 a 12 (Placeholders):** Cards suspensos indicando o roteiro evolutivo.

---

## 🔌 Integração no Cursor

Este workspace está totalmente preparado para ser migrado para o **Cursor**:
1.  **Contexto Imediato:** O arquivo `.cursorrules` no diretório pai instruirá automaticamente a inteligência artificial do Cursor sobre as regras de UI/UX, paleta de cores, tipografia JetBrains Mono/Inter e a diretriz SSOT do banco de dados centralizado.
2.  **Desenvolvimento Assistido:** Ao fazer perguntas ou solicitar novas features no chat do Cursor, a IA terá conhecimento total da stack (Vanilla CSS e Vanilla JS, preservando a leveza absoluta e eliminando placeholders).

---

## 🚀 Como Executar

Simplesmente abra o arquivo `index.html` em qualquer navegador web ou utilize um servidor local de desenvolvimento (ex: Live Server do VS Code ou do Cursor).

*   **Senha de Testes:** `NJK@2025`
