# IG Feed Widget

Widget open source de feed do Instagram usando **apenas a API oficial da Meta**. Sem limitações artificiais, sem marca d'água, sem anúncios, sem "powered by".

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 O que este projeto faz

- ✅ Lê posts de uma conta **Instagram Business/Creator** via **API oficial**
- ✅ **Paginação completa** — busca todos os posts disponíveis na API
- ✅ **Sincronização incremental** — só adiciona posts novos
- ✅ **Respeita rate limit** da API (200 chamadas/hora)
- ✅ **Cache em memória** (ou Upstash Redis opcional)
- ✅ **Widget vanilla JS** — zero dependências
- ✅ **3 layouts**: grid, carousel, masonry
- ✅ **Lightbox** com suporte a vídeo, imagens e carrosséis
- ✅ **Totalmente configurável** via `data-*` attributes
- ✅ **CSS variables** para customização total
- ✅ **Painel administrativo** para gerenciar o feed

## ⚠️ Limitações reais da API do Instagram

Este projeto **respeita** as limitações da API oficial. Não fazemos scraping, não usamos APIs não-oficiais.

| Limitação | Descrição | Como lidamos |
|---|---|---|
| **Conta Business/Creator** | A API só funciona com contas profissionais | Documentado no README |
| **Página do Facebook vinculada** | Necessário conectar uma página | Documentado no README |
| **Token de 60 dias** | O access token expira | Renovação manual ou via cron |
| **Rate limit: 200/hora** | Máximo de chamadas por hora | Sincronização espaçada (30 min) |
| **25 posts/chamada** | Cada página retorna até 25 | Paginação automática |
| **Mídias antigas** | Posts anteriores à conversão podem não aparecer | Documentado |
| **Comentários: 50/chamada** | — | Não priorizado no MVP |

## 📁 Estrutura do projeto

```
ig-feed/
├── api/              ← Endpoints serverless (Vercel)
├── src/              ← Lógica compartilhada
├── widget/           ← Widget JS/CSS
├── admin/            ← Painel administrativo
├── public/           ← Demo
├── .env.example      ← Template de variáveis
├── vercel.json       ← Configuração da Vercel
└── package.json
```

## 🚀 Como usar

### 1. Pré-requisitos

- Conta **Instagram Business** ou **Creator**
- Página do **Facebook** vinculada
- Conta na **[Vercel](https://vercel.com)** (gratuita)
- App no **[Meta for Developers](https://developers.facebook.com)** (gratuito)

### 2. Criando o App no Meta

1. Acesse https://developers.facebook.com/apps/
2. Crie um app do tipo **Business**
3. Adicione o produto **Instagram Graph API**
4. Em **Configurações → Básico**, anote o **App ID** e **App Secret**
5. Vá em **Ferramentas → Graph API Explorer**:
   - Selecione seu app
   - Gere um **User Access Token** com as permissões:
     - `instagram_basic`
     - `pages_show_list`
     - `pages_read_engagement`
   - Clique em **"Generate Access Token"**

### 3. Obtendo o ID da conta Instagram

No **Graph API Explorer**, execute:

```
GET /me/accounts
```

Pegue o `id` da página do Facebook. Depois:

```
GET /{page-id}?fields=instagram_business_account
```

O `id` retornado é o **INSTAGRAM_USER_ID**.

### 4. Convertendo para token de longa duração

No Graph API Explorer, execute:

```
GET /oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={short-token}
```

Isso gera um token de **60 dias**.

### 5. Deploy na Vercel

1. Faça fork deste repositório
2. Acesse [vercel.com/new](https://vercel.com/new)
3. Importe seu fork
4. Configure as **variáveis de ambiente**:

```
INSTAGRAM_ACCESS_TOKEN=seu_token_aqui
INSTAGRAM_USER_ID=seu_user_id
ADMIN_API_KEY=gere_com_openssl_rand_hex_32
CACHE_DURATION=1800
NODE_ENV=production
```

5. Clique em **Deploy**
6. Aguarde ~1 minuto

### 6. Primeira sincronização

Acesse:

```
https://SEU-PROJETO.vercel.app/admin
```

Cole sua `ADMIN_API_KEY` e clique em **"Forçar Sincronização"**.

### 7. Incorporando no seu site

```html
<div id="instagram-feed"
     data-limit="12"
     data-columns="4"
     data-mobile-columns="2">
</div>
<script src="https://SEU-PROJETO.vercel.app/widget.js"></script>
```

## 🎨 Personalização

### Atributos disponíveis

| Atributo | Padrão | Descrição |
|---|---|---|
| `data-limit` | `12` | Quantos posts exibir |
| `data-layout` | `grid` | `grid`, `carousel`, `masonry` |
| `data-columns` | `4` | Colunas no desktop |
| `data-columns-tablet` | `3` | Colunas no tablet |
| `data-mobile-columns` | `2` | Colunas no mobile |
| `data-gap` | `8` | Espaço entre posts (px) |
| `data-radius` | `12` | Border radius (px) |
| `data-aspect-ratio` | `1/1` | Proporção (`1/1`, `4/5`, `16/9`) |
| `data-show-caption` | `false` | Mostrar legenda |
| `data-show-date` | `false` | Mostrar data |
| `data-show-button` | `true` | Botão "Ver no Instagram" |
| `data-autoplay` | `false` | Autoplay no carousel |
| `data-theme` | `dark` | `dark` ou `light` |

### CSS Variables

```css
#instagram-feed {
    --ig-gap: 12px;
    --ig-radius: 18px;
    --ig-accent: #EEBC5A;
    --ig-bg: #0f172a;
}
```

## 📄 Licença

MIT — use livremente.
