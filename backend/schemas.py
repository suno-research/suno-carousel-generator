"""Schemas Pydantic compartilhados entre prompt_builder e main."""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


SlideLayout = Literal["capa", "dado", "texto", "cta"]


class SlideEstilo(BaseModel):
    bg_color: str = "#FFFFFF"
    text_color: str = "#0F1419"
    accent_color: str = "#D42126"
    font_family: str = "Inter"
    align: Literal["left", "center"] = "left"


class Slide(BaseModel):
    id: str
    layout: SlideLayout
    titulo: Optional[str] = None
    corpo: Optional[str] = None
    numero: Optional[str] = None  # pro layout 'dado' (ex: "R$ 2,05 bi")
    legenda: Optional[str] = None  # legenda complementar
    sugestao_imagem: Optional[str] = None  # descrição editorial em português (referência humana)
    query_imagem: Optional[str] = None  # keywords curtas em inglês pra busca Unsplash
    imagem_url: Optional[str] = None  # preenchido pelo backend (URL Unsplash) ou frontend (upload)
    estilo: SlideEstilo = Field(default_factory=SlideEstilo)


class Carrossel(BaseModel):
    id: str
    tema: str
    fonte_url: Optional[str] = None
    fonte_titulo: Optional[str] = None
    legenda: Optional[str] = None  # texto pronto pra colar na legenda do post Instagram
    slides: list[Slide]
    criado_em: str


class GenerateRequest(BaseModel):
    tema: str = Field(..., min_length=3, max_length=200)
    url: Optional[str] = Field(default=None, description="URL da notícia (opcional)")
    texto_extra: Optional[str] = Field(
        default=None,
        description="Texto livre com insumos extras (notas, pontos que devem aparecer, contexto, etc)",
        max_length=10_000,
    )
    imagem_base64: Optional[str] = Field(
        default=None,
        description="Imagem de referência em data URL (data:image/jpeg;base64,...). Claude analisa pra contexto.",
    )
    num_slides: int = Field(default=8, ge=5, le=10)
