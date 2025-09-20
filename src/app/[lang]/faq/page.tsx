import { getDictionary } from '@/utils/dictionaries';
import { Metadata } from 'next';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type FAQPageProps = {
  params: Promise<{
    lang: string;
  }>;
};

// Generate metadata for the page
export async function generateMetadata({ params }: FAQPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang, { includeFAQ: true });

  return {
    title: dict.faq?.title || 'Frequently Asked Questions',
    description: dict.faq?.description || 'Find answers to commonly asked questions about our platform.',
  };
}

export default async function FAQPage({ params }: FAQPageProps) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang, { includeFAQ: true });

  // Fallback FAQ items if not provided in dictionary
  const faqItems = dict.faq?.items || [
    {
      question: 'What is this platform about?',
      answer: 'This platform helps users create and manage their digital presence with powerful tools and features.',
    },
    {
      question: 'How do I create an account?',
      answer: 'You can create an account by clicking the Sign In button and following the registration process.',
    },
    {
      question: 'Is this service free to use?',
      answer:
        'We offer both free and premium plans. The free plan includes basic features, while premium plans offer additional capabilities.',
    },
    {
      question: 'How can I contact support?',
      answer:
        'You can reach our support team through the contact form on our website or by emailing support@example.com.',
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'Yes, you can cancel your subscription at any time from your account settings.',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">{dict.faq?.title || 'Frequently Asked Questions'}</h1>

      <div className="max-w-3xl mx-auto">
        <p className="text-lg mb-8">
          {dict.faq?.intro || 'Find answers to the most common questions about our platform and services.'}
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
