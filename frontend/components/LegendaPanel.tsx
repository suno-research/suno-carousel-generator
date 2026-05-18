'use client';

import { useState } from 'react';
import { useCarrosselStore } from '@/lib/store';

export default function LegendaPanel() {
  const carrossel = useCarrosselStore((s) => s.carrossel);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (!carrossel) return null;

  const legenda = editing ? draft : carrossel.legenda || '';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(legenda || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Falha ao copiar:', e);
    }
  }

  function handleEditToggle() {
    if (editing) {
      // salvar
      useCarrosselStore.setState((state) => ({
        carrossel: state.carrossel ? { ...state.carrossel, legenda: draft } : null,
      }));
    } else {
      setDraft(carrossel.legenda || '');
    }
    setEditing(!editing);
  }

  if (!carrossel.legenda && !editing) {
    return (
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Legenda do post
        </h2>
        <p className="text-xs text-gray-500">
          Sem legenda gerada (carrossel antigo). Gere um novo carrossel pra ter legenda pronta.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Legenda do post</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleEditToggle}
            className="text-[10px] px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
          >
            {editing ? 'Salvar' : 'Editar'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={12}
          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs leading-relaxed font-mono resize-y focus:outline-none focus:ring-2 focus:ring-red-600"
          spellCheck
        />
      ) : (
        <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 max-h-96 overflow-y-auto">
          {legenda}
        </div>
      )}
    </div>
  );
}
