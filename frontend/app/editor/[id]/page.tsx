'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCarrosselStore } from '@/lib/store';
import SlideCanvas from '@/components/SlideCanvas';
import SlideList from '@/components/SlideList';
import StylePanel from '@/components/StylePanel';
import ExportButton from '@/components/ExportButton';
import CanvasToolbar from '@/components/CanvasToolbar';
import { SLIDE_DIMENSIONS } from '@/lib/brand-suno';

export default function EditorPage() {
  const carrossel = useCarrosselStore((s) => s.carrossel);
  const selectedId = useCarrosselStore((s) => s.selectedSlideId);
  const updateSlide = useCarrosselStore((s) => s.updateSlide);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;

  if (!carrossel) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Nenhum carrossel carregado.</p>
          <Link href="/" className="text-red-600 hover:underline">
            Voltar e gerar um
          </Link>
        </div>
      </main>
    );
  }

  const slide = carrossel.slides.find((s) => s.id === selectedId) || carrossel.slides[0];

  const viewportScale = Math.min(720 / SLIDE_DIMENSIONS.width, 0.6);

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">
            ← Voltar
          </Link>
          <h1 className="text-sm font-medium truncate max-w-md">{carrossel.tema}</h1>
        </div>
        <ExportButton />
      </header>

      <div className="flex-1 flex overflow-hidden">
        <SlideList />

        <section className="flex-1 flex flex-col items-center overflow-auto p-6 gap-3">
          <CanvasToolbar />
          {slide && (
            <SlideCanvas
              slide={slide}
              scale={viewportScale}
              editable
              onCorpoChange={(corpo) => updateSlide(slide.id, { corpo })}
              onImageDrag={(x, y) =>
                updateSlide(slide.id, { estilo: { ...slide.estilo, imagem_offset_x: x, imagem_offset_y: y } })
              }
              onImageZoom={(scale) =>
                updateSlide(slide.id, { estilo: { ...slide.estilo, imagem_scale: scale } })
              }
              onImageResize={(heightPct) =>
                updateSlide(slide.id, { estilo: { ...slide.estilo, imagem_height_pct: heightPct } })
              }
            />
          )}
        </section>

        <StylePanel />
      </div>
    </main>
  );
}
