export function HeroSection({ badge, title, description, highlights }) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/85 p-8 shadow-soft backdrop-blur xl:p-10">
      <div className="max-w-4xl space-y-5">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-600">
          {badge}
        </span>
        <div className="space-y-3">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {highlights.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700"
            >
              <Icon className="h-4 w-4 text-blue-600" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
