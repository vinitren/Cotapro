# Configurar CotaPro na Vercel com Supabase

Para o **login e cadastro** funcionarem no domínio da Vercel, siga estes passos.

**Importante:** Se aparecer erro `ERR_NAME_NOT_RESOLVED` ou `placeholder.supabase.co`, as variáveis de ambiente **não estão** no build. Os nomes devem ser **exatamente** os abaixo (com o prefixo `VITE_`) e é obrigatório fazer **Redeploy** após adicionar/alterar.

---

## 1. Variáveis de ambiente na Vercel

1. Acesse o projeto no [Vercel Dashboard](https://vercel.com/dashboard).
2. Vá em **Settings** → **Environment Variables**.
3. Adicione (nomes **exatos**):

   | Nome                     | Valor                                      | Ambiente   |
   |--------------------------|--------------------------------------------|------------|
   | `VITE_SUPABASE_URL`      | `https://SEU_PROJETO.supabase.co`          | Production (e Preview) |
   | `VITE_SUPABASE_ANON_KEY`  | A chave **anon public** do Supabase        | Production (e Preview) |

4. Pegue a URL e a chave no [Supabase](https://supabase.com/dashboard): seu projeto → **Settings** → **API** (Project URL e **anon public** key).
5. **Salve** as variáveis e faça um **novo deploy**:
   - **Deployments** → ⋮ no último deploy → **Redeploy** (ou faça um novo push no repositório).
   - Sem redeploy, o build antigo continua sem as variáveis e o app tenta usar `placeholder.supabase.co` (que não existe).

---

## 2. URLs no Supabase (obrigatório para produção)

1. No [Supabase Dashboard](https://supabase.com/dashboard), abra seu projeto.
2. Vá em **Authentication** → **URL Configuration**.
3. Ajuste:

   - **Site URL**  
     Coloque a URL do app na Vercel, por exemplo:  
     `https://seu-app.vercel.app`  
     (substitua pelo seu domínio real.)

   - **Redirect URLs**  
     Em “Redirect URLs”, adicione:
   - `https://seu-app.vercel.app/**`
   - `https://seu-app.vercel.app`

   Use o mesmo domínio que você colocou em **Site URL**. O `/**` permite qualquer rota após o domínio (ex.: `/login`, `/signup`).

4. Salve as alterações.

Sem isso, o Supabase bloqueia redirects do domínio da Vercel e login/cadastro podem falhar.

---

## 3. Confirmação de e-mail (opcional)

- Se em **Authentication** → **Providers** → **Email** a opção **“Confirm email”** estiver **ligada**, o usuário precisa clicar no link do e-mail para ativar a conta.
- O link de confirmação já usa o domínio atual do app (incluindo o da Vercel) graças ao `emailRedirectTo` no cadastro.
- Se quiser testar sem confirmar e-mail, desative **“Confirm email”** temporariamente.

---

## 4. Resumo de verificação

- [ ] `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas na Vercel.
- [ ] Novo deploy feito após adicionar as variáveis.
- [ ] **Site URL** no Supabase = URL do app na Vercel.
- [ ] **Redirect URLs** no Supabase incluem `https://seu-dominio.vercel.app` e `https://seu-dominio.vercel.app/**`.

Se algo falhar, confira o console do navegador (F12) na tela de login/cadastro e as mensagens de erro do Supabase em **Authentication** → **Logs**.
