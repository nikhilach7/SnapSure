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
    <div className="grid gap-16 pb-10">
      {/* Hero Section */}
      <section className="text-center">
        <p className="hero-kicker mb-4">AI-Powered Deepfake Detection</p>
        <h1 className="headline text-5xl sm:text-7xl lg:text-8xl leading-[1.1] mb-6">
          Detect Deepfakes in Seconds
        </h1>
        <p className="copy-muted max-w-2xl mx-auto text-lg sm:text-xl">
          Enterprise-grade ensemble AI models deliver instant, accurate deepfake detection. Production-ready with Docker, Kubernetes, and Jenkins CI/CD.
        </p>
      </section>

      {/* Analyzer Section */}
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
        <article className="flow-panel-strong rounded-[2rem] border-2 border-blue-300/35 p-8">
          <h2 className="headline text-3xl mb-2">Upload & Analyze</h2>
          <p className="copy-muted mb-6">Supports JPG, JPEG, PNG, WEBP</p>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="cta-primary inline-flex w-fit cursor-pointer items-center rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90" htmlFor="image-input">
              Choose Image
            </label>
            <input
              id="image-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />

            <p className="line-pill-muted truncate rounded-full px-4 py-2 text-sm max-w-md">
              {filename}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="cta-primary w-fit rounded-full px-8 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Analyzing..." : "Analyze Image"}
            </button>
          </form>

          {error && <p className="error-note mt-4 rounded-xl px-4 py-3 text-sm">{error}</p>}
        </article>

        <article className="result-surface rounded-[2rem] border-2 border-cyan-300/35 p-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <p className="hero-kicker">Analysis Result</p>
            <span className="copy-muted text-xs">Real-time</span>
          </div>

          {!result?.overall_label && !error && (
            <div className="copy-muted text-lg py-12">Upload an image to begin analysis</div>
          )}

          {result?.overall_label && (
            <div className={`rounded-2xl px-6 py-8 ${result.overall_label === "FAKE" ? "verdict-fake" : "verdict-real"}`}>
              <h2 className="headline text-6xl leading-none mb-4">{result.overall_label}</h2>
              {typeof result.overall_confidence === "number" && (
                <p className="text-xl font-medium">Confidence: {(result.overall_confidence * 100).toFixed(2)}%</p>
              )}
              {typeof result.fake_score === "number" && (
                <p className="copy-muted mt-2 text-sm">Fake Score: {result.fake_score.toFixed(4)}</p>
              )}
              {typeof result.num_faces === "number" && (
                <p className="copy-muted mt-2 text-sm">Faces Detected: {result.num_faces}</p>
              )}
            </div>
          )}
        </article>
      </section>

      {/* Features Section */}
      <section className="grid gap-8 lg:grid-cols-3">
        <article className="flow-panel rounded-[2rem] p-6">
          <div className="hero-kicker mb-3">Ensemble AI</div>
          <h3 className="headline text-2xl mb-3">Dual Model Accuracy</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Combines ViT and specialized deepfake detectors for superior accuracy. Averages predictions for reliable results.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <div className="hero-kicker mb-3">Lightning Fast</div>
          <h3 className="headline text-2xl mb-3">2-5 Second Analysis</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Optimized inference pipeline delivers real-time results without compromising accuracy. Perfect for high-volume workflows.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <div className="hero-kicker mb-3">Production Ready</div>
          <h3 className="headline text-2xl mb-3">DevOps Native</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Docker, Kubernetes, and Jenkins CI/CD included. Deploy anywhere with enterprise-grade infrastructure.
          </p>
        </article>
      </section>

      {/* CTA Section */}
      <section className="flow-panel rounded-[2rem] p-8 text-center">
        <h2 className="headline text-3xl mb-4">Ready to Detect Deepfakes?</h2>
        <p className="copy-muted mb-6 max-w-xl mx-auto">
          Start analyzing images instantly. No API keys required. Fully local and private.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/features" className="cta-primary rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90">
            Learn More
          </Link>
          <Link href="/about" className="line-pill rounded-full px-6 py-3 text-sm font-semibold transition">
            About Us
          </Link>
        </div>
      </section>
    </div>
  );
}
