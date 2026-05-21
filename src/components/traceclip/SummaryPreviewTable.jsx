export function SummaryPreviewTable({ rows }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-950">Summary preview</h2>
        <p className="text-sm leading-6 text-slate-500">
          Hotspot rows from the summary sidecar appear here when available.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Interaction</span>
          <span>Start at (ms)</span>
          <span>Self time (ms)</span>
          <span>Total (ms)</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">No summary preview available for this slice yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {rows.map((row, index) => (
              <div
                key={`${row.interactionEvent || row.functionName}-${row.startTime}-${index}`}
                className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-4 px-4 py-4 text-sm text-slate-700"
              >
                <span className="truncate font-medium text-slate-900">
                  {row.interactionEvent || row.functionName || "—"}
                </span>
                <span>{row.startTime ?? "—"}</span>
                <span>{row.selfTime ?? "—"}</span>
                <span>{row.totalDuration ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
