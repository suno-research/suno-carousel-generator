'use client';

import { useRef } from 'react';
import { useCarrosselStore } from '@/lib/store';

interface Props {
  slideId: string;
  currentUrl?: string | null;
  sugestao?: string | null;
}

export default function ImageUploader({ slideId, currentUrl, sugestao }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setImage = useCarrosselStore((s) => s.setImage);
  const clearImage = useCarrosselStore((s) => s.clearImage);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setImage(slideId, String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Imagem</h2>
      {sugestao && (
        <p className="text-xs text-gray-500 mb-2 italic">Sugestão: {sugestao}</p>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center"
      >
        {currentUrl ? (
          <div className="flex flex-col gap-2">
            <img src={currentUrl} alt="" className="w-full h-24 object-cover rounded" />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={() => clearImage(slideId)}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-gray-500 hover:text-gray-700 py-3"
          >
            Clique ou arraste uma imagem
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      </div>
    </div>
  );
}
