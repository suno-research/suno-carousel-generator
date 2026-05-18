'use client';

import { HexColorPicker } from 'react-colorful';
import { useRef, useState } from 'react';
import { useCarrosselStore } from '@/lib/store';
import { DEFAULT_BODY_FONT_SIZE } from '@/lib/brand-suno';
import ImageUploader from './ImageUploader';
import LegendaPanel from './LegendaPanel';

const PALETA_SUNO = ['#FFFFFF', '#0F1419', '#D42126', '#F2F3F5', '#1D9BF0', '#000000'];
const FONTES = ['Inter', 'Helvetica', 'Arial', 'Georgia', 'system-ui'];
const LAYOUTS = [
  { value: 'capa', label: 'Capa' },
  { value: 'texto', label: 'Texto' },
  { value: 'cta', label: 'CTA' },
] as const;

interface SwatchProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function Swatch({ label, value, onChange }: SwatchProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        <span className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: value }} />
        <span className="font-mono text-xs">{value}</span>
      </button>
      {open && (
        <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-white shadow-lg">
          <HexColorPicker color={value} onChange={onChange} />
          <div className="grid grid-cols-6 gap-1 mt-3">
            {PALETA_SUNO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c)}
                className="w-7 h-7 rounded border border-gray-300"
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

export default function StylePanel() {
  const carrossel = useCarrosselStore((s) => s.carrossel);
  const selectedId = useCarrosselStore((s) => s.selectedSlideId);
  const updateSlide = useCarrosselStore((s) => s.updateSlide);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slide = carrossel?.slides.find((s) => s.id === selectedId);
  if (!slide) return <aside className="w-72 border-l border-gray-200 bg-white p-4" />;

  const setEstilo = (patch: Partial<typeof slide.estilo>) =>
    updateSlide(slide.id, { estilo: { ...slide.estilo, ...patch } });

  const fontSize = slide.estilo.font_size ?? DEFAULT_BODY_FONT_SIZE;

  function wrapSelectionWithBold() {
    const ta = textareaRef.current;
    if (!ta || !slide) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    if (start === end) return; // nada selecionado
    const selected = text.slice(start, end);
    // Toggle: se já estava em **...**, remove. Senão, embrulha.
    const before = text.slice(0, start);
    const after = text.slice(end);
    const alreadyBold =
      before.endsWith('**') && after.startsWith('**') && !selected.includes('**');
    let next: string;
    let cursorPos: number;
    if (alreadyBold) {
      next = before.slice(0, -2) + selected + after.slice(2);
      cursorPos = start - 2 + selected.length;
    } else {
      next = before + '**' + selected + '**' + after;
      cursorPos = end + 4;
    }
    updateSlide(slide.id, { corpo: next });
    // Restaura foco e seleção após o re-render
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  return (
    <aside className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto flex flex-col gap-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Copy do slide</h2>
          <button
            type="button"
            onClick={wrapSelectionWithBold}
            title="Negrito (selecione o texto e clique)"
            className="px-2 py-0.5 text-sm font-bold border border-gray-300 rounded hover:bg-gray-100"
          >
            B
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={slide.corpo || ''}
          onChange={(e) => updateSlide(slide.id, { corpo: e.target.value })}
          rows={9}
          placeholder="Texto do slide. Selecione uma palavra e clique B pra negrito. Quebras de linha viram parágrafos."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-red-600"
          spellCheck
        />
        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
          Selecione palavra e clique <strong>B</strong> pra negrito. Ou digite{' '}
          <code className="bg-gray-100 px-1">**assim**</code>.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tamanho do texto</h2>
          <span className="text-xs font-mono text-gray-600">{fontSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEstilo({ font_size: Math.max(28, fontSize - 2) })}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
            aria-label="Diminuir texto"
          >
            A−
          </button>
          <input
            type="range"
            min={28}
            max={72}
            step={1}
            value={fontSize}
            onChange={(e) => setEstilo({ font_size: Number(e.target.value) })}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setEstilo({ font_size: Math.min(72, fontSize + 2) })}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
            aria-label="Aumentar texto"
          >
            A+
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Layout</h2>
        <div className="grid grid-cols-3 gap-1">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => updateSlide(slide.id, { layout: l.value })}
              className={`px-2 py-1.5 text-xs rounded border ${
                slide.layout === l.value
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cores</h2>
        <Swatch label="Fundo" value={slide.estilo.bg_color} onChange={(v) => setEstilo({ bg_color: v })} />
        <Swatch label="Texto" value={slide.estilo.text_color} onChange={(v) => setEstilo({ text_color: v })} />
        <Swatch
          label="Destaque"
          value={slide.estilo.accent_color}
          onChange={(v) => setEstilo({ accent_color: v })}
        />
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipografia</h2>
        <select
          value={slide.estilo.font_family}
          onChange={(e) => setEstilo({ font_family: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {FONTES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alinhamento</h2>
        <div className="grid grid-cols-2 gap-1">
          {(['left', 'center'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setEstilo({ align: a })}
              className={`px-2 py-1.5 text-xs rounded border ${
                slide.estilo.align === a
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {a === 'left' ? 'Esquerda' : 'Centro'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Imagem</h2>
          <button
            type="button"
            onClick={() =>
              setEstilo({
                imagem_fit: 'cover',
                imagem_scale: 1,
                imagem_offset_x: 50,
                imagem_offset_y: 50,
                imagem_height_pct: 38,
              })
            }
            className="text-[10px] text-gray-500 hover:text-gray-800 underline"
            title="Voltar aos valores padrão"
          >
            Resetar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 mb-1">
          {([
            { value: 'cover', label: 'Preencher' },
            { value: 'contain', label: 'Mostrar inteira' },
          ] as const).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setEstilo({ imagem_fit: o.value })}
              className={`px-2 py-1.5 text-xs rounded border ${
                (slide.estilo.imagem_fit ?? 'cover') === o.value
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {slide.estilo.imagem_fit === 'contain' && (
          <p className="text-[10px] text-amber-600 mb-2 leading-snug">
            ⚠ Em &quot;Mostrar inteira&quot;, a foto inteira aparece com bordas. Drag e zoom têm efeito
            limitado. Use &quot;Preencher&quot; pra mover livremente.
          </p>
        )}
        {(slide.estilo.imagem_fit ?? 'cover') === 'cover' && <div className="mb-2" />}

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-gray-600">Altura do frame</label>
            <span className="text-[11px] font-mono text-gray-500">
              {(slide.estilo.imagem_height_pct ?? 38).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={70}
            step={1}
            value={slide.estilo.imagem_height_pct ?? 38}
            onChange={(e) => setEstilo({ imagem_height_pct: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Foto pequena</span>
            <span>Foto grande</span>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-gray-600">Zoom</label>
            <span className="text-[11px] font-mono text-gray-500">
              {((slide.estilo.imagem_scale ?? 1) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setEstilo({
                  imagem_scale: Math.max(0.3, Math.round(((slide.estilo.imagem_scale ?? 1) - 0.1) * 100) / 100),
                })
              }
              className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
              aria-label="Diminuir zoom"
            >
              −
            </button>
            <input
              type="range"
              min={0.3}
              max={4}
              step={0.05}
              value={slide.estilo.imagem_scale ?? 1}
              onChange={(e) => setEstilo({ imagem_scale: Number(e.target.value) })}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() =>
                setEstilo({
                  imagem_scale: Math.min(4, Math.round(((slide.estilo.imagem_scale ?? 1) + 0.1) * 100) / 100),
                })
              }
              className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
              aria-label="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-gray-600">Horizontal</label>
            <span className="text-[11px] font-mono text-gray-500">
              {(slide.estilo.imagem_offset_x ?? 50).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={slide.estilo.imagem_offset_x ?? 50}
            onChange={(e) => setEstilo({ imagem_offset_x: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-gray-600">Vertical</label>
            <span className="text-[11px] font-mono text-gray-500">
              {(slide.estilo.imagem_offset_y ?? 50).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={slide.estilo.imagem_offset_y ?? 50}
            onChange={(e) => setEstilo({ imagem_offset_y: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Topo</span>
            <span>Centro</span>
            <span>Base</span>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 leading-snug">
          <strong>No canvas:</strong> arraste pra mover, scroll do mouse pra zoom, e arraste a borda
          superior da imagem pra redimensionar o frame.
        </p>
      </div>

      <ImageUploader slideId={slide.id} currentUrl={slide.imagem_url} sugestao={slide.sugestao_imagem} />

      <div className="border-t border-gray-200 pt-4 -mx-4 px-4">
        <LegendaPanel />
      </div>
    </aside>
  );
}
