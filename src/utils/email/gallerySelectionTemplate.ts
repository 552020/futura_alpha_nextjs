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

  // HTML Content (commented out in favor of text-only emails)
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>New Photo Selection from ${userName}</title>
  </head>
  <body>
    <p>New Photo Selection from ${userName}</p>
    <p>${formattedDate}</p>
    
    ${
      userMessage
        ? `<p><strong>Message from ${userName}:</strong><br>${userMessage}</p>`
        : ''
    }
    
    <p><strong>Selected Images (${sortedImages.length}):</strong></p>
    <ul>
      ${sortedImages.map((img, i) => `<li>${i + 1}. ${img.name}</li>`).join('')}
    </ul>
    
    <p>If you encounter any problems or have questions, please contact us on WhatsApp.</p>
    
    <p>---<br>
    This is an automated message. Please do not reply directly to this email.<br>
    Selection ID: ${requestId}</p>
  </body>
  </html>
  `;

  // Text Content (simplified for better email client compatibility)
  const text = `
NEW PHOTO SELECTION
${'='.repeat(50)}

From: ${userName}
Date: ${formattedDate}

${
  userMessage
    ? `MESSAGE FROM ${userName.toUpperCase()}:
${userMessage}

`
    : ''
}SELECTED IMAGES (${sortedImages.length}):
${'~'.repeat(50)}
${sortedImages.map((img, i) => `${i + 1}. ${img.name}${img.rating ? ` [Rating: ${'★'.repeat(Math.round(img.rating))}${'☆'.repeat(5 - Math.round(img.rating))}]` : ''}`).join('\n')}

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
