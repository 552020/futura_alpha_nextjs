export default function ContactPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Contact Us</h1>
      <p className="text-sm text-muted-foreground mb-8">For any inquiries, feedback, or support, please email us at:</p>
      <div className="rounded-md border p-6 bg-muted/30">
        <p className="text-lg">
          <a className="underline" href="mailto:support@futura.example">
            support@futura.example
          </a>
        </p>
        <p className="text-sm text-muted-foreground mt-2">We typically respond within 1–2 business days.</p>
      </div>
    </main>
  );
}
