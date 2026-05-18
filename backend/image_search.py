"""Busca imagens em camadas: Google Images (CSE) → Wikipedia → Unsplash.

Estratégia:
1. Google Custom Search (image=true): cobre fotos reais de pessoas/empresas/eventos.
   - Baixa o conteúdo e devolve como data URL (evita CORS no html2canvas).
2. Wikipedia (pageimages): foto principal do artigo. Cobre pessoas históricas/empresas
   conhecidas (Rockefeller, Sam Altman, OpenAI, Standard Oil). Sem chave, sem rate limit.
3. Unsplash: fallback pra quando os outros falham ou pra temas genéricos.
   - Devolve URL direta (Unsplash CDN serve CORS).
"""
from __future__ import annotations

import base64
import mimetypes
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import httpx

GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"
WIKIPEDIA_URL = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_URL_PT = "https://pt.wikipedia.org/w/api.php"
UNSPLASH_URL = "https://api.unsplash.com/search/photos"

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _google_api_key() -> Optional[str]:
    return os.environ.get("GOOGLE_API_KEY")


def _google_cse_id() -> Optional[str]:
    return os.environ.get("GOOGLE_CSE_ID")


def _unsplash_key() -> Optional[str]:
    return os.environ.get("UNSPLASH_ACCESS_KEY")


def _download_as_data_url(url: str) -> Optional[str]:
    """Baixa o conteúdo da URL e converte em data URL base64. None em caso de falha."""
    try:
        response = httpx.get(
            url,
            timeout=10.0,
            headers={"User-Agent": BROWSER_UA, "Accept": "image/*,*/*;q=0.8"},
            follow_redirects=True,
        )
        response.raise_for_status()
        content = response.content
        if not content or len(content) < 1024:
            return None
        # Limite de 5MB pra não estourar payload JSON
        if len(content) > 5 * 1024 * 1024:
            print(f"[image_search] image too large ({len(content)} bytes) at {url}")
            return None
        mime = response.headers.get("content-type", "").split(";")[0].strip()
        if not mime or not mime.startswith("image/"):
            guess, _ = mimetypes.guess_type(url)
            mime = guess or "image/jpeg"
        b64 = base64.b64encode(content).decode("ascii")
        return f"data:{mime};base64,{b64}"
    except Exception as e:
        print(f"[image_search] download failed for {url}: {e}")
        return None


def _try_google_images(query: str) -> Optional[str]:
    api_key = _google_api_key()
    cse_id = _google_cse_id()
    if not api_key or not cse_id:
        return None
    try:
        response = httpx.get(
            GOOGLE_CSE_URL,
            params={
                "key": api_key,
                "cx": cse_id,
                "q": query,
                "searchType": "image",
                "num": 5,
                "safe": "active",
                "imgSize": "LARGE",
            },
            timeout=15.0,
        )
        response.raise_for_status()
        items = response.json().get("items", [])
        if not items:
            print(f"[image_search] Google CSE no results for {query!r}")
            return None
        # Tenta baixar uma das 5 imagens em ordem (pega a primeira que funcionar)
        for item in items:
            url = item.get("link")
            if not url:
                continue
            data_url = _download_as_data_url(url)
            if data_url:
                return data_url
        print(f"[image_search] Google CSE: nenhum dos resultados baixou pra {query!r}")
        return None
    except Exception as e:
        print(f"[image_search] Google CSE failed for {query!r}: {e}")
        return None


_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "from",
    "de", "do", "da", "dos", "das", "o", "a", "os", "as", "e", "em", "no", "na", "para",
    "que", "se", "um", "uma",
}


def _query_relevance(query: str, title: str) -> float:
    """Score 0-1: fração das palavras chave da query que aparecem no título da página."""
    q_words = {w.lower().strip(".,;:!?") for w in query.split() if len(w) > 2 and w.lower() not in _STOPWORDS}
    t_lower = title.lower()
    if not q_words:
        return 0.0
    hits = sum(1 for w in q_words if w in t_lower)
    return hits / len(q_words)


def _try_wikipedia(query: str, lang_url: str = WIKIPEDIA_URL) -> Optional[str]:
    """Busca a foto principal do artigo Wikipedia mais relevante pra query.

    Cobre pessoas históricas/famosas, empresas conhecidas, eventos. Gratuito, sem chave.
    Aplica filtro de relevância: rejeita resultados cujo título não tem nenhuma
    palavra-chave da query (ex: query "Suno logo" → página "Tarcísio de Freitas" = rejeitada).
    """
    try:
        response = httpx.get(
            lang_url,
            params={
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": query,
                "gsrlimit": 5,
                "prop": "pageimages",
                "piprop": "original",
                "pilimit": 5,
            },
            headers={"User-Agent": BROWSER_UA, "Accept": "application/json"},
            timeout=15.0,
        )
        response.raise_for_status()
        pages = (response.json().get("query") or {}).get("pages") or {}
        # Ordena por rank de busca e filtra por relevância mínima
        candidates = sorted(pages.values(), key=lambda p: p.get("index", 99))
        for page in candidates:
            title = page.get("title", "")
            original = page.get("original")
            if not original or not original.get("source"):
                continue
            if original.get("width", 0) < 400:
                continue
            score = _query_relevance(query, title)
            if score < 0.34:  # menos de 1/3 das palavras-chave no título → rejeita
                print(f"[image_search] Wikipedia rejeitado por relevância ({score:.2f}): {title!r} pra {query!r}")
                continue
            return original["source"]
        # Se nada deu certo em EN, tenta PT
        if lang_url == WIKIPEDIA_URL:
            return _try_wikipedia(query, WIKIPEDIA_URL_PT)
        return None
    except Exception as e:
        print(f"[image_search] Wikipedia failed for {query!r}: {e}")
        return None


def _try_unsplash(query: str) -> Optional[str]:
    key = _unsplash_key()
    if not key:
        return None
    try:
        response = httpx.get(
            UNSPLASH_URL,
            params={
                "query": query,
                "per_page": 1,
                "orientation": "landscape",
                "content_filter": "high",
            },
            headers={"Authorization": f"Client-ID {key}", "Accept-Version": "v1"},
            timeout=20.0,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        if not results:
            return None
        return results[0].get("urls", {}).get("regular")
    except Exception as e:
        print(f"[image_search] Unsplash failed for {query!r}: {e}")
        return None


def search_image(query: str) -> Optional[str]:
    """Busca uma imagem pra query. Camadas: Google CSE → Wikipedia → Unsplash."""
    if not query or not query.strip():
        return None
    return _try_google_images(query) or _try_wikipedia(query) or _try_unsplash(query)


def search_images_parallel(queries: list[Optional[str]], max_workers: int = 4) -> list[Optional[str]]:
    results: list[Optional[str]] = [None] * len(queries)
    indexed = [(i, q) for i, q in enumerate(queries) if q]
    if not indexed:
        return results
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(search_image, q): i for i, q in indexed}
        for future in as_completed(futures):
            i = futures[future]
            results[i] = future.result()
    return results
