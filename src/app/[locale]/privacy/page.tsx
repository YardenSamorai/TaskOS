import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 18, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              TaskOS (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use the TaskOS platform and related services (collectively, &quot;the Service&quot;). By using the Service, you consent to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-medium mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">Account Information:</strong> Name, email address, and password when you create an account</li>
              <li><strong className="text-foreground">Profile Information:</strong> Avatar, display name, and other optional profile details</li>
              <li><strong className="text-foreground">Task Data:</strong> Tasks, projects, descriptions, comments, and other content you create within the Service</li>
              <li><strong className="text-foreground">Integration Data:</strong> Access tokens and connection information for third-party services you choose to connect (e.g., GitHub, Jira, Azure DevOps)</li>
              <li><strong className="text-foreground">Communications:</strong> Information you provide when contacting our support</li>
            </ul>

            <h3 className="text-base font-medium mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">Usage Data:</strong> Pages visited, features used, actions taken, and timestamps</li>
              <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system, device type, and screen resolution</li>
              <li><strong className="text-foreground">Log Data:</strong> IP address, access times, and referring URLs</li>
              <li><strong className="text-foreground">Cookies:</strong> Session cookies for authentication and preference cookies for user settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
              <li>To provide, operate, and maintain the Service</li>
              <li>To authenticate your identity and manage your account</li>
              <li>To process and sync your tasks and data across connected integrations</li>
              <li>To send essential service-related communications (e.g., password resets, security alerts)</li>
              <li>To improve and optimize the Service based on usage patterns</li>
              <li>To detect, prevent, and address security issues and abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do <strong className="text-foreground">not</strong> sell, rent, or trade your personal information. We may share your information only in the following limited circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">Third-Party Integrations:</strong> When you connect services like GitHub, Jira, or Azure DevOps, we exchange data with those services as necessary to provide the integration functionality you requested</li>
              <li><strong className="text-foreground">Service Providers:</strong> We may use trusted third-party service providers (e.g., hosting, analytics) who process data on our behalf and are bound by confidentiality obligations</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> We may disclose information if required by law, court order, or governmental regulation, or if we believe disclosure is necessary to protect our rights, safety, or the safety of others</li>
              <li><strong className="text-foreground">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption of data in transit (TLS/SSL), secure storage of credentials, and regular security assessments. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal, accounting, or compliance purposes. Task data and content you created may be retained in anonymized form for analytical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your jurisdiction, you may have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data</li>
              <li><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format</li>
              <li><strong className="text-foreground">Objection:</strong> Object to certain processing of your data</li>
              <li><strong className="text-foreground">Withdrawal of Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@task-os.app" className="text-primary hover:underline">privacy@task-os.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies required for the Service to function (e.g., authentication session cookies). We may also use analytics cookies to understand how the Service is used. You can control cookie settings through your browser. Disabling essential cookies may prevent you from using certain features of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected personal information from a child under 16, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using the Service, you consent to the transfer of your information to such countries. We will take appropriate safeguards to ensure your data remains protected in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Service and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes are posted constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-3 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm"><strong>TaskOS</strong></p>
              <p className="text-sm text-muted-foreground">Email: <a href="mailto:privacy@task-os.app" className="text-primary hover:underline">privacy@task-os.app</a></p>
              <p className="text-sm text-muted-foreground">Website: <a href="https://www.task-os.app" className="text-primary hover:underline">www.task-os.app</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
