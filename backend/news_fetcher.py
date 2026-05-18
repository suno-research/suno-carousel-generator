"""Extrai o texto principal de uma URL de notícia usando trafilatura."""
from __future__ import annotations

import trafilatura


class FetchError(Exception):
    pass


def fetch(url: str) -> dict:
    """Baixa a URL e devolve {'titulo': str, 'texto': str, 'autor': str|None, 'data': str|None}."""
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        raise FetchError(f"Não consegui baixar a URL: {url}")

    extracted = trafilatura.extract(
        downloaded,
        output_format="json",
        with_metadata=True,
        include_comments=False,
        include_tables=False,
        favor_recall=True,
    )
    if not extracted:
        raise FetchError(f"Não consegui extrair conteúdo da URL: {url}")

    import json
    data = json.loads(extracted)

    texto = (data.get("text") or "").strip()
    if not texto:
        raise FetchError(f"Texto extraído está vazio: {url}")

    if len(texto) > 12_000:
        texto = texto[:12_000] + "\n\n[...texto truncado em 12k caracteres...]"

    return {
        "titulo": data.get("title") or "",
        "texto": texto,
        "autor": data.get("author"),
        "data": data.get("date"),
        "url": url,
    }
