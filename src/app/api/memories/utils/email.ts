/**
 * EMAIL UTILITIES - UNIFIED SCHEMA
 *
 * This module handles email notifications for memory sharing and invitations.
 * Updated to work with the unified memories schema instead of separate tables.
 *
 * USAGE:
 * - Send invitation emails when sharing memories
 * - Send notification emails for shared memories
 * - Support all memory types: image, video, document, note, audio
 *
 * FUNCTIONS:
 * - sendInvitationEmail(): Send email to invite someone to view a memory
 * - sendSharedMemoryEmail(): Send email to existing users about shared memories
 * - getEmailContent(): Generate email content based on memory type
 * - getTemplateVariables(): Generate template variables for Mailgun templates
 */

import { db } from '@/db/db';
import { relationship, users, familyRelationship } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import type { MemoryWithType } from './memory';

// Constants
const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const API_KEY = process.env.MAILGUN_API_KEY || '';
const FROM_EMAIL = process.env.MAILGUN_FROM || `hello@${DOMAIN}`;

// Initialize Mailgun
const mg = new Mailgun(FormData).client({
  username: 'api',
  key: API_KEY,
  url: 'https://api.eu.mailgun.net', // Add EU region URL
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  'h:X-Mailgun-Variables'?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmail(options: EmailOptions): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageData: any = {
    from: FROM_EMAIL,
    ...options,
  };

  // console.log("📧 Sending email:", {
  //   from: messageData.from,
  //   to: messageData.to,
  //   subject: messageData.subject,
  // });

  const response = await mg.messages.create(DOMAIN, messageData);
  // console.log("📬 Email sent successfully:", {
  //   messageId: response.id,
  //   from: FROM_EMAIL,
  //   status: response.status,
  // });
  return response;
}

/**
 * Builds email content based on the memory type.
 * @param memory The memory with type.
 * @param inviterName Name of the person sending the invitation.
 * @param relationship Relationship context.
 * @param includeHtml Whether to include rich HTML content.
 * @returns An object with text (and optionally html) content.
 */
function getEmailContent(
  memory: MemoryWithType,
  inviterName: string,
  relationship: string | undefined,
  includeHtml: boolean
): { text: string; html?: string } {
  const relationshipText = relationship ? `, your ${relationship},` : '';

  if (memory.type === 'document') {
    const textContent = `${inviterName}${relationshipText} has shared a document with you: ${
      memory.title
    }. Description: ${memory.description || 'No description'}.`;
    const htmlContent = includeHtml
      ? `
    <html>
      <body>
        <h1>Document Shared</h1>
        <p>${inviterName}${relationshipText} has shared a document with you: <strong>${memory.title}</strong></p>
        <p>Description: ${memory.description || 'No description'}</p>
      </body>
    </html>
    `
      : undefined;
    return { text: textContent, html: htmlContent };
  } else if (memory.type === 'image') {
    const textContent = `You've been invited to view an image: ${
      memory.title || 'Untitled'
    }. Invited by: ${inviterName}.`;
    const htmlContent = includeHtml
      ? `
		<html>
		  <body>
			<h1>Image Invitation</h1>
			<p>You have been invited to view an image.</p>
			<p>Title: <strong>${memory.title || 'No title'}</strong></p>
			<p>Description: ${memory.description || 'No description'}</p>
			<p>Invited by: ${inviterName}</p>
		  </body>
		</html>
	  `
      : undefined;
    return { text: textContent, html: htmlContent };
  } else {
    // Fallback for note, video, audio or other types.
    const textContent = `You've been invited to view a ${memory.type}. Invited by: ${inviterName}.`;
    const htmlContent = includeHtml
      ? `
		<html>
		  <body>
			<h1>Memory Invitation</h1>
			<p>You've been invited to view a ${memory.type}.</p>
			<p>Title: <strong>${memory.title || 'Untitled'}</strong></p>
			<p>Description: ${memory.description || 'No description'}</p>
			<p>Invited by: ${inviterName}</p>
		  </body>
		</html>
	  `
      : undefined;
    return { text: textContent, html: htmlContent };
  }
}
/**
 * Generates the dynamic variables for the template option.
 * @param memory The memory to be shared.
 * @param inviterName The name of the inviter.
 * @returns An object of template variables.
 */
function getTemplateVariables(memory: MemoryWithType, inviterName: string): Record<string, unknown> {
  return {
    title: memory.title || 'Untitled',
    description: memory.description || 'No description',
    type: memory.type,
    inviterName,
  };
}

/**
 * Sends an invitation email using Mailgun.
 * @param email Recipient email address.
 * @param memory The memory to share.
 * @param invitedById ID of the inviter.
 * @param options Options to control template usage and HTML inclusion.
 * @returns A promise that resolves to true if the email was sent successfully.
 */
export async function sendInvitationEmail(
  email: string,
  memory: MemoryWithType,
  invitedById: string,
  options: { useTemplate?: boolean; useHTML?: boolean } = {}
) {
  try {
    // console.log("📧 sendInvitationEmail called with:", {
    //   recipientEmail: email,
    //   memoryType: memory.type,
    //   invitedById,
    //   memoryOwnerId: memory.data.ownerId,
    // });

    // Retrieve the inviter's name and relationship
    const inviterName = await getInviterName(invitedById);
    const relationship = await getRelationship(invitedById, memory.id);

    // console.log("👤 Got inviter details:", {
    //   inviterName,
    //   relationship,
    //   invitedById,
    // });

    // TODO: Find correct Mailgun message type or create proper interface
    // We struggle to find the correct type for the message data.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messageData: any;

    if (options.useTemplate) {
      // Use Mailgun template
      const templateVars = getTemplateVariables(memory, inviterName || 'Someone');
      messageData = {
        to: email,
        subject: "You've been invited to view a memory!",
        template: 'memory-invitation', // Ensure this template exists in your Mailgun dashboard
        'h:X-Mailgun-Variables': JSON.stringify(templateVars),
        text: '', // You can optionally supply a fallback text version
      };
      // console.log("📧 Using template, sending to:", { email, template: "memory-invitation" });
    } else {
      // Use hardcoded message
      const { text, html } = getEmailContent(memory, inviterName || 'Someone', relationship, options.useHTML ?? false);
      messageData = {
        to: email,
        subject: "You've been invited to view a memory!",
        text: text,
        ...(options.useHTML && html ? { html } : {}),
      };
      // console.log("📧 Using hardcoded message, sending to:", { email });
    }

    const response = await sendEmail(messageData);
    // console.log("📬 Email sent to:", { email, status: response.status });

    if (response.statusCode === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(
      `Failed to send invitation email to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Sends an email about a shared memory to an existing user
 * @param email Recipient email address.
 * @param memory The memory to share.
 * @param sharedById ID of the person who shared the memory.
 * @param shareUrl The URL to view the shared memory.
 * @param options Options to control template usage and HTML inclusion.
 * @returns A promise that resolves to true if the email was sent successfully.
 */
export async function sendSharedMemoryEmail(
  email: string,
  memory: MemoryWithType,
  sharedById: string,
  shareUrl: string,
  options: { useTemplate?: boolean; useHTML?: boolean } = {}
) {
  try {
    const inviterName = await getInviterName(sharedById);
    const relationship = await getRelationship(sharedById, memory.id);

    const messageData = {
      to: email,
      subject: 'A memory has been shared with you on Futura',
      text: `${inviterName}${
        relationship ? `, your ${relationship}` : ''
      } shared a memory with you on Futura. View it here: ${shareUrl}`,
      html: options.useHTML
        ? `
        <html>
          <body>
            <h1>Memory Shared</h1>
            <p>${inviterName}${relationship ? `, your ${relationship}` : ''} shared a memory with you.</p>
            <p><a href="${shareUrl}">Click here to view it</a></p>
          </body>
        </html>
      `
        : undefined,
    };

    const response = await sendEmail(messageData);
    if (response.statusCode === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(
      `Failed to send shared memory email to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function getInviterName(invitedById: string) {
  const inviter = await db.query.users.findFirst({
    where: eq(users.id, invitedById),
  });
  return inviter?.name;
}

async function getRelationship(inviterId: string, invitedId: string) {
  const rel = await db.query.relationship.findFirst({
    where: () => and(eq(relationship.userId, inviterId), eq(relationship.relatedUserId, invitedId)),
  });

  if (rel?.type === 'family') {
    const familyRel = await db.query.familyRelationship.findFirst({
      where: eq(familyRelationship.relationshipId, rel.id),
    });
    return familyRel?.familyRole;
  }

  return rel?.type;
}
