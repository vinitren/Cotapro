# Endurecimento da página pública do orçamento – Etapa 1

Resumo das alterações da primeira camada de segurança (mudanças pequenas, sem senha, sem refatoração grande).

---

## 1. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/supabase-public-quote-policies-hardening.sql` | **Novo.** Migration que substitui as policies anon por versões restritas a orçamentos publicáveis. |
| `src/pages/PublicQuote.tsx` | Regra de status publicável; `select` explícito (quotes, customers, profiles); bloqueio de rascunho/recusado no frontend; meta `noindex, nofollow`; mapeamento `discount_*` → `desconto_*`; cliente sem `email`/`observacoes` na resposta. |

Nenhum outro arquivo foi modificado (checkout, dashboard, Stripe, PDF intactos).

---

## 2. Migration necessária

**Arquivo:** `supabase/migrations/supabase-public-quote-policies-hardening.sql`

**Ordem:** Executar **depois** de `supabase-public-quote-policies.sql` (que cria as policies anon iniciais). Esta migration faz `DROP` das três policies e recria com a condição de status.

**Como aplicar:** No Supabase (Dashboard → SQL Editor), executar o conteúdo do arquivo. Ou, se usar CLI: `supabase db push` / aplicar a migration no fluxo normal do projeto.

---

## 3. Policy final (RLS)

### Quotes

```sql
CREATE POLICY "anon_pode_ver_quotes_link_publico"
  ON public.quotes FOR SELECT
  TO anon
  USING (status IN ('enviado', 'aprovado', 'expirado'));
```

- Antes: `USING (true)`.
- Agora: anon só vê linhas com `status` em `enviado`, `aprovado` ou `expirado`. Rascunho e recusado não retornam.

### Customers

```sql
CREATE POLICY "anon_pode_ver_clientes_de_quotes"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.customer_id = customers.id
        AND q.status IN ('enviado', 'aprovado', 'expirado')
    )
  );
```

- Antes: existir qualquer quote com esse `customer_id`.
- Agora: só existe quote **publicável** (mesmo status) para esse cliente.

### Profiles

```sql
CREATE POLICY "anon_pode_ver_profiles_de_quotes"
  ON public.profiles FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.user_id = profiles.id
        AND q.status IN ('enviado', 'aprovado', 'expirado')
    )
  );
```

- Antes: existir qualquer quote com esse `user_id`.
- Agora: só existe quote **publicável** para esse perfil.

---

## 4. Regra de orçamento publicável

- **Definição:** Orçamento é publicável se e só se `status IN ('enviado', 'aprovado', 'expirado')`.
- **Não publicáveis:** `rascunho`, `recusado`.
- **Onde vale:** Na RLS (acima) e no frontend (`PublicQuote.tsx`): após carregar o quote, se o status não for publicável, a página trata como "não encontrado" (sem exibir dados).

Não foi adicionado campo `public_link_enabled`; a regra é só por status, para menor alteração e zero mudança de schema além das policies.

---

## 5. Query pública final (selects explícitos)

### Quotes

```text
id, user_id, customer_id, number, total_value, items, status, created_at, validity_days, observations, notes, discount_percentage, discount_value
```

- Não exposto na query: `updated_at`, `last_followup_sent_at` (se existir), e qualquer outra coluna que não esteja na lista.

### Customers

```text
id, tipo, nome, cpf_cnpj, telefone, endereco, data_cadastro
```

- Não exposto: `email`, `observacoes`, `user_id`, `created_at`, `updated_at`. O frontend preenche `email` e `observacoes` do cliente com string vazia na montagem do objeto para o template.

### Profiles

```text
id, company_name, cnpj, phone, email, logo_url, street, number, complement, district, city, state, cep, default_notes, pix_key, pix_name, pix_city, pix_type
```

- Não exposto: colunas de assinatura/Stripe, trial, etc., que não são usadas na página pública.

---

## 6. Noindex

- Na rota `/orcamento/:id`, um `useEffect` define `<meta name="robots" content="noindex, nofollow">` no `document.head` enquanto a página pública está montada.
- No desmontar, o meta é removido ou restaurado ao valor anterior.
- Objetivo: reduzir risco de indexação indevida das URLs de orçamento por buscadores.

---

## 7. Riscos residuais (não tratados nesta etapa)

| Risco | Gravidade | Nota |
|-------|-----------|------|
| Quem tem o link (UUID) continua acessando sem senha | Média | Previsto; senha fica para etapa futura. |
| CPF/CNPJ, telefone, Pix ainda visíveis na tela | Média | Anonimização parcial é melhoria futura. |
| Link não expira | Baixa | Expiração por data/validade ou TTL é melhoria futura. |
| UUID na URL = id interno; não há token revogável | Baixa | Token opaco/revogação em etapa futura. |
| Cache da página depende de CDN/host | Baixa | Headers de cache podem ser afinados depois. |

---

## 8. Comportamento esperado após a etapa

- **Link antigo** (já compartilhado) com UUID de orçamento **enviado/aprovado/expirado**: continua abrindo normalmente.
- **Orçamento em rascunho ou recusado:** mesmo com o UUID correto, a API (RLS) não retorna o quote; o frontend, se por algum motivo recebesse dados, também não exibe (trata como não encontrado).
- **Rascunho:** ao "enviar" (ex.: WhatsApp) o usuário altera o status para `enviado`; a partir daí o link passa a funcionar (comportamento já existente).
- Nenhuma alteração em checkout, dashboard, Stripe ou geração de PDF.
