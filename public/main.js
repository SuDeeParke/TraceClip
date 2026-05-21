document.getElementById("slice-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const errorArea = document.getElementById("error-area");
  const resultArea = document.getElementById("result-area");
  const resultStats = document.getElementById("result-stats");
  const downloadLink = document.getElementById("download-link");
  const summaryLink = document.getElementById("summary-link");
  const submitBtn = document.getElementById("submit-btn");

  errorArea.style.display = "none";
  resultArea.style.display = "none";
  downloadLink.style.display = "none";
  summaryLink.style.display = "none";

  const formData = new FormData(e.target);

  const startVal = formData.get("start");
  if (!startVal || isNaN(Number(startVal))) {
    showError("Start timestamp is required and must be a number");
    return;
  }

  const endVal = formData.get("end");
  const durVal = formData.get("duration");
  if (!endVal && !durVal) {
    showError("End timestamp or Duration is required");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Slicing...";

  try {
    const resp = await fetch("/api/slice", { method: "POST", body: formData });
    const data = await resp.json();

    if (!data.ok) {
      showError(data.error || "Unknown error");
      return;
    }

    resultStats.textContent =
      `Input events:       ${data.inputEvents}\n` +
      `Output events:      ${data.outputEvents}\n` +
      `Start:              ${data.start} ms\n` +
      `End:                ${data.end} ms\n` +
      `Duration:           ${data.duration} ms\n` +
      `Detected trace unit:${data.detectedTraceUnit}`;
    resultArea.style.display = "block";

    if (data.downloadUrl) {
      downloadLink.href = data.downloadUrl;
      downloadLink.download = data.outputFile;
      downloadLink.style.display = "inline-block";
    }

    if (data.summaryUrl) {
      summaryLink.href = data.summaryUrl;
      summaryLink.download = data.summaryFile;
      summaryLink.style.display = "inline-block";
    }
  } catch (err) {
    showError("Network error: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Slice";
  }
});

function showError(msg) {
  const errorArea = document.getElementById("error-area");
  errorArea.textContent = msg;
  errorArea.style.display = "block";
}
