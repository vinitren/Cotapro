# Auditoria técnica de segurança – Página pública do orçamento (CotaPro)

**Objetivo:** Avaliar se a visualização pública do orçamento está segura para produção e identificar riscos antes de decidir sobre proteção por senha.  
**Escopo:** Apenas análise e relatório; nenhuma alteração de código.

---

## 1. Como o orçamento público é localizado

| Aspecto | Detalhe |
|--------|---------|
| **Rota** | `/orcamento/:id` (definida em `App.tsx`) |
| **Identificador** | Parâmetro **`id`** = **UUID** da linha em `public.quotes` (PK) |
| **Origem do ID** | `quotes.id` com `DEFAULT gen_random_uuid()` (Supabase) |
| **Slug / token / outro** | Não existe. A URL usa **apenas o UUID** do orçamento. |

**Arquivos:**  
- `src/App.tsx` (rota)  
- `src/pages/PublicQuote.tsx` (`useParams().id` → query em `quotes` por `id`)  
- Link gerado em: `src/pages/Quotes.tsx`, `src/pages/QuoteDetail.tsx` → `${origin}/orcamento/${quote.id}`  

Ou seja: o orçamento é localizado **somente pelo UUID** na URL; não há slug, token separado nem outro identificador.

---

## 2. Previsibilidade e enumeração da URL

| Fator | Avaliação |
|-------|-----------|
| **Formato** | UUID v4 (128 bits, 122 aleatórios) → não é sequencial. |
| **Previsibilidade** | Baixa: não dá para “adivinhar” o próximo ID. |
| **Enumeração** | Praticamente inviável por força bruta (espaço de busca enorme). |
| **Risco** | Quem **não** tem o link não descobre o orçamento por chute. Quem **tem** o link (ou o UUID) acessa sem mais nenhuma barreira. |

**Conclusão:** A URL em si não é previsível nem fácil de enumerar. O risco está em **vazamento do link** (envio por WhatsApp, e-mail, cópia, referrer, logs, etc.), não em enumeração.

---

## 3. Dados sensíveis expostos na página pública

### 3.1 O que a API retorna (Supabase anon)

O frontend faz três consultas com **`select('*')`** (todas as colunas):

1. **`quotes`** – linha completa do orçamento (incl. `user_id`, `customer_id`, `status`, `items`, etc.).
2. **`customers`** – linha completa do cliente: `id`, `user_id`, `tipo`, `nome`, `cpf_cnpj`, `telefone`, `email`, `observacoes`, `data_cadastro`, `endereco` (JSON completo), `created_at`, `updated_at`.
3. **`profiles`** – linha completa do perfil da empresa: `id`, `email`, `company_name`, `street`, `number`, `city`, `state`, `cep`, `phone`, `cnpj`, `logo_url`, `default_notes`, `pix_key`, `pix_name`, `pix_city`, `pix_type`, etc.

Ou seja: **os endpoints (via Supabase) retornam mais dados do que o necessário** para a tela; a “filtragem” é só no que é renderizado.

### 3.2 O que é exibido na UI (PublicQuoteDocument)

| Dado | Exibido? | Observação |
|------|----------|------------|
| **Cliente – nome** | Sim | |
| **Cliente – CPF/CNPJ** | Sim | Dado sensível (LGPD). |
| **Cliente – telefone** | Sim | Dado sensível. |
| **Cliente – e-mail** | Não | Mas está na resposta da API. |
| **Cliente – endereço** | Parcial | Só cidade/estado na UI; API devolve rua, número, CEP, etc. |
| **Cliente – observações** | Não | Mas está na resposta da API (possível uso interno). |
| **Cliente – id / user_id** | Não na UI | Mas vêm na resposta. |
| **Empresa – nome, CNPJ, tel, e-mail, endereço** | Sim | Dados da empresa no orçamento. |
| **Empresa – chave PIX + QR** | Sim | Dado de pagamento. |
| **Orçamento – observações** | Sim | Pode conter texto interno se o usuário colocou. |
| **Orçamento – itens, totais, datas, número** | Sim | Necessário para o orçamento. |
| **Orçamento – status** | Usado no objeto | Não bloqueia exibição (rascunho também aparece; ver item 6). |

Resumo de **dados sensíveis efetivamente exibidos**:

- CPF/CNPJ do cliente  
- Telefone do cliente  
- Endereço parcial do cliente (cidade/estado)  
- Dados da empresa (CNPJ, telefone, e-mail, endereço)  
- Chave PIX e QR Code (dados de pagamento)  
- Observações do orçamento (podem ser internas)  

E **retornados pela API mas não exibidos** (acessíveis via rede/DevTools):

- E-mail do cliente  
- Observações do cliente  
- Endereço completo do cliente (rua, número, CEP, etc.)  
- IDs internos (quote, customer, user)

---

## 4. Risco de acessar orçamento de outro cliente alterando parâmetros

| Verificação | Situação |
|-------------|----------|
| **RLS em `quotes`** | Política `anon_pode_ver_quotes_link_publico`: `USING (true)` → anon pode ler **qualquer** registro de `quotes`. |
| **Controle por ID** | O único filtro é o `id` na URL. Quem souber (ou descobrir) outro UUID válido de orçamento **consegue ver esse orçamento**. |
| **Conclusão** | **Há risco:** alterar o `id` na URL para outro UUID válido permite ver o orçamento (e cliente/empresa) daquele outro orçamento. A proteção é só “quem não sabe o UUID não acha”; não há checagem de “este orçamento foi autorizado a ser público” nem de vínculo com o visitante. |

Arquivo crítico: `supabase/migrations/supabase-public-quote-policies.sql` (policy com `USING (true)`).

---

## 5. Endpoints públicos retornam mais dados do que deveriam

- **Sim.** As três tabelas são acessadas com `select('*')`:  
  - `quotes`: todas as colunas.  
  - `customers`: todas (incl. `email`, `observacoes`, `endereco` completo, `user_id`).  
  - `profiles`: todas (incl. dados de assinatura/Pix e outros que não são necessários para a view pública).  

O princípio de mínimo privilégio não é aplicado: anon recebe tudo que o RLS permite (e o RLS permite a linha inteira).  
Arquivos: `src/pages/PublicQuote.tsx` (linhas 90–94, 151–155, 192–195).

---

## 6. Verificação de status/publicação antes de exibir

| Aspecto | Situação |
|---------|----------|
| **RLS** | Nenhuma política filtra por `status` ou por “publicável”. |
| **Frontend** | Não há `if (q.status === 'rascunho') setNotFound(true)`. O orçamento é exibido independentemente de ser rascunho, enviado, aprovado, recusado ou expirado. |
| **Conclusão** | **Não existe** verificação de status/publicação. Orçamentos em **rascunho** (e qualquer outro status) ficam acessíveis com o link. |

Trecho relevante: `PublicQuote.tsx` monta e exibe o orçamento sem checar `q.status`.

---

## 7. Indexação, cache e compartilhamento do link

| Risco | Situação |
|-------|----------|
| **Indexação** | Não há `noindex` (nem meta robots nem header). O `index.html` não define regra para rotas dinâmicas. A página pública não injeta `<meta name="robots" content="noindex, nofollow">`. |
| **Cache** | Não foi encontrada configuração específica de cache (e.g. no Vite) para `/orcamento/*`. Comportamento depende de CDN/host (ex.: Vercel/Netlify). |
| **Compartilhamento** | O link é copiável e enviável (ex.: WhatsApp em QuoteDetail). Qualquer pessoa com o link acessa sem senha ou expiração. |

Arquivos: `index.html`, `src/pages/PublicQuote.tsx` (sem meta robots).

---

## 8. Proteção atual contra acesso indevido

- **Controle de acesso:** Nenhum. Não há senha, token de visualização, CAPTCHA nem verificação de identidade.  
- **RLS:** Apenas “anon pode ler qualquer quote” (e, por consequência, clientes e perfis ligados a quotes). Não há restrição por “link público ativo”, status ou expiração.  
- **Identificador:** Só o UUID na URL; não há token separado nem revogação.  
- **Resumo:** A única “proteção” é o UUID não ser facilmente adivinhável. Não há proteção ativa contra uso indevido do link.

---

## 9. Sentido de implementar melhorias futuras

| Medida | Faz sentido? | Comentário breve |
|--------|--------------|------------------|
| **Anonimização parcial** | Sim | Mascarar CPF/CNPJ (ex.: ***.***.***-12), telefone (ex.: (11) *****-1234) ou endereço completo na view pública reduz exposição e alinha melhor à LGPD. |
| **Senha opcional** | Sim | Permite “link só para quem tem a senha” sem obrigar todos os orçamentos a ter senha. Boa opção se quiser mais controle por orçamento. |
| **Expiração do link** | Sim | Reduz janela de abuso se o link vazar; pode ser por data de validade do orçamento ou por “válido até X dias após envio”. |
| **Token mais forte / separado** | Sim | Um token opaco (ex.: 32+ bytes aleatórios) em vez do UUID na URL permite: (1) não expor o ID interno; (2) poder revogar/regenerar o link sem mudar o orçamento. |

Nada disso foi implementado ainda; são recomendações para evolução.

---

## 10. Arquivos envolvidos

| Arquivo | Papel |
|---------|--------|
| `src/App.tsx` | Rota `/orcamento/:id` → `PublicQuote`. |
| `src/pages/PublicQuote.tsx` | Página pública: busca quote/customer/profile por `id`, monta dados, exibe ou “não encontrado”. |
| `src/components/quotes/PublicQuoteDocument.tsx` | Layout e dados exibidos (cliente, empresa, itens, totais, Pix, observações). |
| `src/pages/QuoteDetail.tsx` | Geração do link público e envio (ex.: WhatsApp). |
| `src/pages/Quotes.tsx` | Geração do link público (lista de orçamentos). |
| `supabase/migrations/supabase-public-quote-policies.sql` | RLS: anon pode SELECT em quotes (true), customers (vinculados a quotes), profiles (vinculados a quotes). |
| `supabase/migrations/supabase-public-quote-relations.sql` | FKs para relações quote ↔ customer/profile. |
| `supabase/migrations/supabase-quotes-setup.sql` | Schema de `quotes` (id UUID, status, etc.). |
| `supabase/migrations/supabase-customers-setup.sql` | Schema de `customers`. |
| `supabase/migrations/supabase-setup.sql` | Schema base de `profiles`. |
| `index.html` | Meta tags gerais; sem noindex para rotas públicas. |

---

## 11. Riscos encontrados e gravidade

| # | Risco | Gravidade | Tipo |
|---|--------|-----------|------|
| 1 | Anon pode ler **qualquer** orçamento conhecendo o UUID (RLS `USING (true)`). | **Alta** | Problema atual |
| 2 | Orçamentos em **rascunho** acessíveis pelo mesmo link (sem checagem de status). | **Média** | Problema atual |
| 3 | API devolve **todas** as colunas (quote, customer, profile); dados sensíveis além do exibido (e-mail do cliente, observações, endereço completo). | **Média** | Problema atual |
| 4 | **CPF/CNPJ, telefone, endereço** do cliente e **chave PIX** expostos na tela sem anonimização. | **Média** (LGPD/uso indevido) | Problema atual |
| 5 | Ausência de **noindex** na página pública → risco de indexação por buscadores. | **Média** | Problema atual |
| 6 | Link não expira e não tem senha → vazamento do link = acesso permanente. | **Média** | Problema atual |
| 7 | UUID do orçamento na URL = ID interno; não há token revogável. | **Baixa** | Melhoria futura |

---

## 12. Recomendações por prioridade

### Prioridade alta (recomendado antes ou logo após produção)

1. **Restringir RLS de quotes para anon**  
   Não usar `USING (true)`. Ex.: permitir apenas orçamentos com `status IN ('enviado','aprovado')` e, se existir, algo como `public_link_enabled = true`. Assim, rascunhos e recusados não ficam acessíveis pelo link.

2. **Não exibir rascunhos na página pública**  
   No mínimo, no frontend: se `q.status === 'rascunho'`, tratar como “não encontrado” (ou “não disponível”). Idealmente garantir também no RLS.

3. **Reduzir dados retornados ao anon**  
   Evitar `select('*')`. Usar listas explícitas de colunas para a view pública (ex.: em quotes não retornar campos internos desnecessários; em customers não retornar `observacoes`, `email` se não forem exibidos; em profiles só o necessário para exibir empresa e Pix).

### Prioridade média

4. **Meta noindex na página pública**  
   Em `PublicQuote.tsx`, injetar `<meta name="robots" content="noindex, nofollow">` (ou equivalente) para evitar indexação da URL do orçamento.

5. **Avaliar expiração do link**  
   Ex.: considerar “só exibir se dentro da validade do orçamento” ou “válido por X dias após envio”, e refletir isso no RLS ou na lógica da página.

6. **Documentar e, se possível, limitar cache**  
   Para a rota `/orcamento/*`, configurar headers (via host/CDN) para evitar cache longo (ex.: `Cache-Control: private, no-store` ou `max-age=0`), se fizer sentido para o produto.

### Melhorias futuras (quando for implementar “proteção por senha” ou equivalente)

7. **Token de visualização separado**  
   Coluna opaca (ex.: `public_token`) em `quotes`, URL `/orcamento/:token`. Permite revogar/regenerar link sem alterar o id do orçamento.

8. **Senha opcional por orçamento**  
   Campo (hash) em `quotes` + tela de desbloqueio na página pública; link continua “quem tem o link”, com opção de exigir senha.

9. **Anonimização parcial**  
   Mascarar CPF/CNPJ, telefone e/ou endereço completo na view pública, com opção de “mostrar completo” apenas com senha ou em PDF enviado por e-mail.

---

## 13. Resumo: problema real agora x melhoria futura

**Problemas reais agora (vale corrigir antes ou logo após produção):**

- Anon pode ver qualquer orçamento pelo UUID (RLS permissivo).  
- Rascunhos acessíveis pelo link (sem filtro de status).  
- API retornando dados sensíveis além do necessário (select `*`).  
- Dados sensíveis (CPF/CNPJ, telefone, Pix) expostos na tela sem mitigação.  
- Ausência de noindex na página pública.

**Melhorias futuras (quando for o momento de evoluir a feature):**

- Token de visualização separado (revogável).  
- Senha opcional por orçamento.  
- Expiração explícita do link.  
- Anonimização parcial (LGPD/UX).  
- Headers de cache adequados para a rota pública.

---

*Documento gerado a partir de análise estática do código e das políticas RLS; não inclui testes de penetração nem análise de infraestrutura (CDN, firewall, etc.).*
