import { useEffect, useState } from 'react';
import type { Question, QuestionType } from '@alsun/schemas';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDeleteQuestion, useReorderQuestions } from '../queries/questions';
import { QuestionForm } from './QuestionForm';
import { TYPE_LABEL } from '../lib/questionMeta';

/**
 * The editor's draggable question list. Uses dnd-kit for accessible (pointer +
 * keyboard) drag-to-reorder. Reordering is optimistic: a drag updates a local
 * copy of the list immediately, then persists via the reorder mutation; when the
 * refetched form arrives, the local copy resyncs.
 */
export function QuestionList({ formId, questions }: { formId: string; questions: Question[] }) {
  const reorder = useReorderQuestions(formId);

  // Local copy so a drag updates the UI instantly; resynced when the server data
  // changes (after reorder/add/delete).
  const [items, setItems] = useState(questions);
  useEffect(() => setItems(questions), [questions]);

  // Pointer for mouse/touch; keyboard sensor makes the list operable without a mouse.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (questions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No questions yet. Add your first one below.
      </p>
    );
  }

  // On drop: compute the new order, update the UI optimistically, then persist.
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((q) => q.id === active.id);
    const newIndex = items.findIndex((q) => q.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    reorder.mutate(next.map((q) => q.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((q, i) => (
            <SortableRow key={q.id} formId={formId} question={q} index={i} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/**
 * One row in the sortable list. Shows the question (label, type badge, required
 * flag, and MCQ option chips) with a dedicated drag handle so the Edit/Delete
 * buttons stay clickable. Clicking Edit swaps the row for an inline QuestionForm.
 */
function SortableRow({
  formId,
  question,
  index,
}: {
  formId: string;
  question: Question;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const del = useDeleteQuestion(formId);
  const [editing, setEditing] = useState(false);

  // dnd-kit drives the row's transform/opacity while dragging.
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="rounded-xl border border-slate-200 bg-white p-4">
      {editing ? (
        <QuestionForm formId={formId} question={question} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex items-start gap-3">
          {/* Drag handle — only this element initiates a drag. */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="mt-0.5 cursor-grab touch-none select-none px-1 text-slate-300 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            ⠿
          </button>
          <span className="mt-0.5 w-5 text-sm font-medium text-slate-400">{index + 1}</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{question.label}</span>
              <TypeBadge type={question.type} />
              {question.required && <span className="text-xs text-slate-400">Required</span>}
            </div>
            {/* For MCQ, preview the options as chips. */}
            {question.type === 'multiple_choice' && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {question.config.options.map((o) => (
                  <span key={o} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {o}
                  </span>
                ))}
                {question.config.allowMultiple && (
                  <span className="text-xs text-slate-400">multiple allowed</span>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setEditing(true)} className="text-sm text-slate-500 hover:text-slate-900">
            Edit
          </button>
          <button
            onClick={() => del.mutate(question.id)}
            disabled={del.isPending}
            className="text-sm text-slate-500 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/** Small pill showing the question's type (Text / Multiple choice / File). */
function TypeBadge({ type }: { type: QuestionType }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
      {TYPE_LABEL[type]}
    </span>
  );
}
