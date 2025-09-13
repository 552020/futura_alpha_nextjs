export default async function PrivacyPolicyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main className="container mx-auto px-6 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-2">Last updated: August 27, 2025</p>

      <section className="space-y-4">
        <p>
          This Privacy Policy explains how Futura (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses,
          and shares information when you use our website, applications, and services (the &quot;Service&quot;).
        </p>

        <h2 className="text-xl font-semibold mt-8">1. Information We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Account information such as name, email, and profile details you provide.</li>
          <li>Usage information including pages viewed, actions taken, and device/browser data.</li>
          <li>Files and content you upload to or generate within the Service.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">2. How We Use Information</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>To provide, maintain, and improve the Service.</li>
          <li>To personalize your experience and communicate with you about updates.</li>
          <li>To protect the security and integrity of the Service and our users.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">3. Cookies & Similar Technologies</h2>
        <p>
          We may use cookies and similar technologies to remember preferences, understand usage, and improve
          performance. You can control cookies via your browser settings.
        </p>

        <h2 className="text-xl font-semibold mt-8">4. Sharing of Information</h2>
        <p>
          We may share information with service providers who support our operations (e.g., hosting, analytics). We do
          not sell personal information.
        </p>

        <h2 className="text-xl font-semibold mt-8">5. Data Security</h2>
        <p>
          We implement reasonable safeguards designed to protect information. However, no method of transmission or
          storage is 100% secure.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. To make
          a request, contact us via the form on the{" "}
          <a className="underline" href={`/${lang}/contact`}>
            Contact
          </a>{" "}
          page.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. Changes are effective when posted. Your continued use indicates
          acceptance of the updated policy.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Contact Us</h2>
        <p>
          Questions about privacy? Visit{" "}
          <a className="underline" href={`/${lang}/contact`}>
            Contact
          </a>{" "}
          and send us a message.
        </p>
      </section>
    </main>
  );
}
