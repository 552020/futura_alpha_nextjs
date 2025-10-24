interface Image {
  url: string;
  name: string;
  rating?: number;
}

interface GallerySelectionEmailParams {
  userName: string;
  images: Image[];
  message?: string;
  timestamp?: string;
  requestId: string;
}

export function renderGallerySelectionEmail({
  userName,
  images,
  message: userMessage,
  timestamp = new Date().toISOString(),
  requestId,
}: GallerySelectionEmailParams): { subject: string; html: string; text: string } {
  // Sort images by rating (highest first) and get top 35
  const sortedImages = [...images].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 35);

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
  const subject = `🎨 New Photo Selection from ${userName} (${sortedImages.length} images)`;

  // HTML Content - Using global CSS classes
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Photo Selection from ${userName}</title>
    <link rel="stylesheet" href="/globals.css">
  </head>
  <body class="email-body">
    <div class="email-container">
      <div class="email-header">
        <h1>🎨 New Photo Selection</h1>
        <div class="email-date">${formattedDate}</div>
      </div>
      
      <p><strong>From:</strong> ${userName}</p>
      
      ${userMessage
      ? `<div class="email-message-section">
               <strong>Message from ${userName}:</strong><br>
               ${userMessage.replace(/\n/g, '<br>')}
             </div>`
      : ''
    }
      
      <div class="email-images-section">
        <div class="email-images-header">
          Selected Images (${sortedImages.length})
        </div>
        <ul class="email-images-list">
          ${sortedImages.map((img) => `
            <li>
              <img src="${img.url}" alt="${img.name}" class="email-image-preview" />
              <div class="email-image-details">
                <div class="email-image-name">${img.name}</div>
                ${img.rating ? `<div class="email-rating">${'★'.repeat(Math.round(img.rating))}${'☆'.repeat(5 - Math.round(img.rating))}</div>` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
      
      <div class="email-contact-info">
        <p><strong>Need help?</strong> If you encounter any problems or have questions, please contact us on WhatsApp.</p>
      </div>
      
      <div class="email-footer">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>Selection ID: <span class="email-selection-id">${requestId}</span></p>
      </div>
    </div>
  </body>
  </html>
  `;

  // Text Content (fallback for email clients that don't support HTML)
  const text = `
NEW PHOTO SELECTION
${'='.repeat(50)}

From: ${userName}
Date: ${formattedDate}

${userMessage
      ? `MESSAGE FROM ${userName.toUpperCase()}:
${userMessage}

`
      : ''
    }SELECTED IMAGES (${sortedImages.length}):
${'~'.repeat(50)}
${sortedImages.map((img) => `• ${img.name}${img.rating ? ` [Rating: ${'★'.repeat(Math.round(img.rating))}${'☆'.repeat(5 - Math.round(img.rating))}]` : ''}`).join('\n')}

${'='.repeat(50)}

If you encounter any problems or have questions, please contact us on WhatsApp.

---
This is an automated message. Please do not reply directly to this email.
Selection ID: ${requestId}
`;

  return {
    subject,
    html: html.trim(),
    text: text.trim(),
  };
}
