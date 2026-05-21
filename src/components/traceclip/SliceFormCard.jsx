import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { requestTraceMetadata } from "@/lib/api";

const initialFields = {
  file: null,
  start: "",
  end: "",
  cat: [],
  name: [],
};

const emptyMetadata = {
  traceRangeMs: null,
  builtInCategories: [],
  builtInNames: [],
  categories: [],
  names: [],
};

function validateFields(fields) {
  if (!fields.file) {
    return "Trace file is required";
  }

  if (fields.start === "" || Number.isNaN(Number(fields.start))) {
    return "Start at must be a number";
  }

  if (fields.end === "" || Number.isNaN(Number(fields.end))) {
    return "End at must be a number";
  }

  const start = Number(fields.start);
  const end = Number(fields.end);

  if (start < 0) {
    return "Start at must be 0 ms or greater";
  }

  if (end <= start) {
    return "End at must be greater than Start at";
  }

  return null;
}

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${value} ms`;
}

function toggleSelection(values, nextValue) {
  if (values.includes(nextValue)) {
    return values.filter((value) => value !== nextValue);
  }

  return [...values, nextValue];
}

function FilterMultiSelect({ label, options, values, onToggle }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-800">{label}</label>
        <span className="text-xs text-slate-400">Optional</span>
      </div>
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {options.length ? (
          options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-white"
            >
              <input
                type="checkbox"
                checked={values.includes(option)}
                onChange={() => onToggle(option)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span className="min-w-0 break-all">{option}</span>
            </label>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-slate-400">Upload a trace to load options.</p>
        )}
      </div>
    </div>
  );
}

export function SliceFormCard({ onSubmit, isSubmitting }) {
  const [fields, setFields] = useState(initialFields);
  const [metadata, setMetadata] = useState(emptyMetadata);
  const [error, setError] = useState("");
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set([...metadata.builtInCategories, ...metadata.categories]));
  }, [metadata]);

  const nameOptions = useMemo(() => {
    return Array.from(new Set([...metadata.builtInNames, ...metadata.names]));
  }, [metadata]);

  const validationError = useMemo(() => validateFields(fields), [fields]);
  const canSubmit = !isSubmitting && !isLoadingMetadata && !validationError;

  function updateField(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function handleToggle(name, value) {
    setFields((current) => ({
      ...current,
      [name]: toggleSelection(current[name], value),
    }));
    setError("");
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setFields({ ...initialFields, file });
    setMetadata(emptyMetadata);
    setError("");

    if (!file) {
      return;
    }

    setIsLoadingMetadata(true);
    try {
      const nextMetadata = await requestTraceMetadata(file);
      setMetadata(nextMetadata || emptyMetadata);
    } catch (metadataError) {
      setError(metadataError.message || "Trace metadata request failed");
    } finally {
      setIsLoadingMetadata(false);
    }
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
    formData.set("end", fields.end);
    if (fields.cat.length) formData.set("cat", fields.cat.join(","));
    if (fields.name.length) formData.set("name", fields.name.join(","));

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
            Upload a Chrome Performance export and define a time range relative to trace start.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="file">
            Trace file *
          </label>
          <input
            id="file"
            type="file"
            accept=".json"
            className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            onChange={handleFileChange}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Trace range:</span>{" "}
          {isLoadingMetadata ? "Loading…" : `0 ms – ${formatMs(metadata.traceRangeMs)}`}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="start">
              Start at (ms) *
            </label>
            <input
              id="start"
              value={fields.start}
              onChange={(event) => updateField("start", event.target.value)}
              placeholder="0"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="end">
              End at (ms) *
            </label>
            <input
              id="end"
              value={fields.end}
              onChange={(event) => updateField("end", event.target.value)}
              placeholder="16.666"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-0"
            />
          </div>
        </div>

        <FilterMultiSelect
          label="Category filter"
          options={categoryOptions}
          values={fields.cat}
          onToggle={(value) => handleToggle("cat", value)}
        />

        <FilterMultiSelect
          label="Name filter"
          options={nameOptions}
          values={fields.name}
          onToggle={(value) => handleToggle("name", value)}
        />

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
          {isSubmitting ? "Slicing trace..." : isLoadingMetadata ? "Loading trace..." : "Slice trace"}
        </button>
      </form>
    </section>
  );
}
