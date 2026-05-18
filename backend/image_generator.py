"""Gera imagens editoriais via Gemini 2.5 Flash Image (nano banana)."""
from __future__ import annotations

import base64
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash-image"

STYLE_SUFFIX = (
    "Realistic editorial photograph, photojournalism style, magazine quality, "
    "natural lighting, sharp focus, candid framing, no text overlay, no logos, "
    "no graphics, no watermark, no captions, no UI elements. Wide horizontal composition."
)


_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY não configurada no .env")
        _client = genai.Client(api_key=api_key)
    return _client


def generate_image(prompt_text: str) -> Optional[str]:
    """Gera uma imagem a partir da sugestão e devolve como data URL (base64).

    Retorna None em caso de falha (não derruba o carrossel inteiro).
    """
    try:
        client = _get_client()
        full_prompt = f"{prompt_text}. {STYLE_SUFFIX}"
        response = client.models.generate_content(
            model=MODEL,
            contents=[full_prompt],
        )
        for candidate in response.candidates or []:
            content = getattr(candidate, "content", None)
            if not content:
                continue
            for part in getattr(content, "parts", None) or []:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    mime = getattr(inline, "mime_type", None) or "image/png"
                    data = inline.data
                    if isinstance(data, str):
                        return f"data:{mime};base64,{data}"
                    b64 = base64.b64encode(data).decode("utf-8")
                    return f"data:{mime};base64,{b64}"
        print(f"[image] no inline_data in response for prompt: {prompt_text[:80]}")
        return None
    except Exception as e:
        print(f"[image] generation failed: {e}")
        return None


def generate_images_parallel(prompts: list[Optional[str]], max_workers: int = 4) -> list[Optional[str]]:
    """Gera imagens em paralelo. prompts[i]=None pula esse índice.

    Retorna lista com data URLs (ou None) na mesma ordem.
    """
    results: list[Optional[str]] = [None] * len(prompts)
    indexed = [(i, p) for i, p in enumerate(prompts) if p]
    if not indexed:
        return results
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(generate_image, p): i for i, p in indexed}
        for future in as_completed(futures):
            i = futures[future]
            results[i] = future.result()
    return results
