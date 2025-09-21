export default async function TermsOfServicePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main className="container mx-auto px-6 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-2">Last updated: August 27, 2025</p>

      <section className="space-y-4">
        <p>
          Welcome to Futura. By accessing or using our website, applications, or services (collectively, the
          &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not
          agree, do not use the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">1. Eligibility</h2>
        <p>
          You must be at least 13 years old (or the age of digital consent in your jurisdiction) to use the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. Accounts</h2>
        <p>
          You are responsible for the activity that occurs under your account and for keeping your credentials secure.
          Notify us immediately of any unauthorized use.
        </p>

        <h2 className="text-xl font-semibold mt-8">3. Acceptable Use</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Do not violate any applicable laws or regulations.</li>
          <li>Do not infringe the rights of others, including privacy and intellectual property rights.</li>
          <li>Do not attempt to interfere with or disrupt the Service or its infrastructure.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">4. Content</h2>
        <p>
          You retain ownership of content you upload or create. By providing content, you grant us a limited,
          non-exclusive, worldwide license to host and display it solely to operate the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">5. Third-Party Services</h2>
        <p>
          The Service may integrate with third-party providers. We are not responsible for the availability or
          performance of third-party services.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We disclaim all warranties, express
          or implied, including merchantability, fitness for a particular purpose, and non-infringement.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, in no event will we be liable for any indirect, incidental, special,
          or consequential damages arising out of or related to your use of the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Termination</h2>
        <p>
          We may suspend or terminate access to the Service at any time for any reason, including violation of these
          Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8">9. Changes</h2>
        <p>
          We may update these Terms from time to time. Changes are effective when posted. Continued use of the Service
          after changes constitutes acceptance of the new Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8">10. Contact</h2>
        <p>
          Questions about these Terms? Contact us at{' '}
          <a className="underline" href={`/${lang}/contact`}>
            Contact
          </a>
          .
        </p>
      </section>
    </main>
  );
}
