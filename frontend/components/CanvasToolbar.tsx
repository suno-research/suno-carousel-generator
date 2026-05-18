'use client';

import { useCarrosselStore } from '@/lib/store';
import { DEFAULT_BODY_FONT_SIZE } from '@/lib/brand-suno';

export default function CanvasToolbar() {
  const carrossel = useCarrosselStore((s) => s.carrossel);
  const selectedId = useCarrosselStore((s) => s.selectedSlideId);
  const updateSlide = useCarrosselStore((s) => s.updateSlide);

  const slide = carrossel?.slides.find((s) => s.id === selectedId);
  if (!slide) return null;

  const fontSize = slide.estilo.font_size ?? DEFAULT_BODY_FONT_SIZE;

  const setSize = (size: number) => {
    const clamped = Math.max(20, Math.min(96, Math.round(size)));
    updateSlide(slide.id, { estilo: { ...slide.estilo, font_size: clamped } });
  };

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
      <span className="text-xs text-gray-500 mr-1">Texto</span>
      <button
        type="button"
        onClick={() => setSize(fontSize - 2)}
        className="w-7 h-7 flex items-center justify-center text-sm border border-gray-300 rounded hover:bg-gray-100"
        aria-label="Diminuir texto"
        title="Diminuir (-2px)"
      >
        −
      </button>
      <input
        type="number"
        min={20}
        max={96}
        value={fontSize}
        onChange={(e) => setSize(Number(e.target.value) || fontSize)}
        className="w-14 h-7 text-center text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-600"
      />
      <span className="text-xs text-gray-400">px</span>
      <button
        type="button"
        onClick={() => setSize(fontSize + 2)}
        className="w-7 h-7 flex items-center justify-center text-sm border border-gray-300 rounded hover:bg-gray-100"
        aria-label="Aumentar texto"
        title="Aumentar (+2px)"
      >
        +
      </button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <span className="text-[10px] text-gray-400">
        Slide{' '}
        <span className="font-mono text-gray-600">
          {(carrossel?.slides.findIndex((s) => s.id === selectedId) ?? 0) + 1}/
          {carrossel?.slides.length ?? 0}
        </span>
      </span>
    </div>
  );
}
