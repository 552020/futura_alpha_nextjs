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

  // HTML Content - Enhanced with better styling and layout
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Photo Selection from ${userName}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f9f9f9;
      }
      .container {
        background-color: white;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #e1e5e9;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header h1 {
        color: #2c3e50;
        margin: 0;
        font-size: 24px;
      }
      .date {
        color: #7f8c8d;
        font-size: 14px;
        margin-top: 5px;
      }
      .message-section {
        background-color: #f8f9fa;
        border-left: 4px solid #3498db;
        padding: 15px;
        margin: 20px 0;
        border-radius: 0 4px 4px 0;
      }
      .message-section strong {
        color: #2c3e50;
      }
      .images-section {
        margin: 30px 0;
      }
      .images-header {
        color: #2c3e50;
        font-size: 18px;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e1e5e9;
      }
      .images-list {
        background-color: #f8f9fa;
        border-radius: 6px;
        padding: 20px;
        margin: 0;
        list-style: none;
      }
      .images-list li {
        padding: 15px 0;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: flex-start;
        gap: 15px;
      }
      .images-list li:last-child {
        border-bottom: none;
      }

      .image-preview {
        width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: 8px;
        border: 2px solid #e1e5e9;
        flex-shrink: 0;
        display: block;
        background-color: #f1f3f4;
      }
      .image-preview:hover {
        border-color: #3498db;
        transform: scale(1.02);
        transition: all 0.2s ease;
      }
      .image-details {
        flex-grow: 1;
        min-width: 0;
      }
      .image-name {
        font-weight: 500;
        margin-bottom: 5px;
        word-wrap: break-word;
      }
      .rating {
        color: #f39c12;
        font-size: 14px;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e1e5e9;
        text-align: center;
        color: #7f8c8d;
        font-size: 14px;
      }
      .contact-info {
        background-color: #e8f5e8;
        border: 1px solid #d4edda;
        border-radius: 6px;
        padding: 15px;
        margin: 20px 0;
        text-align: center;
      }
      .selection-id {
        font-family: 'Courier New', monospace;
        background-color: #f1f3f4;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎨 New Photo Selection</h1>
        <div class="date">${formattedDate}</div>
      </div>
      
      <p><strong>From:</strong> ${userName}</p>
      
      ${userMessage
      ? `<div class="message-section">
               <strong>Message from ${userName}:</strong><br>
               ${userMessage.replace(/\n/g, '<br>')}
             </div>`
      : ''
    }
      
      <div class="images-section">
        <div class="images-header">
          Selected Images (${sortedImages.length})
        </div>
        <ul class="images-list">
          ${sortedImages.map((img) => `
            <li>
              <img src="${img.url}" alt="${img.name}" class="image-preview" />
              <div class="image-details">
                <div class="image-name">${img.name}</div>
                ${img.rating ? `<div class="rating">${'★'.repeat(Math.round(img.rating))}${'☆'.repeat(5 - Math.round(img.rating))}</div>` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
      
      <div class="contact-info">
        <p><strong>Need help?</strong> If you encounter any problems or have questions, please contact us on WhatsApp.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>Selection ID: <span class="selection-id">${requestId}</span></p>
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
