import type { Form } from '@alsun/schemas';

/** Small pill showing a form's draft/published status (green when published). */
export function StatusBadge({ status }: { status: Form['status'] }) {
  const styles =
    status === 'published'
      ? 'bg-green-50 text-green-700 ring-green-600/20'
      : 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles}`}
    >
      {status}
    </span>
  );
}
