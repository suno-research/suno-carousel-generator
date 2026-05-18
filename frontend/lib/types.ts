export type SlideLayout = 'capa' | 'dado' | 'texto' | 'cta';

export interface SlideEstilo {
  bg_color: string;
  text_color: string;
  accent_color: string;
  font_family: string;
  align: 'left' | 'center';
  font_size?: number;
  imagem_fit?: 'cover' | 'contain';
  /** Zoom da imagem, 1 = normal, > 1 amplia, < 1 reduz. Range típico 0.3-4. */
  imagem_scale?: number;
  /** Posição horizontal em % (0 = esquerda, 50 = centro, 100 = direita). */
  imagem_offset_x?: number;
  /** Posição vertical em % (0 = topo, 50 = centro, 100 = base). */
  imagem_offset_y?: number;
  /** Altura do frame da imagem em % do slide (10-70). Default 38. */
  imagem_height_pct?: number;
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  titulo?: string | null;
  corpo?: string | null;
  numero?: string | null;
  legenda?: string | null;
  sugestao_imagem?: string | null;
  imagem_url?: string | null;
  estilo: SlideEstilo;
}

export interface Carrossel {
  id: string;
  tema: string;
  fonte_url: string;
  fonte_titulo?: string | null;
  legenda?: string | null;
  slides: Slide[];
  criado_em: string;
}
