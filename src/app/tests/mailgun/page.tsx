'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function MailgunTest() {
  const { data: session, status } = useSession();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/tests/mailgun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, content }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setResult({ success: 'Email sent successfully!' });
      // Clear form
      setTo('');
      setSubject('');
      setContent('');
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  // Show unauthorized message if not admin/dev
  // console.log("--------------------------------");
  // console.log("MailgunTest status:", status);
  // console.log("MailgunTest session:", session);
  // console.log("MailgunTest user:", session?.user);
  // console.log("MailgunTest user role:", session?.user?.role);
  // console.log("--------------------------------");

  if (
    status === 'authenticated' &&
    session?.user?.role !== 'admin' &&
    session?.user?.role !== 'developer' &&
    session?.user?.role !== 'superadmin'
  ) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Mailgun Test</h1>
        <div className="bg-red-50 text-red-700 p-4 rounded">
          Unauthorized: Only admins and developers can access this page
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mailgun Test</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">To:</label>
          <Input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Subject:</label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Test Email" required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Content:</label>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Hello world!"
            rows={4}
            required
          />
        </div>

        {result?.success && <div className="bg-green-50 text-green-700 p-3 rounded">{result.success}</div>}

        {result?.error && <div className="bg-red-50 text-red-700 p-3 rounded">{result.error}</div>}

        <Button type="submit" disabled={sending}>
          {sending ? 'Sending...' : 'Send Test Email'}
        </Button>
      </form>
    </div>
  );
}
