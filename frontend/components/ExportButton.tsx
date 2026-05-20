'use client';

import { useState } from 'react';
import { domToBlob } from 'modern-screenshot';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useCarrosselStore } from '@/lib/store';
import SlideCanvas from './SlideCanvas';
import { createRoot } from 'react-dom/client';

/** Fetch da imagem externa convertida em data URL pra evitar CORS/taint no canvas. */
async function imgToDataUrl(url: string): Promise<string | null> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[export] failed to fetch image as data url:', url, e);
    return null;
  }
}

export default function ExportButton() {
  const carrossel = useCarrosselStore((s) => s.carrossel);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleExport() {
    if (!carrossel || exporting) return;
    setExporting(true);
    setProgress(0);

    try {
      // 1) Aguarda webfonts carregarem (texto idêntico ao preview)
      if (typeof document.fonts?.ready?.then === 'function') {
        await document.fonts.ready;
      }

      // 2) Pré-fetch das imagens externas em data URL.
      // Garante que o snapshot seja 100% local, sem CORS/taint.
      const slidesWithDataUrls = await Promise.all(
        carrossel.slides.map(async (s) => {
          if (!s.imagem_url || s.imagem_url.startsWith('data:')) return s;
          const dataUrl = await imgToDataUrl(s.imagem_url);
          return dataUrl ? { ...s, imagem_url: dataUrl } : s;
        })
      );

      const zip = new JSZip();
      const offscreen = document.createElement('div');
      offscreen.style.cssText =
        'position:fixed;left:-99999px;top:0;width:1080px;height:1350px;pointer-events:none;background:#fff;';
      document.body.appendChild(offscreen);

      for (let i = 0; i < slidesWithDataUrls.length; i++) {
        const slide = slidesWithDataUrls[i];
        const container = document.createElement('div');
        offscreen.appendChild(container);
        const root = createRoot(container);

        // Render do slide em scale=1 (1080x1350 nativo)
        await new Promise<void>((resolve) => {
          root.render(<SlideCanvas slide={slide} scale={1} />);
          // 2 RAFs garantem layout + paint
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const canvasNode = container.querySelector('[data-slide-canvas]') as HTMLElement;
        if (!canvasNode) {
          root.unmount();
          container.remove();
          continue;
        }

        // Aguarda todas as <img> internas (logo + foto) terminarem de decode
        const imgs = Array.from(canvasNode.querySelectorAll('img'));
        await Promise.all(
          imgs.map(async (img) => {
            if (img.complete && img.naturalHeight > 0) {
              try {
                await img.decode();
              } catch {
                /* ignore */
              }
              return;
            }
            await new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
              setTimeout(res, 8000);
            });
            try {
              await img.decode();
            } catch {
              /* ignore */
            }
          })
        );

        // modern-screenshot: suporte muito melhor a object-fit, transform e CSS moderno
        // do que html2canvas. scale=2 dá nitidez Retina sem aumentar a saída final.
        const blob = await domToBlob(canvasNode, {
          width: 1080,
          height: 1350,
          scale: 2,
          backgroundColor: '#ffffff',
          type: 'image/png',
          quality: 1,
        });

        const num = String(i + 1).padStart(2, '0');
        zip.file(`slide-${num}.png`, blob);

        root.unmount();
        container.remove();
        setProgress(Math.round(((i + 1) / slidesWithDataUrls.length) * 100));
      }

      offscreen.remove();
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fname = `suno-carrossel-${carrossel.tema.slice(0, 30).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.zip`;
      saveAs(zipBlob, fname);
    } catch (e) {
      console.error('Export error:', e);
      alert('Erro ao exportar. Veja o console.');
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!carrossel || exporting}
      className="bg-red-600 text-white font-medium rounded-lg px-4 py-2 text-sm hover:bg-red-700 disabled:opacity-50"
    >
      {exporting ? `Exportando... ${progress}%` : 'Exportar PNGs'}
    </button>
  );
}
