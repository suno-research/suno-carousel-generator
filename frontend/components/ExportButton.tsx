'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useCarrosselStore } from '@/lib/store';
import SlideCanvas from './SlideCanvas';
import { createRoot } from 'react-dom/client';

export default function ExportButton() {
  const carrossel = useCarrosselStore((s) => s.carrossel);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleExport() {
    if (!carrossel || exporting) return;
    setExporting(true);
    setProgress(0);

    try {
      // Garante que webfonts estejam carregadas antes do html2canvas
      // (sem isso o texto pode quebrar diferente no PNG vs preview)
      if (typeof document.fonts?.ready?.then === 'function') {
        await document.fonts.ready;
      }

      const zip = new JSZip();
      const offscreen = document.createElement('div');
      offscreen.style.cssText =
        'position:fixed;left:-99999px;top:0;width:1080px;height:1350px;pointer-events:none;';
      document.body.appendChild(offscreen);

      for (let i = 0; i < carrossel.slides.length; i++) {
        const slide = carrossel.slides[i];
        const container = document.createElement('div');
        offscreen.appendChild(container);
        const root = createRoot(container);

        await new Promise<void>((resolve) => {
          root.render(<SlideCanvas slide={slide} scale={1} />);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const canvasNode = container.querySelector('[data-slide-canvas]') as HTMLElement;
        if (!canvasNode) {
          root.unmount();
          container.remove();
          continue;
        }

        // Espera todas as imagens internas carregarem (logo + foto do slide).
        // Sem isso o html2canvas pode rasterizar antes da imagem, e o PNG sai
        // diferente do preview ou com slot vazio.
        const imgs = Array.from(canvasNode.querySelectorAll('img'));
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete && img.naturalHeight > 0) return res();
                img.onload = () => res();
                img.onerror = () => res();
                setTimeout(res, 8000); // safety timeout: 8s por imagem
              })
          )
        );

        const canvas = await html2canvas(canvasNode, {
          width: 1080,
          height: 1350,
          scale: 1,
          backgroundColor: null,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 10000,
        });

        const blob: Blob = await new Promise((res) =>
          canvas.toBlob((b) => res(b!), 'image/png', 0.95)
        );
        const num = String(i + 1).padStart(2, '0');
        zip.file(`slide-${num}.png`, blob);

        root.unmount();
        container.remove();
        setProgress(Math.round(((i + 1) / carrossel.slides.length) * 100));
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
