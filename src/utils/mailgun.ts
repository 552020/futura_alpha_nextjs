import Mailgun from 'mailgun.js';
import { MailgunClientOptions, MessagesSendResult } from 'mailgun.js/definitions';
import formData from 'form-data';

const mailgun = new Mailgun(formData);

// Environment variables
const API_KEY = process.env.MAILGUN_API_KEY || '';
const DOMAIN = process.env.MAILGUN_DOMAIN || ''; // e.g., "futura.now"
const FROM_EMAIL = process.env.MAILGUN_FROM || `hello@${DOMAIN}`;

// Fail early if credentials are missing
if (!API_KEY || !DOMAIN) {
  throw new Error('Missing Mailgun API credentials');
}

// Initialize Mailgun client with proper type
const clientOptions: MailgunClientOptions = {
  username: 'api',
  key: API_KEY,
  url: 'https://api.eu.mailgun.net', // or "https://api.mailgun.net" if in the US region
};

const mg = mailgun.client(clientOptions);

// Define the email options interface
interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  template?: string;
  templateVariables?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    data: Buffer | string;
  }>;
}

// Define the message data interface
// interface MessageData {
//   from: string;
//   to: string | string[];
//   subject: string;
//   text?: string;
//   html?: string;
//   template?: string;
//   "h:X-Mailgun-Variables"?: string;
//   "h:Reply-To"?: string;
//   attachment?:
//     | {
//         filename: string;
//         data: Buffer | string;
//       }
//     | Array<{
//         filename: string;
//         data: Buffer | string;
//       }>;
//   [key: string]: unknown; // For any other properties
// }

// Send function
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo,
  template,
  templateVariables,
  attachments,
}: EmailOptions): Promise<MessagesSendResult> => {
  try {
    const messageData: {
      from: string;
      to: string;
      subject: string;
      text?: string;
      html?: string;
      'h:Reply-To'?: string;
      template?: string;
      'h:X-Mailgun-Variables'?: string;
      attachment?: {
        data: Buffer | string;
        filename: string;
      }[];
    } = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
    };

    if (text) messageData.text = text;
    if (html) messageData.html = html;
    if (replyTo) messageData['h:Reply-To'] = replyTo;

    if (template) {
      messageData.template = template;
      if (templateVariables) {
        messageData['h:X-Mailgun-Variables'] = JSON.stringify(templateVariables);
      }
    }

    if (attachments?.length) {
      messageData.attachment = attachments.map(file => ({
        data: file.data,
        filename: file.filename,
      }));
    }

    const response = await mg.messages.create(DOMAIN, { ...messageData, message: '' });

    return response;
  } catch (error) {
    console.error('Mailgun Error:', error);
    throw error;
  }
};
