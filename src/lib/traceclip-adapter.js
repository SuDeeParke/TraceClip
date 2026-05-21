function formatMetricValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${value}${suffix}`;
}

export function adaptSliceResult(data) {
  return {
    metrics: [
      { label: "Input events", value: formatMetricValue(data.inputEvents) },
      { label: "Output events", value: formatMetricValue(data.outputEvents) },
      { label: "Detected unit", value: formatMetricValue(data.detectedTraceUnit) },
    ],
    details: {
      start: formatMetricValue(data.start, " ms"),
      end: formatMetricValue(data.end, " ms"),
      duration: formatMetricValue(data.duration, " ms"),
    },
    downloads: {
      trace: data.downloadUrl ? { href: data.downloadUrl, name: data.outputFile || "slice.json" } : null,
      summary: data.summaryUrl
        ? { href: data.summaryUrl, name: data.summaryFile || "slice.summary.json" }
        : null,
    },
    summaryRows: Array.isArray(data.summaryPreview) ? data.summaryPreview : [],
  };
}
