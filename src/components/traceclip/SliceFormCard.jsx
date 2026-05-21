import { useMemo, useState } from "react";
import { Upload } from "lucide-react";

const initialFields = {
  file: null,
  start: "",
  end: "",
  duration: "",
  cat: "",
  name: "",
};

function validateFields(fields) {
  if (!fields.file) {
    return "Trace file is required";
  }

  if (!fields.start || Number.isNaN(Number(fields.start))) {
    return "Start timestamp is required and must be a number";
  }

  if (!fields.end && !fields.duration) {
    return "End timestamp or Duration is required";
  }

  if (fields.end && Number.isNaN(Number(fields.end))) {
    return "End timestamp must be a number";
  }

  if (fields.duration && Number.isNaN(Number(fields.duration))) {
    return "Duration must be a number";
  }

  return null;
}

export function SliceFormCard({ onSubmit, isSubmitting }) {
  const [fields, setFields] = useState(initialFields);
  const [error, setError] = useState("");

  const validationError = useMemo(() => validateFields(fields), [fields]);
  const canSubmit = !isSubmitting && !validationError;

  function updateField(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextError = validateFields(fields);
    if (nextError) {
      setError(nextError);
      return;
    }

    const formData = new FormData();
    formData.set("file", fields.file);
    formData.set("start", fields.start);
    if (fields.end) formData.set("end", fields.end);
    if (fields.duration) formData.set("duration", fields.duration);
    if (fields.cat) formData.set("cat", fields.cat);
    if (fields.name) formData.set("name", fields.name);

    try {
      await onSubmit(formData);
      setError("");
    } catch (submitError) {
      setError(submitError.message || "Slice request failed");
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Slice configuration</h2>
          <p className="text-sm text-slate-500">
            Upload a Chrome Performance export and define the slice window in milliseconds.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="file">
            Trace file
          </label>
          <input
            id="file"
            type="file"
            accept=".json"
            className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            onChange={(event) => updateField("file", event.target.files?.[0] || null)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="start">
              Start time
            </label>
            <input
              id="start"
              value={fields.start}
              onChange={(event) => updateField("start", event.target.value)}
              placeholder="200411298.877"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="end">
              End time
            </label>
            <input
              id="end"
              value={fields.end}
              onChange={(event) => updateField("end", event.target.value)}
              placeholder="200411872.732"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="duration">
              Duration
            </label>
            <input
              id="duration"
              value={fields.duration}
              onChange={(event) => updateField("duration", event.target.value)}
              placeholder="573.855"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="cat">
              Category filter
            </label>
            <input
              id="cat"
              value={fields.cat}
              onChange={(event) => updateField("cat", event.target.value)}
              placeholder="devtools.timeline,v8"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="name">
            Name filter
          </label>
          <input
            id="name"
            value={fields.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="EvaluateScript,RunTask"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!error && validationError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {validationError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Slicing trace..." : "Slice trace"}
        </button>
      </form>
    </section>
  );
}
