/**
 * The "alsun" wordmark with its signature indigo accent dot. `className` lets
 * callers tweak sizing/color in context (header, footer, etc.).
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline text-xl font-bold tracking-tight text-slate-900 ${className}`}
    >
      alsun
      <i className="mb-1 ml-[3px] h-1.5 w-1.5 self-end rounded-full bg-indigo-600" />
    </span>
  );
}
