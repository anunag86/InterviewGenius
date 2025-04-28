import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const PrivacyPolicy = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Button 
        variant="outline" 
        onClick={() => setLocation("/")}
        className="mb-6"
      >
        Back to Home
      </Button>

      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
        Privacy Policy
      </h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-bold mb-3">Overview</h2>
          <p>
            PrepTalk is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>LinkedIn profile information (name, email, profile picture, profile URL)</li>
            <li>Resume content you upload</li>
            <li>Job postings you analyze</li>
            <li>Your interview responses</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide personalized interview preparation services</li>
            <li>To analyze your qualifications against job requirements</li>
            <li>To generate tailored interview questions and talking points</li>
            <li>To improve our application and services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Third-Party Services</h2>
          <p>
            We use the following third-party services to power our application:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>LinkedIn OAuth for authentication</li>
            <li>OpenAI for analyzing job postings and resumes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Data Retention</h2>
          <p>
            We store your interview preparations and responses for 30 days after creation, after which they are automatically deleted.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Your Rights</h2>
          <p>
            You have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access your personal data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Updates to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> privacy@preptalk.ai
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;