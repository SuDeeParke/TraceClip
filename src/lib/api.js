export async function requestTraceMetadata(file) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/trace-metadata", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Trace metadata request failed");
  }

  return data.metadata || null;
}

export async function submitSlice(formData) {
  const response = await fetch("/api/slice", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Slice request failed");
  }

  return data;
}
