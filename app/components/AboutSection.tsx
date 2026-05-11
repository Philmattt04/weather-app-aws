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

      <div className="border-t border-white/10 pt-5 max-w-2xl mx-auto space-y-5 text-left">
        <div>
          <h4 className="font-semibold text-blue-200 mb-2">What it does</h4>
          <p className="text-blue-300 text-sm leading-relaxed">
            A full-stack weather dashboard that shows real-time conditions and a 5-day forecast
            for any city, generates AI-powered weather summaries, and lets you save, browse,
            and export historical weather records.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-blue-200 mb-2">Frontend</h4>
          <p className="text-blue-300 text-sm leading-relaxed">
            Next.js 16 (App Router) with React 19 and Tailwind CSS 4. API routes act as a
            secure server-side proxy, keeping all third-party keys out of the browser.
            Deployed on AWS Amplify with CloudFront and automatic HTTPS.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-blue-200 mb-2">Backend</h4>
          <p className="text-blue-300 text-sm leading-relaxed">
            Fully serverless on AWS. Seven Node.js Lambda functions handle CRUD operations
            and CSV/PDF export, exposed through an API Gateway REST API with CORS.
            Weather data comes from the OpenWeatherMap API; AI summaries are generated
            by Claude 3 Haiku via Amazon Bedrock. Records are persisted in DynamoDB.
            All infrastructure is managed with Terraform.
          </p>
        </div>
      </div>
    </section>
  );
}
