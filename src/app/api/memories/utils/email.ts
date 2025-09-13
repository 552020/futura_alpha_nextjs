import { db } from "@/db/db";
import { relationship, users, familyRelationship } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import FormData from "form-data";
import Mailgun from "mailgun.js";
import type { MemoryWithType } from "./memory";

// Constants
const DOMAIN = process.env.MAILGUN_DOMAIN || "";
const API_KEY = process.env.MAILGUN_API_KEY || "";
const FROM_EMAIL = process.env.MAILGUN_FROM || `hello@${DOMAIN}`;

// Initialize Mailgun
const mg = new Mailgun(FormData).client({
  username: "api",
  key: API_KEY,
  url: "https://api.eu.mailgun.net", // Add EU region URL
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  "h:X-Mailgun-Variables"?: string;
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
  const relationshipText = relationship ? `, your ${relationship},` : "";

  if (memory.type === "document") {
    const document = memory.data as {
      title?: string;
      description?: string;
      url: string;
    };
    const textContent = `${inviterName}${relationshipText} has shared a document with you: ${document.title}. Description: ${document.description}. View it here: ${document.url}`;
    const htmlContent = includeHtml
      ? `
    <html>
      <body>
        <h1>Document Shared</h1>
        <p>${inviterName}${relationshipText} has shared a document with you: <strong>${document.title}</strong></p>
        <p>Description: ${document.description}</p>
        <p>View it <a href="${document.url}">here</a>.</p>
      </body>
    </html>
    `
      : undefined;
    return { text: textContent, html: htmlContent };
  } else if (memory.type === "image") {
    // Assume memory.data is an image.
    const image = memory.data as {
      title?: string;
      description?: string;
      caption?: string;
      url: string;
    };
    const textContent = `You've been invited to view an image: ${
      image.title || image.caption || image.url
    }. Invited by: ${inviterName}.`;
    const htmlContent = includeHtml
      ? `
		<html>
		  <body>
			<h1>Image Invitation</h1>
			<p>You have been invited to view an image.</p>
			<p>Title: <strong>${image.title || "No title"}</strong></p>
			<p>Description: ${image.description || "No description"}</p>
			<p>Invited by: ${inviterName}</p>
			<img src="${image.url}" alt="${image.title || "Invited Image"}" style="max-width:600px;" />
		  </body>
		</html>
	  `
      : undefined;
    return { text: textContent, html: htmlContent };
  } else {
    // Fallback for note or other types.
    const textContent = `You've been invited to view a memory. Invited by: ${inviterName}.`;
    const htmlContent = includeHtml
      ? `
		<html>
		  <body>
			<h1>Memory Invitation</h1>
			<p>You've been invited to view a memory.</p>
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
  if (memory.type === "document") {
    const document = memory.data as {
      title?: string;
      description?: string;
      url: string;
    };
    return {
      title: document.title || "Untitled",
      description: document.description || "No description",
      url: document.url,
      inviterName,
    };
  } else if (memory.type === "image") {
    const image = memory.data as {
      title?: string;
      description?: string;
      caption?: string;
      url: string;
    };
    return {
      title: image.title || image.caption || "Image",
      description: image.description || image.caption || "No description",
      url: image.url,
      inviterName,
    };
  } else {
    return { inviterName };
  }
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
    const relationship = await getRelationship(invitedById, memory.data.id);

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
      const templateVars = getTemplateVariables(memory, inviterName || "Someone");
      messageData = {
        to: email,
        subject: "You've been invited to view a memory!",
        template: "memory-invitation", // Ensure this template exists in your Mailgun dashboard
        "h:X-Mailgun-Variables": JSON.stringify(templateVars),
        text: "", // You can optionally supply a fallback text version
      };
      // console.log("📧 Using template, sending to:", { email, template: "memory-invitation" });
    } else {
      // Use hardcoded message
      const { text, html } = getEmailContent(memory, inviterName || "Someone", relationship, options.useHTML ?? false);
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
    console.error("Error sending email:", error);
    throw new Error(
      `Failed to send invitation email to ${email}: ${error instanceof Error ? error.message : "Unknown error"}`
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
    const relationship = await getRelationship(sharedById, memory.data.id);

    const messageData = {
      to: email,
      subject: "A memory has been shared with you on Futura",
      text: `${inviterName}${
        relationship ? `, your ${relationship}` : ""
      } shared a memory with you on Futura. View it here: ${shareUrl}`,
      html: options.useHTML
        ? `
        <html>
          <body>
            <h1>Memory Shared</h1>
            <p>${inviterName}${relationship ? `, your ${relationship}` : ""} shared a memory with you.</p>
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
    console.error("Error sending email:", error);
    throw new Error(
      `Failed to send shared memory email to ${email}: ${error instanceof Error ? error.message : "Unknown error"}`
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

  if (rel?.type === "family") {
    const familyRel = await db.query.familyRelationship.findFirst({
      where: eq(familyRelationship.relationshipId, rel.id),
    });
    return familyRel?.familyRole;
  }

  return rel?.type;
}
