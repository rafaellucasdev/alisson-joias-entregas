# Módulo de Entregas com WhatsApp

PDV mínimo + **módulo de entregas completo** (retirada na loja e motoboy) com envio
do código de retirada por **WhatsApp**. Tudo roda dentro do Next.js (App Router +
Server Actions) sobre **Supabase**, sem backend desacoplado.

> Loja fictícia: **Alisson Joias** (joalheria)

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Supabase** (PostgreSQL) — acesso somente via `service_role` no servidor
- **Twilio WhatsApp** (sandbox gratuito) para o envio do código
- **TailwindCSS** para a UI (PDV desktop + tela do motoboy mobile-first)

---

## 1. Pré-requisitos

- Node.js 18+ (testado no 20)
- Uma conta gratuita no [Supabase](https://supabase.com)
- Uma conta gratuita no [Twilio](https://www.twilio.com) (para o WhatsApp)

---

## 2. Setup (passo a passo)

### 2.1. Clonar e instalar

```bash
git clone <url-do-repo>
cd <pasta>
npm install
```

### 2.2. Criar o projeto no Supabase

1. Crie um projeto gratuito em https://supabase.com
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`
3. Em **Project Settings → Database → Connection string → URI** (modo *Session*),
   copie a string e troque `[YOUR-PASSWORD]` pela senha do banco → `DATABASE_URL`

### 2.3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha o `.env.local` com os valores acima e os do Twilio (próxima seção).

### 2.4. Rodar as migrations + seed (automatizado)

```bash
npm run db:push
```

Esse comando cria **todas as tabelas** e insere os **dados fictícios**
(produtos, cliente e motoboys) usando a `DATABASE_URL`.

> **Alternativa manual:** se preferir não usar a `DATABASE_URL`, abra o
> **SQL Editor** do Supabase e cole, na ordem:
> 1. `supabase/migrations/0001_schema.sql`
> 2. `supabase/seed.sql`

### 2.5. Configurar o WhatsApp (Twilio Sandbox)

1. No [Console Twilio](https://console.twilio.com): **Messaging → Try it out → Send a WhatsApp message**
2. Copie `ACCOUNT SID` e `AUTH TOKEN` para o `.env.local`
3. O `From` do sandbox costuma ser `whatsapp:+14155238886` (já é o default no `.env.example`)
4. **Importante:** para receber mensagens, o número de destino precisa entrar no
   sandbox **uma vez**. Pelo WhatsApp, envie `join <duas-palavras>` (a frase que o
   Twilio mostra na tela) para `+1 415 523 8886`. Depois disso aquele número recebe as mensagens.

> **Pegadinha do 9º dígito (Brasil):** o WhatsApp às vezes registra números
> brasileiros **sem o 9** após o DDD. Por isso o envio (`src/lib/whatsapp.ts`)
> **confirma o status real** da entrega no Twilio e, se falhar, **reenvia
> automaticamente** na variante alternativa (com/sem o 9). Assim a mensagem
> chega independentemente de como o número foi registrado.

### 2.6. Rodar

```bash
npm run dev
```

Acesse http://localhost:3000

---

## 3. Credenciais / dados de teste (já criados pelo seed)

| O quê | Valor |
|---|---|
| **Código do Motoboy 1** (Carlos) | `MOTO-A1B2` |
| **Código do Motoboy 2** (Ana) | `MOTO-C3D4` |
| Cliente de exemplo (CPF) | `123.456.789-01` |

> O **código do cliente** (código de retirada) é gerado a cada venda e aparece na
> tela de confirmação + é enviado por WhatsApp. Anote-o para testar os fluxos.
>
> Para receber o WhatsApp de verdade, no PDV use **o seu próprio número** que
> entrou no sandbox do Twilio (passo 2.5).

---

## 4. Como testar cada fluxo

### 4.1. PDV → finalizar venda (`/`)
1. Adicione produtos ao carrinho (botão **+**).
2. Preencha **Nome / WhatsApp / CPF** do cliente.
3. Escolha o tipo de entrega: **🏬 Loja** ou **🛵 Motoboy**
   (se motoboy, selecione um na lista).
4. Clique **Finalizar venda** → aparece a **tela de confirmação** com o
   **código de retirada** e o status do envio do WhatsApp.

### 4.2. Retirada na Loja — fluxo normal (`/retirada`)
1. Faça uma venda do tipo **Loja** e copie o código.
2. Em **Retirada na Loja**, aba **"Tenho o código"**, digite o código → **Localizar**.
3. Confira os itens, informe o **responsável** e clique **Confirmar retirada**.
   → Registra data/hora + responsável e conclui a venda.

### 4.3. Retirada — "Não tenho o código" (exceção + autorização)
1. Aba **"Não tenho o código"**.
2. Informe **CPF do cliente** + **gerente que autoriza** + **motivo**.
3. Clique **Autorizar e localizar**.
   → A autorização é gravada na tabela `autorizacoes` **antes** de liberar.
   Depois, confirme normalmente com o responsável.

### 4.4. Motoboy (`/motoboy`, feito para celular)
1. Faça uma venda do tipo **Motoboy** atribuída ao Carlos (`MOTO-A1B2`) e copie o código do cliente.
2. Em **Motoboy**, entre com `MOTO-A1B2`.
   → Você vê **apenas** as entregas atribuídas a esse motoboy.
3. Em uma entrega, informe o **código do cliente** e clique **Liberar**
   (exige código do motoboy **e** do cliente válidos).
4. **Entrega parcial:** marque só alguns itens → **Registrar entrega**
   (os demais ficam "pendente" para nova tentativa; status vira `parcial`).
5. **Entrega total:** **Marcar todos os pendentes** → **Registrar entrega**
   (status vira `concluida`).

### 4.5. Fluxos de exceção para testar a segurança
- **Motoboy inválido:** entre com um código inexistente → bloqueado.
- **Entrega de outro motoboy:** logue como `MOTO-C3D4` e tente liberar o código
  de um cliente atribuído ao `MOTO-A1B2` → "Esta entrega não está atribuída a você".
- **Código de cliente errado** na liberação → bloqueado.
- **Força bruta:** após várias tentativas erradas em sequência (código/CPF/motoboy),
  o fluxo é temporariamente bloqueado (rate limit por log de tentativas).

---

## 5. Segurança (como cada requisito foi atendido)

- **Código aleatório e não sequencial:** gerado com `crypto.randomInt` (CSPRNG),
  7 caracteres alfanuméricos sem ambiguidade — ver `src/lib/codigo.ts`.
- **Sem IDs sequenciais:** todas as PKs são `uuid` (`gen_random_uuid`).
- **Validação no backend:** todas as regras (CPF, preços, propriedade da entrega,
  tipos) são revalidadas nas Server Actions — o frontend nunca é a fonte de verdade.
  Os **preços são recalculados a partir do banco**, não do carrinho do cliente.
- **Motoboy só vê as próprias entregas:** toda query filtra por `motoboy_id` e o
  código do motoboy é revalidado em **cada** ação (`src/app/actions/motoboy.ts`).
- **"Esqueci o código" exige autorização registrada:** grava `autorizado_por` +
  `motivo` na tabela `autorizacoes` antes de liberar.
- **Rate limiting / logging:** tabela `tentativas_log` registra cada tentativa
  (mascarada) e bloqueia após N falhas numa janela de tempo (`src/lib/audit.ts`).
- **RLS habilitado** em todas as tabelas, sem policies públicas — o acesso só
  acontece via `service_role` no servidor; a chave nunca chega ao navegador.

---

## 6. Deploy (Vercel)

1. Suba o repositório no GitHub (público).
2. Importe o projeto na [Vercel](https://vercel.com).
3. Em **Settings → Environment Variables**, adicione as mesmas variáveis do
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `NOME_LOJA`).
   > `DATABASE_URL` só é necessária para rodar `npm run db:push` localmente.
4. Deploy. O banco continua sendo o mesmo projeto Supabase.

---

## 7. Estrutura do projeto

```
src/
├─ app/
│  ├─ page.tsx                 # PDV (server) -> carrega produtos/motoboys
│  ├─ retirada/page.tsx        # Retirada na loja (normal + "esqueci o código")
│  ├─ motoboy/page.tsx         # Tela do motoboy (mobile-first)
│  └─ actions/
│     ├─ pdv.ts                # finalizarVenda
│     ├─ retirada.ts           # buscar/confirmar + autorização
│     └─ motoboy.ts            # login, liberar, registrar entrega
├─ components/PDV.tsx          # carrinho + cliente + confirmação
└─ lib/
   ├─ supabase.ts              # client service_role (server-only)
   ├─ queries.ts               # leitura das entregas (embeds)
   ├─ codigo.ts                # geração CSPRNG do código
   ├─ whatsapp.ts              # envio via Twilio
   ├─ validators.ts            # CPF, WhatsApp, etc.
   └─ audit.ts                 # log de tentativas + rate limit
supabase/
├─ migrations/0001_schema.sql  # todas as tabelas + RLS
└─ seed.sql                    # produtos, cliente e motoboys fictícios
scripts/setup-db.mjs           # npm run db:push
```

## 8. Modelo de dados

`produtos`, `clientes`, `motoboys`, `vendas`, `itens_venda`, `entregas`,
`itens_entrega`, `autorizacoes`, `tentativas_log` (auditoria/rate limit),
`entrega_eventos` (auditoria de cada entrega parcial/total).
