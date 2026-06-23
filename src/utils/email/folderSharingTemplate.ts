interface FolderSharingEmailParams {
  folderName: string;
  sharerName: string;
  recipientEmail: string;
  folderUrl: string;
  isNewUser: boolean;
  timestamp?: string;
}

export function renderFolderSharingEmail({
  folderName,
  sharerName,
  recipientEmail: _recipientEmail,
  folderUrl,
  isNewUser,
  timestamp = new Date().toISOString(),
}: FolderSharingEmailParams): { subject: string; html: string; text: string } {
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
  const subject = `📁 ${sharerName} shared a folder with you`;

  // HTML Content - Using global CSS classes
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Folder Shared</title>
    <link rel="stylesheet" href="/globals.css">
  </head>
  <body class="email-body">
    <div class="email-container">
      <div class="email-header">
        <h1>📁 Folder Shared</h1>
        <div class="email-date">${formattedDate}</div>
      </div>
      
      <p><strong>From:</strong> ${sharerName}</p>
      <p><strong>Folder:</strong> ${folderName}</p>
      
      ${isNewUser
      ? `<div class="email-message-section">
             <strong>Welcome!</strong><br>
             A temporary account has been created for you. You can sign in to access the folder and all its contents.
           </div>`
      : `<div class="email-message-section">
             <strong>Folder Access</strong><br>
             You now have access to this shared folder and can view all its contents.
           </div>`
    }
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${folderUrl}" 
           style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          View Folder
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
FOLDER SHARED
${'='.repeat(50)}

From: ${sharerName}
Folder: ${folderName}
Date: ${formattedDate}

${isNewUser
      ? `WELCOME!
A temporary account has been created for you. You can sign in to access the folder and all its contents.`
      : `FOLDER ACCESS
You now have access to this shared folder and can view all its contents.`
    }

View the folder here: ${folderUrl}

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