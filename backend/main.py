"""FastAPI app — endpoint /generate que retorna um Carrossel a partir de tema + URL."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from typing import Optional

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from json_repair import repair_json

from image_search import search_images_parallel
from news_fetcher import fetch, FetchError
from prompt_builder import SYSTEM_PROMPT, build_user_prompt
from schemas import Carrossel, GenerateRequest, Slide, SlideEstilo

load_dotenv(override=True)

app = FastAPI(title="Suno Carousel Generator")

_default_origins = ["http://localhost:3000", "http://localhost:3001"]
_extra_origins = [o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# Tool definition: força Claude a devolver JSON no schema correto, eliminando
# erros de parse (aspas não escapadas, vírgulas perdidas, etc).
CAROUSEL_TOOL = {
    "name": "create_carousel",
    "description": "Cria um carrossel de slides para Instagram da Suno Investimentos no padrão storytelling da casa.",
    "input_schema": {
        "type": "object",
        "properties": {
            "fonte_titulo": {
                "type": ["string", "null"],
                "description": "Título da notícia fonte, ou null em modo só-tema.",
            },
            "legenda": {
                "type": "string",
                "description": (
                    "Legenda pronta pra colar abaixo do carrossel no Instagram. "
                    "Padrão: 80-180 palavras, em 3-5 parágrafos curtos separados por \\n\\n. "
                    "Primeiro parágrafo replica o hook do carrossel com leve variação. "
                    "Segundo parágrafo resume o ponto central da tese (a régua que o leitor leva). "
                    "Penúltimo parágrafo: chamada pra arrastar o carrossel (ex: 'Arrasta pra ver os 4 motivos'). "
                    "ÚLTIMO PARÁGRAFO: PERGUNTA DE INTERAÇÃO que convida ao comentário, "
                    "conectada ao tema do carrossel. "
                    "Exemplos de boas perguntas: 'Você compraria a ação dessa empresa hoje?', "
                    "'Qual empresa brasileira você acha que tem essa vantagem estrutural?', "
                    "'Você já passou por um ciclo assim na sua carteira?'. "
                    "PROIBIDO usar hashtags. Sem emojis em excesso (máx 1 sutil). Tom igual ao do carrossel."
                ),
            },
            "slides": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Ex: 'slide-1'."},
                        "layout": {"type": "string", "enum": ["capa", "texto", "cta"]},
                        "titulo": {"type": ["string", "null"], "description": "SEMPRE null."},
                        "corpo": {
                            "type": "string",
                            "description": "30-60 palavras em 3-6 parágrafos curtos (separados por \\n\\n). Use markdown **negrito** em 2-4 termos chave. Cliffhanger no fim (exceto último).",
                        },
                        "numero": {"type": ["string", "null"], "description": "SEMPRE null."},
                        "legenda": {"type": ["string", "null"], "description": "SEMPRE null."},
                        "sugestao_imagem": {
                            "type": ["string", "null"],
                            "description": "Descrição editorial em português da imagem ideal.",
                        },
                        "query_imagem": {
                            "type": ["string", "null"],
                            "description": "2-5 keywords em inglês pra busca (ex: 'Sam Altman OpenAI CEO').",
                        },
                    },
                    "required": ["id", "layout", "corpo"],
                },
            },
        },
        "required": ["slides"],
    },
}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": MODEL}


def _parse_data_url(data_url: str) -> tuple[str, str]:
    """data:image/jpeg;base64,XXXX -> ('image/jpeg', 'XXXX'). Lança ValueError se inválida."""
    if not data_url.startswith("data:"):
        raise ValueError("imagem_base64 deve começar com 'data:'")
    header, _, b64 = data_url.partition(",")
    if not b64:
        raise ValueError("data URL sem conteúdo base64")
    mime = header.removeprefix("data:").split(";")[0].strip() or "image/jpeg"
    if mime not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        raise ValueError(f"tipo de imagem não suportado: {mime}")
    return mime, b64


def _pipeline_events(req: GenerateRequest):
    """Generator que executa o pipeline emitindo eventos de progresso.

    Yields ('status', {step, label}), ('result', Carrossel) ou ('error', {status, detail}).
    """
    yield ("status", {"step": "fetching", "label": "Lendo a notícia..."})

    fonte_url = (req.url or "").strip()
    noticia = None
    if fonte_url:
        try:
            noticia = fetch(fonte_url)
        except FetchError as e:
            yield ("error", {"status": 422, "detail": str(e)})
            return

    texto_extra = (req.texto_extra or "").strip() or None
    image_data: Optional[tuple[str, str]] = None
    if req.imagem_base64:
        try:
            image_data = _parse_data_url(req.imagem_base64)
        except ValueError as e:
            yield ("error", {"status": 422, "detail": f"imagem inválida: {e}"})
            return

    yield ("status", {"step": "generating", "label": "Escrevendo o copy..."})

    user_prompt = build_user_prompt(
        req.tema,
        req.num_slides,
        noticia,
        texto_extra=texto_extra,
        tem_imagem=image_data is not None,
    )

    # Monta content: se tem imagem, inclui como bloco multimodal ANTES do texto
    if image_data:
        mime, b64 = image_data
        user_content = [
            {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}},
            {"type": "text", "text": user_prompt},
        ]
    else:
        user_content = user_prompt

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        tools=[CAROUSEL_TOOL],
        tool_choice={"type": "tool", "name": "create_carousel"},
        messages=[{"role": "user", "content": user_content}],
    )

    parsed = None
    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == "create_carousel":
            parsed = block.input
            break

    if not parsed or not isinstance(parsed, dict):
        yield (
            "error",
            {
                "status": 502,
                "detail": f"Claude não retornou o tool create_carousel. Stop reason: {response.stop_reason}",
            },
        )
        return

    raw_slides = parsed.get("slides", [])
    if isinstance(raw_slides, str):
        try:
            repaired = repair_json(raw_slides)
            raw_slides = json.loads(repaired) if isinstance(repaired, str) else repaired
        except Exception as e:
            yield ("error", {"status": 502, "detail": f"slides veio como string malformada: {e}"})
            return
    if not isinstance(raw_slides, list):
        yield ("error", {"status": 502, "detail": f"slides não é lista: {type(raw_slides).__name__}"})
        return

    default_estilo = SlideEstilo()
    slides = [
        Slide(
            id=s.get("id") or f"slide-{i + 1}",
            layout=s.get("layout", "texto"),
            titulo=s.get("titulo"),
            corpo=s.get("corpo"),
            numero=s.get("numero"),
            legenda=s.get("legenda"),
            sugestao_imagem=s.get("sugestao_imagem"),
            query_imagem=s.get("query_imagem"),
            estilo=default_estilo,
        )
        for i, s in enumerate(raw_slides)
    ]

    if not slides:
        yield ("error", {"status": 502, "detail": "Claude não devolveu slides."})
        return

    yield ("status", {"step": "images", "label": "Buscando imagens..."})

    queries = [s.query_imagem or s.sugestao_imagem for s in slides]
    img_urls = search_images_parallel(queries, max_workers=4)
    for slide, image_url in zip(slides, img_urls):
        if image_url:
            slide.imagem_url = image_url

    carrossel = Carrossel(
        id=str(uuid.uuid4()),
        tema=req.tema,
        fonte_url=fonte_url,
        fonte_titulo=parsed.get("fonte_titulo") or (noticia.get("titulo") if noticia else None),
        legenda=parsed.get("legenda"),
        slides=slides,
        criado_em=datetime.utcnow().isoformat() + "Z",
    )
    yield ("result", carrossel)


@app.post("/generate", response_model=Carrossel)
def generate(req: GenerateRequest) -> Carrossel:
    for event_type, data in _pipeline_events(req):
        if event_type == "error":
            raise HTTPException(status_code=data["status"], detail=data["detail"])
        if event_type == "result":
            return data
    raise HTTPException(status_code=500, detail="Pipeline terminou sem resultado.")


@app.post("/generate-stream")
def generate_stream(req: GenerateRequest):
    """Versão streaming via Server-Sent Events: emite status em tempo real."""

    def stream():
        for event_type, data in _pipeline_events(req):
            if event_type == "result":
                payload = {"event": "done", "carrossel": data.model_dump()}
            elif event_type == "error":
                payload = {"event": "error", **data}
            else:  # status
                payload = {"event": "status", **data}
            yield f"data: {json.dumps(payload, default=str)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
