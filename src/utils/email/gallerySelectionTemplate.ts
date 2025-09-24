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

  // HTML Content
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
      .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
      .subtitle { color: #6c757d; font-style: italic; margin: 10px 0 20px; }
      .message { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
      .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
      .image-card { border: 1px solid #dee2e6; border-radius: 5px; overflow: hidden; }
      .image-card img { width: 100%; height: 150px; object-fit: cover; }
      .image-info { padding: 10px; font-size: 14px; }
      .rating { color: #ffc107; font-size: 14px; margin-top: 5px; }
      .footer { margin-top: 30px; font-size: 12px; color: #6c757d; text-align: center; }
      h1, h2, h3 { color: #2c3e50; }
      .file-list { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
      .file-list h4 { margin-top: 0; }
      .file-list ul { margin: 10px 0 0 0; padding-left: 20px; }
      .contact-info { margin-top: 20px; padding: 15px; background-color: #e9f7ef; border-radius: 5px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>New Photo Selection from ${userName}</h1>
      <p class="subtitle">Made with love in Berlin</p>
      <p>${formattedDate}</p>
    </div>
    
    ${
      userMessage
        ? `
    <div class="message">
      <h3>Message from ${userName}:</h3>
      <p>${userMessage}</p>
    </div>
    `
        : ''
    }
    
    <h3>Selected Images (${sortedImages.length}):</h3>
    
    <div class="file-list">
      <h4>File List:</h4>
      <ul>
        ${sortedImages.map((img, i) => `<li>${i + 1}. ${img.name}</li>`).join('')}
      </ul>
    </div>
    
    <div class="image-grid">
      ${sortedImages
        .map(
          (img, i) => `
        <div class="image-card">
          <img src="${img.url}" alt="${img.name}" />
          <div class="image-info">
            <div><strong>#${i + 1}</strong> ${img.name}</div>
            ${img.rating ? `<div class="rating">${'★'.repeat(Math.round(img.rating))}${'☆'.repeat(5 - Math.round(img.rating))}</div>` : ''}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    
    <div class="contact-info">
      <p>If you encounter any problems or have questions, please contact us on WhatsApp.</p>
    </div>
    
    <div class="footer">
      <p>This is an automated message. Please do not reply directly to this email.</p>
      <p>Selection ID: ${requestId}</p>
    </div>
  </body>
  </html>
  `;

  // Text Content
  const text = `
New Photo Selection from ${userName}
${'='.repeat(50)}

Made with love in Berlin

${
  userMessage
    ? `Message from ${userName}:
${userMessage}

`
    : ''
}Selected ${sortedImages.length} images:

${sortedImages.map((img, i) => `${i + 1}. ${img.name}`).join('\n')}

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
