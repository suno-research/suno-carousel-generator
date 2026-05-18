'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Carrossel, Slide } from './types';
import { SUNO_DEFAULT_ESTILO } from './brand-suno';

interface State {
  carrossel: Carrossel | null;
  selectedSlideId: string | null;
  setCarrossel: (c: Carrossel) => void;
  selectSlide: (id: string | null) => void;
  updateSlide: (id: string, patch: Partial<Slide>) => void;
  reorderSlides: (oldIndex: number, newIndex: number) => void;
  duplicateSlide: (id: string) => void;
  deleteSlide: (id: string) => void;
  addSlide: () => void;
  setImage: (id: string, dataUrl: string) => void;
  clearImage: (id: string) => void;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const useCarrosselStore = create<State>()(
  persist(
    (set, get) => ({
      carrossel: null,
      selectedSlideId: null,

      setCarrossel: (c) => set({ carrossel: c, selectedSlideId: c.slides[0]?.id ?? null }),

      selectSlide: (id) => set({ selectedSlideId: id }),

      updateSlide: (id, patch) =>
        set((state) => {
          if (!state.carrossel) return state;
          return {
            carrossel: {
              ...state.carrossel,
              slides: state.carrossel.slides.map((s) =>
                s.id === id ? { ...s, ...patch, estilo: { ...s.estilo, ...(patch.estilo ?? {}) } } : s
              ),
            },
          };
        }),

      reorderSlides: (oldIndex, newIndex) =>
        set((state) => {
          if (!state.carrossel) return state;
          return {
            carrossel: { ...state.carrossel, slides: move(state.carrossel.slides, oldIndex, newIndex) },
          };
        }),

      duplicateSlide: (id) =>
        set((state) => {
          if (!state.carrossel) return state;
          const idx = state.carrossel.slides.findIndex((s) => s.id === id);
          if (idx === -1) return state;
          const original = state.carrossel.slides[idx];
          const copy: Slide = { ...original, id: `slide-${Date.now()}` };
          const next = [...state.carrossel.slides];
          next.splice(idx + 1, 0, copy);
          return { carrossel: { ...state.carrossel, slides: next }, selectedSlideId: copy.id };
        }),

      deleteSlide: (id) =>
        set((state) => {
          if (!state.carrossel) return state;
          const slides = state.carrossel.slides.filter((s) => s.id !== id);
          if (slides.length === 0) return state;
          const wasSelected = state.selectedSlideId === id;
          return {
            carrossel: { ...state.carrossel, slides },
            selectedSlideId: wasSelected ? slides[0].id : state.selectedSlideId,
          };
        }),

      addSlide: () =>
        set((state) => {
          if (!state.carrossel) return state;
          const novo: Slide = {
            id: `slide-${Date.now()}`,
            layout: 'texto',
            titulo: null,
            corpo: 'Novo slide. Edite este texto.',
            estilo: { ...SUNO_DEFAULT_ESTILO },
          };
          return {
            carrossel: { ...state.carrossel, slides: [...state.carrossel.slides, novo] },
            selectedSlideId: novo.id,
          };
        }),

      setImage: (id, dataUrl) => get().updateSlide(id, { imagem_url: dataUrl }),
      clearImage: (id) => get().updateSlide(id, { imagem_url: null }),
    }),
    {
      name: 'suno-carrossel',
      partialize: (state) => ({ carrossel: state.carrossel, selectedSlideId: state.selectedSlideId }),
    }
  )
);
