import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="grid gap-16 pb-10">
      {/* Hero Section */}
      <section className="text-center">
        <p className="hero-kicker mb-4">Why SnapSure</p>
        <h1 className="headline text-5xl sm:text-7xl lg:text-8xl leading-[1.1] mb-6">
          Enterprise-Grade Deepfake Detection
        </h1>
        <p className="copy-muted max-w-2xl mx-auto text-lg sm:text-xl">
          Built for production with ensemble AI models, DevOps-native infrastructure, and enterprise reliability.
        </p>
      </section>

      {/* Main Features */}
      <section className="grid gap-8 lg:grid-cols-2">
        <article className="flow-panel-strong rounded-[2rem] p-8">
          <div className="hero-kicker mb-4">Ensemble AI Models</div>
          <h2 className="headline text-4xl mb-4">Dual Model Architecture</h2>
          <p className="copy-muted text-base leading-relaxed mb-6">
            Combines two state-of-the-art Hugging Face models: ViT Deepfake Detection and Deepfake vs Real Image Detection. 
            Our ensemble approach averages predictions for superior accuracy and reliability.
          </p>
          <ul className="copy-muted text-sm space-y-2">
            <li>• Vision Transformer (ViT) for pattern recognition</li>
            <li>• Specialized deepfake vs real classifier</li>
            <li>• Probability averaging for consistent results</li>
            <li>• 4-decimal precision confidence scores</li>
          </ul>
        </article>

        <article className="flow-panel-strong rounded-[2rem] p-8">
          <div className="hero-kicker mb-4">Lightning Fast</div>
          <h2 className="headline text-4xl mb-4">2-5 Second Analysis</h2>
          <p className="copy-muted text-base leading-relaxed mb-6">
            Optimized inference pipeline delivers real-time results without compromising accuracy. 
            Perfect for high-volume content moderation and verification workflows.
          </p>
          <ul className="copy-muted text-sm space-y-2">
            <li>• Lazy singleton model loading</li>
            <li>• Efficient GPU/CPU utilization</li>
            <li>• No preprocessing bottlenecks</li>
            <li>• Scales horizontally with containers</li>
          </ul>
        </article>
      </section>

      {/* Technical Features */}
      <section>
        <p className="hero-kicker mb-4 text-center">Technical Excellence</p>
        <h2 className="headline text-4xl text-center mb-8">Built for Production</h2>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="flow-panel rounded-[2rem] p-6">
            <h3 className="headline text-2xl mb-3">Docker Ready</h3>
            <p className="copy-muted text-sm leading-relaxed">
              Containerized with multi-stage Docker builds. Includes health checks, volume mounts, and non-root security.
            </p>
          </article>

          <article className="flow-panel rounded-[2rem] p-6">
            <h3 className="headline text-2xl mb-3">Kubernetes Native</h3>
            <p className="copy-muted text-sm leading-relaxed">
              Complete K8s manifests with ConfigMaps, Deployments, Services, and Ingress. Minikube-ready deployment scripts.
            </p>
          </article>

          <article className="flow-panel rounded-[2rem] p-6">
            <h3 className="headline text-2xl mb-3">Jenkins CI/CD</h3>
            <p className="copy-muted text-sm leading-relaxed">
              Declarative pipeline with automated builds, tests, and deployments. GitHub webhook integration included.
            </p>
          </article>
        </div>
      </section>

      {/* Additional Features */}
      <section className="grid gap-8 lg:grid-cols-2">
        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Face Detection</h3>
          <p className="copy-muted text-sm leading-relaxed">
            MTCNN-powered face detection counts faces and optionally returns cropped images. 
            Secondary feature that doesn't interfere with classification decisions.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Privacy First</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Fully local inference. No external APIs. Images never leave your infrastructure. 
            Models cached locally after first download.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Flexible Deployment</h3>
          <p className="copy-muted text-sm leading-relaxed">
            CPU or GPU support via MODEL_DEVICE. Demo mode for testing. Environment-driven configuration.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Simple API</h3>
          <p className="copy-muted text-sm leading-relaxed">
            RESTful endpoint with multipart form upload. Returns JSON with label, confidence, 
            fake score, face count, and optional face crops.
          </p>
        </article>
      </section>

      {/* CTA Section */}
      <section className="flow-panel rounded-[2rem] p-8 text-center">
        <h2 className="headline text-3xl mb-4">Ready to Deploy?</h2>
        <p className="copy-muted mb-6 max-w-xl mx-auto">
          Complete DevOps pipeline included. From local development to production Kubernetes deployment.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="cta-primary rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90">
            Try Analyzer
          </Link>
          <Link href="/about" className="line-pill rounded-full px-6 py-3 text-sm font-semibold transition">
            About Us
          </Link>
        </div>
      </section>
    </div>
  );
}
