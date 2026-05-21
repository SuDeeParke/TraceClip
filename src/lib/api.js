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
