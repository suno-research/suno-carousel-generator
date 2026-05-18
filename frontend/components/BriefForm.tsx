'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrosselStore } from '@/lib/store';
import { SUNO_DEFAULT_ESTILO } from '@/lib/brand-suno';
import type { Carrossel } from '@/lib/types';

export default function BriefForm() {
  const router = useRouter();
  const setCarrossel = useCarrosselStore((s) => s.setCarrossel);
  const [tema, setTema] = useState('');
  const [url, setUrl] = useState('');
  const [textoExtra, setTextoExtra] = useState('');
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemNome, setImagemNome] = useState<string | null>(null);
  const [numSlides, setNumSlides] = useState(8);
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErro('Imagem maior que 5MB. Comprima antes de subir.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagemBase64(String(reader.result));
      setImagemNome(file.name);
      setErro(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    setStatusLabel('Conectando...');

    try {
      const trimmedUrl = url.trim();
      const trimmedTexto = textoExtra.trim();
      const res = await fetch('http://localhost:8000/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema,
          url: trimmedUrl || null,
          texto_extra: trimmedTexto || null,
          imagem_base64: imagemBase64 || null,
          num_slides: numSlides,
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Erro HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let carrossel: Carrossel | null = null;
      let pipelineError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // o último pedaço pode estar incompleto

        for (const block of lines) {
          if (!block.startsWith('data: ')) continue;
          const json = block.slice(6).trim();
          if (!json) continue;
          let msg: { event: string; label?: string; step?: string; carrossel?: Carrossel; detail?: string };
          try {
            msg = JSON.parse(json);
          } catch {
            continue;
          }
          if (msg.event === 'status' && msg.label) {
            setStatusLabel(msg.label);
          } else if (msg.event === 'done' && msg.carrossel) {
            carrossel = msg.carrossel;
          } else if (msg.event === 'error') {
            pipelineError = msg.detail || 'Erro desconhecido';
          }
        }
      }

      if (pipelineError) throw new Error(pipelineError);
      if (!carrossel) throw new Error('Pipeline terminou sem resultado.');

      carrossel.slides = carrossel.slides.map((s) => ({
        ...s,
        estilo: { ...SUNO_DEFAULT_ESTILO, ...(s.estilo || {}) },
      }));
      setCarrossel(carrossel);
      router.push(`/editor/${carrossel.id}`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setStatusLabel('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Tema do carrossel</label>
        <input
          type="text"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          placeholder="Ex: Telefônica e as 4 revoluções tecnológicas"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Link da notícia <span className="text-gray-400 font-normal">(opcional, recomendado)</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://valor.globo.com/... (ou deixe vazio pra gerar só com o tema)"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          Com link, o carrossel é construído com dados reais da matéria. Sem link, é gerado só com base no tema (sem
          números específicos).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Insumos extras <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={textoExtra}
          onChange={(e) => setTextoExtra(e.target.value)}
          rows={4}
          maxLength={10_000}
          placeholder="Cola aqui notas, pontos que devem aparecer, contexto extra, anotações, citações..."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Imagem de referência <span className="text-gray-400 font-normal">(opcional, máx 5MB)</span>
        </label>
        {!imagemBase64 ? (
          <label className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 cursor-pointer hover:border-gray-400 text-sm text-gray-500">
            Clique pra subir imagem (screenshot, gráfico, foto)
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        ) : (
          <div className="flex items-center gap-3 border border-gray-300 rounded-lg p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagemBase64} alt="" className="w-16 h-16 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{imagemNome}</p>
              <button
                type="button"
                onClick={() => {
                  setImagemBase64(null);
                  setImagemNome(null);
                }}
                className="text-xs text-red-600 hover:underline mt-1"
              >
                Remover
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Claude analisa a imagem (texto, números, pessoa, contexto) e usa como insumo no carrossel.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Nº de slides ({numSlides})</label>
        <input
          type="range"
          min={5}
          max={10}
          value={numSlides}
          onChange={(e) => setNumSlides(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{erro}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 text-white font-medium rounded-lg px-6 py-3 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        <span>{loading ? statusLabel || 'Gerando carrossel...' : 'Gerar carrossel'}</span>
      </button>
    </form>
  );
}
