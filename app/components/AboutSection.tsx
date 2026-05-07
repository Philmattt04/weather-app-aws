/**
 * AboutSection component
 *
 * Static footer section displayed on every tab.
 * Shows the author's name (Philippe Mathieu) and a description of PM Accelerator
 * as required by the technical assessment brief.
 */

export default function AboutSection() {
  return (
    <section className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white">
      <h3 className="text-lg font-semibold mb-1">About This App</h3>
      <p className="text-blue-300 text-sm mb-5">
        Built by <span className="text-white font-semibold">Philippe Mathieu</span>
      </p>

      {/* PM Accelerator description as requested in the assessment */}
      <div className="border-t border-white/10 pt-5 max-w-2xl mx-auto">
        <h4 className="font-semibold text-blue-200 mb-3">About PM Accelerator</h4>
        <p className="text-blue-300 text-sm leading-relaxed">
          Product Manager Accelerator (PMA) is the #1 platform for aspiring and experienced
          Product Managers to accelerate their careers. Through expert coaching, a thriving
          community, and curated resources, PMA has helped thousands of PMs land their dream
          jobs, build world-class products, and excel in the ever-evolving tech landscape.
          PMA bridges the gap between ambition and achievement for product professionals worldwide.
        </p>
        <a
          href="https://www.linkedin.com/school/pmaccelerator/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-200 transition underline"
        >
          Learn more on LinkedIn →
        </a>
      </div>
    </section>
  );
}
