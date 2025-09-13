import formData from "form-data";
import Mailgun from "mailgun.js";
import { MailgunClientOptions, MessagesSendResult } from "mailgun.js/definitions";

const mailgun = new Mailgun(formData);

// Environment variables
const API_KEY = process.env.MAILGUN_API_KEY || "";
const DOMAIN = process.env.MAILGUN_DOMAIN || ""; // e.g., "futura.now"
const FROM_EMAIL = process.env.MAILGUN_FROM || `hello@${DOMAIN}`;

// Fail early if credentials are missing
if (!API_KEY || !DOMAIN) {
  throw new Error("Missing Mailgun API credentials");
}

// Initialize Mailgun client with proper type
const clientOptions: MailgunClientOptions = {
  username: "api",
  key: API_KEY,
  url: "https://api.eu.mailgun.net", // or "https://api.mailgun.net" if in the US region
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

// Send function using FormData
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
    // Use FormData directly as shown in the documentation
    const data = new formData();

    // Required fields
    data.append("from", FROM_EMAIL);

    // Handle array of recipients
    if (Array.isArray(to)) {
      to.forEach((recipient) => data.append("to", recipient));
    } else {
      data.append("to", to);
    }

    data.append("subject", subject);

    // Optional fields
    if (text) data.append("text", text);
    if (html) data.append("html", html);
    if (replyTo) data.append("h:Reply-To", replyTo);

    // Template support
    if (template) {
      data.append("template", template);

      if (templateVariables) {
        data.append("h:X-Mailgun-Variables", JSON.stringify(templateVariables));
      }
    }

    // Handle attachments
    if (attachments?.length) {
      attachments.forEach((file) => {
        data.append("attachment", file.data, file.filename);
      });
    }

    // Add a dummy message property to satisfy TypeScript
    // This won't actually be used by Mailgun when sending with FormData
    data.append("message", "");

    // Call Mailgun with FormData and use a safer type assertion
    // Disable ESLint for this line because FormData is compatible with Mailgun's API but not with its TypeScript definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await mg.messages.create(DOMAIN, data as any);

    // console.log(`Email sent to ${Array.isArray(to) ? to.join(", ") : to} with subject: ${subject}`);
    return response;
  } catch (error) {
    console.error("Mailgun Error:", error);
    throw error;
  }
};
