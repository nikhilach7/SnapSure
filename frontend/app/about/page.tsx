import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="grid gap-16 pb-10">
      {/* Hero Section */}
      <section className="text-center">
        <p className="hero-kicker mb-4">About SnapSure</p>
        <h1 className="headline text-5xl sm:text-7xl lg:text-8xl leading-[1.1] mb-6">
          Trust in Every Pixel
        </h1>
        <p className="copy-muted max-w-2xl mx-auto text-lg sm:text-xl">
          We're building the infrastructure teams need to verify authenticity in an era of AI-generated content.
        </p>
      </section>

      {/* Mission Section */}
      <section className="flow-panel-strong rounded-[2rem] p-8">
        <h2 className="headline text-4xl mb-4">Our Mission</h2>
        <p className="copy-muted text-base leading-relaxed max-w-3xl">
          SnapSure exists to provide fast, accurate, and reliable deepfake detection that integrates seamlessly into modern workflows. 
          We believe that trust signals should be instant, transparent, and accessible to every team that needs them.
        </p>
      </section>

      {/* Values Section */}
      <section className="grid gap-8 lg:grid-cols-2">
        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Accuracy First</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Our ensemble approach combines multiple state-of-the-art models to deliver superior accuracy. 
            We don't compromise on precision for speed—we optimize both.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Production Ready</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Built from day one with DevOps in mind. Docker, Kubernetes, Jenkins CI/CD—all included. 
            Deploy to production in minutes, not months.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Privacy Focused</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Fully local inference. Your images never leave your infrastructure. 
            No external APIs, no data sharing, complete control.
          </p>
        </article>

        <article className="flow-panel rounded-[2rem] p-6">
          <h3 className="headline text-2xl mb-3">Developer Friendly</h3>
          <p className="copy-muted text-sm leading-relaxed">
            Simple REST API, clear documentation, and predictable responses. 
            Integrate deepfake detection into any workflow with minimal effort.
          </p>
        </article>
      </section>

      {/* Technology Section */}
      <section>
        <p className="hero-kicker mb-4 text-center">Technology</p>
        <h2 className="headline text-4xl text-center mb-8">Built on Modern Stack</h2>
        
        <div className="grid gap-6 lg:grid-cols-4">
          <article className="flow-panel rounded-[2rem] p-6 text-center">
            <h3 className="headline text-xl mb-2">PyTorch</h3>
            <p className="copy-muted text-xs">Deep Learning Framework</p>
          </article>

          <article className="flow-panel rounded-[2rem] p-6 text-center">
            <h3 className="headline text-xl mb-2">Transformers</h3>
            <p className="copy-muted text-xs">Hugging Face Models</p>
          </article>

          <article className="flow-panel rounded-[2rem] p-6 text-center">
            <h3 className="headline text-xl mb-2">Flask</h3>
            <p className="copy-muted text-xs">Backend API</p>
          </article>

          <article className="flow-panel rounded-[2rem] p-6 text-center">
            <h3 className="headline text-xl mb-2">Next.js</h3>
            <p className="copy-muted text-xs">Frontend Framework</p>
          </article>
        </div>
      </section>

      {/* CTA Section */}
      <section className="flow-panel rounded-[2rem] p-8 text-center">
        <h2 className="headline text-3xl mb-4">Get Started Today</h2>
        <p className="copy-muted mb-6 max-w-xl mx-auto">
          Try the analyzer or explore our features. Enterprise-grade deepfake detection is now accessible to everyone.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="cta-primary rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90">
            Try Analyzer
          </Link>
          <Link href="/features" className="line-pill rounded-full px-6 py-3 text-sm font-semibold transition">
            View Features
          </Link>
        </div>
      </section>
    </div>
  );
}
