# Suno Carousel Generator

Gerador de carrosséis para Instagram da Suno Investimentos com IA. Cola um tema (opcionalmente um link de notícia ou imagem de referência) e o backend gera um carrossel completo no tom de voz da casa, com imagens de referência buscadas automaticamente. Edita texto, cores, imagens e exporta como PNGs prontos pra postar.

![Suno Carousel Generator](https://img.shields.io/badge/status-em%20desenvolvimento-orange)

## Features

- **Geração com Claude Sonnet 4.6** — texto no padrão de storytelling da Suno (frases curtas em parágrafos isolados, negrito estratégico, hook por paradoxo, tese pro investidor)
- **Suporte a multimodal** — pode mandar uma imagem de referência (gráfico, screenshot de notícia) que o Claude analisa
- **Status em tempo real** via SSE — botão mostra "Lendo notícia... → Escrevendo copy... → Buscando imagens..."
- **Editor visual estilo Canva**:
  - Edição inline do texto (clica e digita)
  - Drag-and-drop pra mover imagem dentro do frame
  - Scroll wheel pra zoom
  - Resize do frame da imagem (arrasta borda superior)
  - Negrito (botão B com toggle de seleção)
  - Slider de tamanho de fonte (toolbar acima do canvas + painel direito)
- **Busca de imagem em camadas**: Google Images (CSE) → Wikipedia → Unsplash
- **Legenda pronta pra Instagram** gerada junto (sem hashtags, com pergunta de interação)
- **Exporta PNGs 1080×1350** em zip via html2canvas + jszip

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.9+ + FastAPI + Anthropic SDK + trafilatura + json-repair + httpx |
| Frontend | Next.js 14 + React 18 + TypeScript + Tailwind + Zustand |
| Edição | contentEditable inline + pointer events + html2canvas + jszip |
| IA texto | Claude Sonnet 4.6 (tool use estruturado) |
| IA imagem | Google Custom Search + Wikipedia API + Unsplash |

## Setup

### Pré-requisitos

- Python 3.9+
- Node.js 20+ (Next.js 14 não suporta Node 18 antigo)
- Chaves de API:
  - [Anthropic](https://console.anthropic.com/settings/keys) (texto)
  - [Google AI Studio](https://aistudio.google.com/apikey) + [Programmable Search Engine](https://programmablesearchengine.google.com/) (imagens)
  - [Unsplash](https://unsplash.com/developers) (fallback de imagens)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# editar .env com suas chaves:
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=AIza...
# GOOGLE_CSE_ID=...
# UNSPLASH_ACCESS_KEY=...
uvicorn main:app --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
PORT=3001 npm run dev
```

Abre [http://localhost:3001](http://localhost:3001).

## Como usar

1. **Form inicial** (`/`):
   - Tema (obrigatório)
   - Link da notícia (opcional — sem link, gera "modo só-tema" sem inventar números)
   - Insumos extras em texto (opcional)
   - Imagem de referência (opcional — Claude analisa)
   - Nº de slides (5-10, padrão 7)

2. **Editor** (`/editor/[id]`):
   - Centro: canvas 1080×1350 editável
   - Esquerda: lista de slides (drag pra reordenar, + pra adicionar, × pra remover)
   - Direita: painel de estilo + legenda do post
   - Toolbar acima do canvas: tamanho da fonte
   - Edita texto direto no canvas, ajusta imagem com drag/scroll/resize

3. **Export**: clica "Exportar PNGs" → zip com `slide-01.png` até `slide-N.png` em 1080×1350

## Brand voice

O tom de voz Suno está documentado em `backend/brand/suno-voice.md`. Combina dois padrões de storytelling viral:

- **Ricardo Melo (@ri.cred)** — narrativo, frases curtas, anáfora, twists
- **FinDocs (@findocs)** — análise crítica, coloquialismos, manchete em negrito

O penúltimo slide é sempre uma **tese/aprendizado pro investidor** (regra inegociável).

## Limitações conhecidas

- Geração leva 25-60s (Claude Sonnet 4.6 é o gargalo, mas é o que respeita melhor o tom)
- Wikipedia ocasionalmente retorna imagem irrelevante; nesse caso suba uma manualmente
- Unsplash tem rate limit free de 50 req/hora
- Google CSE tem free tier de 100 buscas/dia

## Estrutura

```
suno-carousel-generator/
├── backend/
│   ├── main.py              # FastAPI app, endpoint /generate-stream (SSE)
│   ├── prompt_builder.py    # Constrói o prompt do Claude
│   ├── news_fetcher.py      # Extrai texto de URLs via trafilatura
│   ├── image_search.py      # Google CSE → Wikipedia → Unsplash
│   ├── schemas.py           # Pydantic models
│   ├── brand/suno-voice.md  # Tom de voz da Suno (referência canônica)
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx              # Form
    │   └── editor/[id]/page.tsx  # Editor visual
    ├── components/
    │   ├── SlideCanvas.tsx       # Renderiza o slide 1080×1350
    │   ├── BriefForm.tsx         # Form inicial com SSE
    │   ├── StylePanel.tsx        # Painel direito de estilo
    │   ├── LegendaPanel.tsx      # Legenda pra Instagram
    │   ├── CanvasToolbar.tsx     # Toolbar inline (fonte)
    │   ├── ExportButton.tsx      # html2canvas + jszip
    │   └── ...
    ├── lib/
    │   ├── store.ts              # Zustand store
    │   ├── types.ts              # TypeScript types
    │   └── brand-suno.ts         # Tokens visuais
    └── public/
        └── suno-logo.svg
```

## Deploy (produção)

Stack recomendada: **Vercel** (frontend) + **Render** (backend), com auth Google via NextAuth restrito a `@suno.com.br`.

### 1. OAuth Client Google

1. https://console.cloud.google.com/apis/credentials
2. **CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Suno Carrossel`
5. **Authorized JavaScript origins**:
   - `http://localhost:3001`
   - `https://SEU_DOMINIO.vercel.app` (depois do deploy)
6. **Authorized redirect URIs**:
   - `http://localhost:3001/api/auth/callback/google`
   - `https://SEU_DOMINIO.vercel.app/api/auth/callback/google`
7. Copia o **Client ID** e **Client secret**

### 2. Deploy Backend (Render)

1. https://render.com → **New** → **Web Service**
2. Connect GitHub → escolhe `suno-research/suno-carousel-generator`
3. Configurações:
   - **Name:** `suno-carousel-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment variables** (clica "Advanced" → "Add Environment Variable"):
   - `ANTHROPIC_API_KEY` — chave nova da Anthropic
   - `ANTHROPIC_MODEL` — `claude-sonnet-4-6`
   - `GOOGLE_API_KEY` — chave nova do Google
   - `GOOGLE_CSE_ID` — `431fe653802664088`
   - `UNSPLASH_ACCESS_KEY` — chave nova do Unsplash
   - `CORS_ALLOWED_ORIGINS` — preencher DEPOIS do deploy do frontend (URL Vercel)
5. Create Web Service. Depois de ~5min, anota a URL (ex: `https://suno-carousel-backend.onrender.com`).

### 3. Deploy Frontend (Vercel)

1. https://vercel.com → **Add New** → **Project**
2. Import `suno-research/suno-carousel-generator`
3. Configurações:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (auto-detectado)
4. **Environment variables**:
   - `NEXT_PUBLIC_BACKEND_URL` — URL do Render do passo 2
   - `NEXTAUTH_SECRET` — rode `openssl rand -base64 32` no terminal e cola
   - `NEXTAUTH_URL` — preencher DEPOIS (URL final da Vercel)
   - `GOOGLE_CLIENT_ID` — do passo 1
   - `GOOGLE_CLIENT_SECRET` — do passo 1
5. Deploy. Depois anota a URL (ex: `https://suno-carousel-generator.vercel.app`).
6. Volta nas env vars e preenche `NEXTAUTH_URL` com a URL final. Faz redeploy.

### 4. Conectar tudo

1. **Backend** (Render): adiciona a URL Vercel em `CORS_ALLOWED_ORIGINS`
2. **OAuth Google**: adiciona a URL Vercel em "Authorized origins" e o callback `/api/auth/callback/google` em "Authorized redirect URIs"
3. Testa logando com email `@suno.com.br`

### Custo aproximado (uso pessoal)

- Vercel: free tier
- Render: free tier (com cold start) ou Starter $7/mês (sempre on)
- Anthropic: ~$0.05/carrossel
- Google CSE: 100 buscas/dia grátis
- Unsplash: 50 req/hora grátis

---

## Roadmap

- [ ] Histórico de carrosséis gerados
- [ ] Toggle de modelo (Sonnet/Haiku) pra carrosséis mais rápidos quando precisar
- [ ] Templates de slide (capa, dado destacado, citação, CTA)
- [ ] Geração de imagem via IA (Gemini Nano Banana) como camada extra
- [ ] Postagem direta no Instagram via API
