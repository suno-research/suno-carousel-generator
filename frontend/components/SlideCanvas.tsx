'use client';

import { CSSProperties, forwardRef, ReactNode, useEffect, useRef } from 'react';
import type { Slide } from '@/lib/types';
import { DEFAULT_BODY_FONT_SIZE, SLIDE_DIMENSIONS, SUNO_HEADER, SUNO_TOKENS } from '@/lib/brand-suno';

interface Props {
  slide: Slide;
  scale?: number;
  /** Quando true, o corpo fica editável inline + imagem fica draggable. */
  editable?: boolean;
  /** Callback quando o usuário edita o texto. Recebe o markdown puro. */
  onCorpoChange?: (markdown: string) => void;
  /** Callback quando o usuário arrasta a imagem. Recebe novo {offset_x, offset_y} em %. */
  onImageDrag?: (offsetX: number, offsetY: number) => void;
  /** Callback quando o usuário usa scroll wheel pra dar zoom. Recebe o novo scale absoluto. */
  onImageZoom?: (scale: number) => void;
  /** Callback quando o usuário arrasta a borda superior da imagem pra redimensionar o frame. */
  onImageResize?: (heightPct: number) => void;
}

/** Renderiza markdown bold (`**palavra**`) inline em React nodes. Usado quando NÃO editable. */
function renderRichText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <strong key={`b${key++}`} style={{ fontWeight: 700 }}>
        {match[1]}
      </strong>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Converte texto com markdown bold pra HTML que o contenteditable renderiza. */
function markdownToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const withBold = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return withBold.replace(/\n/g, '<br>');
}

/** Converte HTML do contenteditable de volta pra markdown. */
function htmlToMarkdown(html: string): string {
  let t = html;
  // strong/b → **
  t = t.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  t = t.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  // br → \n
  t = t.replace(/<br\s*\/?>/gi, '\n');
  // p/div abertura vira \n (separador), fechamento some
  t = t.replace(/<(p|div)[^>]*>/gi, '\n');
  t = t.replace(/<\/(p|div)>/gi, '');
  // remove restantes
  t = t.replace(/<[^>]+>/g, '');
  // decodifica entidades comuns
  t = t.replace(/&nbsp;/g, ' ');
  t = t.replace(/&amp;/g, '&');
  t = t.replace(/&lt;/g, '<');
  t = t.replace(/&gt;/g, '>');
  t = t.replace(/&quot;/g, '"');
  // colapsa múltiplas \n em no máximo 2
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.replace(/^\n+|\n+$/g, '');
}

interface EditableCorpoProps {
  slide: Slide;
  fontSize: number;
  align: 'left' | 'center';
  onChange: (markdown: string) => void;
}

/** contenteditable controlado: só re-monta innerHTML quando o slide muda (não enquanto edita). */
function EditableCorpo({ slide, fontSize, align, onChange }: EditableCorpoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastSlideId = useRef<string>('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Quando troca de slide, força reset do HTML
    if (lastSlideId.current !== slide.id) {
      lastSlideId.current = slide.id;
      el.innerHTML = markdownToHtml(slide.corpo || '');
      return;
    }
    // Quando o corpo muda EXTERNAMENTE (ex: textarea no painel direito),
    // só atualiza se este element NÃO estiver focado (não interrompe edição).
    if (document.activeElement === el) return;
    const currentMarkdown = htmlToMarkdown(el.innerHTML);
    if (currentMarkdown !== (slide.corpo || '')) {
      el.innerHTML = markdownToHtml(slide.corpo || '');
    }
  }, [slide.id, slide.corpo]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(htmlToMarkdown(e.currentTarget.innerHTML))}
      style={{
        fontSize,
        fontWeight: 400,
        lineHeight: 1.35,
        textAlign: align,
        outline: 'none',
        cursor: 'text',
        minHeight: 80,
      }}
    />
  );
}

const SlideCanvas = forwardRef<HTMLDivElement, Props>(function SlideCanvas(
  { slide, scale = 1, editable = false, onCorpoChange, onImageDrag, onImageZoom, onImageResize },
  ref
) {
  // Drag de imagem: trackeia início do drag e valores base
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    rect: DOMRect;
  } | null>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !onImageDrag || !imageBoxRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: slide.estilo.imagem_offset_x ?? 50,
      baseY: slide.estilo.imagem_offset_y ?? 50,
      rect: imageBoxRef.current.getBoundingClientRect(),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || !onImageDrag) return;
    // Arrastar pra direita/baixo = mostrar parte ESQUERDA/CIMA da imagem.
    // Ou seja, ao puxar a imagem, o object-position diminui.
    const dxPct = ((e.clientX - d.startX) / d.rect.width) * 100;
    const dyPct = ((e.clientY - d.startY) / d.rect.height) * 100;
    const nextX = Math.max(0, Math.min(100, d.baseX - dxPct));
    const nextY = Math.max(0, Math.min(100, d.baseY - dyPct));
    onImageDrag(nextX, nextY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  };

  // Wheel scroll = zoom in/out na imagem (igual Canva/Figma).
  // preventDefault no native handler pra não scrollar a página.
  const handleWheel = (e: WheelEvent) => {
    if (!editable || !onImageZoom) return;
    e.preventDefault();
    const current = slide.estilo.imagem_scale ?? 1;
    // Multiplicador suave: deltaY positivo = zoom out, negativo = zoom in
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const next = Math.max(0.3, Math.min(4, current * factor));
    onImageZoom(Math.round(next * 100) / 100);
  };

  // Anexa wheel via addEventListener com passive:false (React onWheel é passive por default)
  useEffect(() => {
    const el = imageBoxRef.current;
    if (!el || !editable || !onImageZoom) return;
    const handler = (ev: WheelEvent) => handleWheel(ev);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, slide.estilo.imagem_scale, onImageZoom]);

  // Resize handle: drag na borda superior da imagem pra mudar a altura do frame
  const resizeRef = useRef<{ startY: number; baseHeightPct: number } | null>(null);

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !onImageResize) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      startY: e.clientY,
      baseHeightPct: imageHeightPct,
    };
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current || !onImageResize) return;
    // Calcula delta em % do slide. Arrastar pra cima (deltaY negativo) = aumentar imagem.
    const canvasEl = imageBoxRef.current?.parentElement;
    if (!canvasEl) return;
    const canvasRect = canvasEl.getBoundingClientRect();
    const dyPct = ((e.clientY - resizeRef.current.startY) / canvasRect.height) * 100;
    const next = Math.max(10, Math.min(70, resizeRef.current.baseHeightPct - dyPct));
    onImageResize(Math.round(next * 10) / 10);
  };

  const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      resizeRef.current = null;
    }
  };
  const { width, height } = SLIDE_DIMENSIONS;
  const { estilo } = slide;
  const hasImage = !!slide.imagem_url;
  // Layout com position absolute. GAP fixo de 50px entre body e imagem garante
  // respiro físico (a última linha do texto NUNCA encosta na imagem, no preview ou no PNG).
  const HEADER_H = 240;
  const GAP_BODY_IMAGE = 50;
  const imageHeightPct = slide.estilo.imagem_height_pct ?? 38;
  const IMAGE_H = Math.round(height * (imageHeightPct / 100));
  const BODY_H = height - HEADER_H - IMAGE_H - GAP_BODY_IMAGE;
  const IMAGE_TOP = HEADER_H + BODY_H + GAP_BODY_IMAGE;
  // Capa tem fonte maior por padrão pra ficar impactante
  const isCapa = slide.layout === 'capa';
  const baseFontSize = estilo.font_size ?? DEFAULT_BODY_FONT_SIZE;
  const fontSize = isCapa ? Math.round(baseFontSize * 1.18) : baseFontSize;

  const containerStyle: CSSProperties = {
    width,
    height,
    backgroundColor: estilo.bg_color,
    color: estilo.text_color,
    fontFamily: `"${estilo.font_family}", ${SUNO_TOKENS.fontStack}`,
    fontWeight: 400,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    position: 'relative',
    overflow: 'hidden',
  };

  const wrapperStyle: CSSProperties = {
    width: width * scale,
    height: height * scale,
    flexShrink: 0,
  };

  return (
    <div style={wrapperStyle}>
      <div ref={ref} style={containerStyle} data-slide-canvas>
        {/* Header — absolute, altura física fixa */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: HEADER_H,
            display: 'flex',
            alignItems: 'center',
            padding: '80px 80px 40px 80px',
            gap: 24,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: '50%',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/suno-logo.svg" alt="Suno" style={{ width: 96, height: 'auto', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1 }}>
              <span style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{SUNO_HEADER.nome}</span>
              <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
                <path
                  fill={SUNO_TOKENS.verified}
                  d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
                />
              </svg>
            </div>
            <span style={{ fontSize: 28, color: SUNO_TOKENS.handle, lineHeight: 1 }}>{SUNO_HEADER.handle}</span>
          </div>
        </div>

        {/* Body — absolute com top/height fixos. CORTE FÍSICO garantido por clipping rect.
            Padding bottom 20px é só ar interno; o respiro maior vem do GAP entre body e imagem. */}
        <div
          style={{
            position: 'absolute',
            top: HEADER_H,
            left: 0,
            right: 0,
            height: BODY_H,
            overflow: 'hidden',
            padding: '0 80px 20px 80px',
            boxSizing: 'border-box',
          }}
        >
          {editable && onCorpoChange ? (
            <EditableCorpo slide={slide} fontSize={fontSize} align={estilo.align} onChange={onCorpoChange} />
          ) : (
            slide.corpo && (
              <div
                style={{
                  fontSize,
                  fontWeight: 400,
                  lineHeight: 1.35,
                  whiteSpace: 'pre-wrap',
                  textAlign: estilo.align,
                }}
              >
                {renderRichText(slide.corpo)}
              </div>
            )
          )}
        </div>

        {/* Handle pra redimensionar a altura da imagem — barra fina na borda superior */}
        {hasImage && editable && onImageResize && (
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{
              position: 'absolute',
              top: IMAGE_TOP - 8,
              left: 0,
              right: 0,
              height: 16,
              cursor: 'ns-resize',
              zIndex: 10,
              touchAction: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 80,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#1D9BF0',
                opacity: 0,
                transition: 'opacity 0.15s',
              }}
              className="resize-handle-bar"
            />
          </div>
        )}

        {/* Imagem — absolute, draggable (Canva-style). Hover mostra borda dashed = "modo edit". */}
        {hasImage && (
          <div
            ref={imageBoxRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={editable && onImageDrag ? 'group/img' : ''}
            style={{
              position: 'absolute',
              top: IMAGE_TOP,
              left: 0,
              right: 0,
              height: IMAGE_H,
              backgroundColor: estilo.bg_color,
              overflow: 'hidden',
              touchAction: editable && onImageDrag ? 'none' : 'auto',
              cursor: editable && onImageDrag ? (dragRef.current ? 'grabbing' : 'grab') : 'default',
              outline: editable && onImageDrag ? '0px dashed transparent' : 'none',
              outlineOffset: '-4px',
              transition: 'outline-color 0.15s, outline-width 0.15s',
            }}
            onMouseEnter={(e) => {
              if (editable && onImageDrag) (e.currentTarget as HTMLElement).style.outline = '3px dashed #1D9BF0';
            }}
            onMouseLeave={(e) => {
              if (editable && onImageDrag) (e.currentTarget as HTMLElement).style.outline = '0px dashed transparent';
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imagem_url || ''}
              alt=""
              crossOrigin="anonymous"
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: estilo.imagem_fit ?? 'cover',
                objectPosition: `${estilo.imagem_offset_x ?? 50}% ${estilo.imagem_offset_y ?? 50}%`,
                transform: `scale(${estilo.imagem_scale ?? 1})`,
                transformOrigin: 'center',
                display: 'block',
                pointerEvents: 'none', // pointer events ficam no container pra drag funcionar
                userSelect: 'none',
              }}
            />
          </div>
        )}
        {!hasImage && slide.sugestao_imagem && (
          <div
            style={{
              position: 'absolute',
              top: IMAGE_TOP,
              left: 0,
              right: 0,
              height: IMAGE_H,
              backgroundColor: '#F2F3F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
              textAlign: 'center',
              color: SUNO_TOKENS.handle,
              fontSize: 26,
              fontStyle: 'italic',
              boxSizing: 'border-box',
            }}
          >
            Sugestão: {slide.sugestao_imagem}
          </div>
        )}
      </div>
    </div>
  );
});

export default SlideCanvas;
