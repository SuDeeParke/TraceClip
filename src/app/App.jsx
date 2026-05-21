import { useState } from "react";
import { FileJson, Scissors, Sparkles } from "lucide-react";
import { AppShell } from "@/components/traceclip/AppShell";
import { HeroSection } from "@/components/traceclip/HeroSection";
import { SliceFormCard } from "@/components/traceclip/SliceFormCard";
import { ResultSummaryCard } from "@/components/traceclip/ResultSummaryCard";
import { SummaryPreviewTable } from "@/components/traceclip/SummaryPreviewTable";
import { submitSlice } from "@/lib/api";
import { adaptSliceResult } from "@/lib/traceclip-adapter";

const initialViewModel = {
  metrics: [
    { label: "Input events", value: "Ready" },
    { label: "Output events", value: "Pending" },
    { label: "Detected unit", value: "Auto" },
  ],
  details: {
    start: "—",
    end: "—",
    duration: "—",
  },
  downloads: {
    trace: null,
    summary: null,
  },
  summaryRows: [],
};

export default function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(initialViewModel);
  const [resultError, setResultError] = useState("");

  async function handleSubmit(formData) {
    setIsSubmitting(true);
    setResultError("");

    try {
      const response = await submitSlice(formData);
      setResult(adaptSliceResult(response));
    } catch (error) {
      setResultError(error.message || "Slice request failed");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <HeroSection
        badge="Chrome trace slicing demo"
        title="Slice a Chrome performance trace into a focused analysis artifact."
        description="Upload a trace export, define a time window in milliseconds, and download a Chrome-compatible slice plus a compact summary for hotspot inspection."
        highlights={[
          { icon: FileJson, label: "Chrome-compatible output" },
          { icon: Scissors, label: "Single-frame or ranged slicing" },
          { icon: Sparkles, label: "Summary sidecar preview" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SliceFormCard onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        <div className="space-y-6">
          <ResultSummaryCard
            title="Result snapshot"
            description="Live slice metrics and download actions from the existing Express API."
            metrics={result.metrics}
            details={result.details}
            downloads={result.downloads}
            error={resultError}
          />
          <SummaryPreviewTable rows={result.summaryRows} />
        </div>
      </div>
    </AppShell>
  );
}
