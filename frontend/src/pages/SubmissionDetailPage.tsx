import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { fileDownloadUrl, type SubmissionItem } from '../lib/api';
import { useSubmission } from '../queries/submissions';

/**
 * A single response. The API returns one item per form question (in order), each
 * with the question label/type, the answer value (or null), and file metadata for
 * file answers. We render each as a label + formatted value.
 */
export function SubmissionDetailPage() {
  const { id = '', sid = '' } = useParams();
  const { data, isLoading, isError } = useSubmission(sid);

  return (
    <AppLayout>
      <Link to={`/forms/${id}/submissions`} className="text-sm text-indigo-600 hover:underline">
        ← Back to responses
      </Link>

      {isLoading && <p className="mt-4 text-slate-500">Loading…</p>}
      {isError && <p className="mt-4 text-red-700">Couldn't load this response.</p>}

      {data && (
        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight">{data.formTitle}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            Submitted {new Date(data.createdAt).toLocaleString()}
          </p>

          <dl className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {data.items.map((item) => (
              <div key={item.questionId} className="border-b border-slate-100 px-4 py-4 last:border-b-0">
                <dt className="text-sm font-medium text-slate-800">{item.label}</dt>
                <dd className="mt-1 text-sm text-slate-600">
                  <AnswerValue item={item} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </AppLayout>
  );
}

/**
 * Renders one answer by type: a download link for files, a comma-joined list for
 * multiple-choice, plain text otherwise, and a muted "Not answered" for blanks.
 */
function AnswerValue({ item }: { item: SubmissionItem }) {
  if (item.type === 'file') {
    if (!item.file) return <Empty />;
    return (
      <a
        href={fileDownloadUrl(item.file.id)}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-600 hover:underline"
      >
        {item.file.filename} <span className="text-slate-400">({formatBytes(item.file.size)})</span>
      </a>
    );
  }

  if (item.value === null || item.value === undefined) return <Empty />;

  if (Array.isArray(item.value)) {
    if (item.value.length === 0) return <Empty />;
    return <span>{item.value.join(', ')}</span>;
  }

  return <span className="whitespace-pre-wrap">{String(item.value)}</span>;
}

/** Muted placeholder for an unanswered (or empty) question. */
function Empty() {
  return <span className="text-slate-400">Not answered</span>;
}

/** Format a byte count as B / KB / MB for display next to file links. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
