interface GallerySharingEmailParams {
  galleryTitle: string;
  sharerName: string;
  recipientEmail: string;
  galleryUrl: string;
  isNewUser: boolean;
  timestamp?: string;
  accessLevel?: 'read' | 'write';
}

export function renderGallerySharingEmail({
  galleryTitle,
  sharerName,
  recipientEmail: _recipientEmail,
  galleryUrl,
  isNewUser,
  timestamp = new Date().toISOString(),
  accessLevel = 'read',
}: GallerySharingEmailParams): { subject: string; html: string; text: string } {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formattedDate = formatDate(timestamp);
  const subject = `🖼️ ${sharerName} shared a gallery with you`;
  const accessText = accessLevel === 'write' ? 'view and edit' : 'view';

  // HTML Content - Using global CSS classes
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gallery Shared</title>
    <link rel="stylesheet" href="/globals.css">
  </head>
  <body class="email-body">
    <div class="email-container">
      <div class="email-header">
        <h1>🖼️ Gallery Shared</h1>
        <div class="email-date">${formattedDate}</div>
      </div>
      
      <p><strong>From:</strong> ${sharerName}</p>
      <p><strong>Gallery:</strong> ${galleryTitle}</p>
      <p><strong>Access Level:</strong> ${accessLevel === 'write' ? 'View & Edit' : 'View Only'}</p>
      
      ${isNewUser
      ? `<div class="email-message-section">
             <strong>Welcome!</strong><br>
             A temporary account has been created for you. You can sign in to access the gallery and all its memories.
           </div>`
      : `<div class="email-message-section">
             <strong>Gallery Access</strong><br>
             You now have access to this shared gallery and can ${accessText} all its memories.
           </div>`
    }
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${galleryUrl}" 
           style="display: inline-block; background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          View Gallery
        </a>
      </div>
      
      <div class="email-contact-info">
        <p><strong>Need help?</strong> If you encounter any problems or have questions, please contact us for support.</p>
      </div>
      
      <div class="email-footer">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>Shared on ${formattedDate}</p>
      </div>
    </div>
  </body>
  </html>
  `;

  // Text Content (fallback for email clients that don't support HTML)
  const text = `
GALLERY SHARED
${'='.repeat(50)}

From: ${sharerName}
Gallery: ${galleryTitle}
Access Level: ${accessLevel === 'write' ? 'View & Edit' : 'View Only'}
Date: ${formattedDate}

${isNewUser
      ? `WELCOME!
A temporary account has been created for you. You can sign in to access the gallery and all its memories.`
      : `GALLERY ACCESS
You now have access to this shared gallery and can ${accessText} all its memories.`
    }

View the gallery here: ${galleryUrl}

${'='.repeat(50)}

If you encounter any problems or have questions, please contact us for support.

---
This is an automated message. Please do not reply directly to this email.
Shared on ${formattedDate}
`;

  return {
    subject,
    html: html.trim(),
    text: text.trim(),
  };
}