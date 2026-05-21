export function ResultSummaryCard({ title, description, metrics, details, downloads, error }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Start at</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{details.start}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">End at</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{details.end}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Duration</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{details.duration}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {downloads.trace ? (
          <a
            href={downloads.trace.href}
            download={downloads.trace.name}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"
          >
            Download sliced trace
          </a>
        ) : null}

        {downloads.summary ? (
          <a
            href={downloads.summary.href}
            download={downloads.summary.name}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800"
          >
            Download summary
          </a>
        ) : null}
      </div>
    </section>
  );
}
