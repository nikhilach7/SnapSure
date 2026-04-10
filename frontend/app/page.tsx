"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type PredictionResponse = {
  overall_label?: "REAL" | "FAKE";
  overall_confidence?: number;
  fake_score?: number;
  num_faces?: number;
  faces?: any[];
  error?: string;
  details?: string;
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filename = useMemo(() => file?.name ?? "No file selected", [file]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Please upload an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as PredictionResponse;

      if (!response.ok) {
        setError(payload.error ?? "Prediction failed.");
        return;
      }

      setResult(payload);
    } catch {
      setError("Unable to connect to backend service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-12 pb-10">
      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <article className="flow-panel-strong rounded-4xl border-2 border-blue-300/35 p-6 lg:sticky lg:top-28">
          <p className="hero-kicker">Main Action</p>
          <h3 className="headline mt-1 text-3xl">Upload and Analyze</h3>
          <p className="copy-muted mt-2 text-sm">JPG, JPEG, PNG, WEBP</p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="line-pill inline-flex w-fit cursor-pointer items-center rounded-full px-4 py-2 text-sm font-semibold" htmlFor="image-input">
              Choose Image
            </label>
            <input
              id="image-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />

            <p className="line-pill-muted truncate rounded-full px-4 py-2 text-sm">
              {filename}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="cta-primary w-fit rounded-full px-5 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Analyzing..." : "Analyze Image"}
            </button>
          </form>

          {error && <p className="error-note mt-4 rounded-xl px-3 py-2 text-sm">{error}</p>}

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <Link href="/architecture" className="line-pill-muted rounded-full px-3 py-1.5">
              Architecture
            </Link>
            <Link href="/playbook" className="line-pill-muted rounded-full px-3 py-1.5">
              Playbook
            </Link>
          </div>
        </article>

        <article className="result-surface rounded-4xl border-2 border-cyan-300/35 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="hero-kicker">Result</p>
            <span className="copy-muted text-xs">Realtime</span>
          </div>

          {!result?.overall_label && !error && (
            <div className="copy-muted mt-8 text-lg">No prediction yet. Upload an image and run analysis.</div>
          )}

          {result?.overall_label && (
            <div className={`mt-8 rounded-2xl px-5 py-6 ${result.overall_label === "FAKE" ? "verdict-fake" : "verdict-real"}`}>
              <h2 className="headline text-5xl leading-none">{result.overall_label}</h2>
              {typeof result.overall_confidence === "number" && <p className="mt-3 text-base font-medium">Confidence: {(result.overall_confidence * 100).toFixed(2)}%</p>}
            </div>
          )}

          <div className="copy-muted mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <p>Model 1: ViT Deepfake Detection</p>
            <p>Model 2: Deepfake vs Real Image</p>
          </div>
        </article>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <article>
          <p className="hero-kicker">Why SnapSure</p>
          <h3 className="headline mt-2 text-3xl">Fast verdicts without UI noise.</h3>
          <p className="copy-muted mt-4 max-w-3xl text-sm leading-relaxed sm:text-base">
            Artifact-focused inference, confidence scoring, and a simple response contract built for trust and moderation teams.
          </p>
        </article>

        <aside className="flow-panel rounded-[1.8rem] p-5 lg:translate-y-7">
          <p className="hero-kicker">Reminder</p>
          <p className="copy-muted mt-3 text-sm leading-relaxed">Use model output as decision support, and keep human review loops for high-impact actions.</p>
        </aside>
      </section>
    </div>
  );
}
