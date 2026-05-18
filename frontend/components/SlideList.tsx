'use client';

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCarrosselStore } from '@/lib/store';
import SlideCanvas from './SlideCanvas';
import type { Slide } from '@/lib/types';

function SortableThumb({ slide, index, selected, onSelect, onDuplicate, onDelete }: {
  slide: Slide;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <button
        onClick={onSelect}
        className={`w-full rounded-lg overflow-hidden border-2 transition ${
          selected ? 'border-red-600' : 'border-gray-200 hover:border-gray-300'
        }`}
        type="button"
      >
        <div className="bg-white relative" style={{ aspectRatio: '1080/1350' }}>
          <div className="absolute inset-0">
            <SlideCanvas slide={slide} scale={140 / 1080} />
          </div>
        </div>
      </button>
      <div className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1.5 py-0.5">
        {index + 1}
      </div>
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1.5 py-0.5 cursor-grab opacity-0 group-hover:opacity-100"
        type="button"
        aria-label="Arrastar"
      >
        ⋮⋮
      </button>
      <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100">
        <button
          onClick={onDuplicate}
          type="button"
          className="bg-black/60 text-white text-xs rounded px-1.5 py-0.5"
          aria-label="Duplicar"
        >
          +
        </button>
        <button
          onClick={onDelete}
          type="button"
          className="bg-black/60 text-white text-xs rounded px-1.5 py-0.5"
          aria-label="Deletar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function SlideList() {
  const carrossel = useCarrosselStore((s) => s.carrossel);
  const selectedId = useCarrosselStore((s) => s.selectedSlideId);
  const selectSlide = useCarrosselStore((s) => s.selectSlide);
  const reorderSlides = useCarrosselStore((s) => s.reorderSlides);
  const duplicateSlide = useCarrosselStore((s) => s.duplicateSlide);
  const deleteSlide = useCarrosselStore((s) => s.deleteSlide);
  const addSlide = useCarrosselStore((s) => s.addSlide);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!carrossel) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = carrossel.slides.findIndex((s) => s.id === active.id);
    const newIndex = carrossel.slides.findIndex((s) => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) reorderSlides(oldIndex, newIndex);
  };

  return (
    <aside className="w-48 border-r border-gray-200 bg-white p-3 flex flex-col gap-3 overflow-y-auto">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slides</h2>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={carrossel.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {carrossel.slides.map((slide, i) => (
              <SortableThumb
                key={slide.id}
                slide={slide}
                index={i}
                selected={slide.id === selectedId}
                onSelect={() => selectSlide(slide.id)}
                onDuplicate={() => duplicateSlide(slide.id)}
                onDelete={() => deleteSlide(slide.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        onClick={addSlide}
        type="button"
        className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
      >
        + Adicionar slide
      </button>
    </aside>
  );
}
