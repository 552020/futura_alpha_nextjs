// Simple test script to check presigned URL generation
// Run with: node test-presigned-url.js

const testStorageKey = 'uploads/3c447cee-6af7-4f32-be76-1e36e0aa8ebd/1761207773061-5d85dc41-46df-4f9a-80c6-fa66f0f1f715-display.webp';

async function testPresignedUrl() {
  try {
    console.log('Testing presigned URL generation...');
    console.log('Storage key:', testStorageKey);
    
    // Test the API endpoint directly
    const response = await fetch('http://localhost:3000/api/upload/s3/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: testStorageKey }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Success! Generated presigned URL:');
    console.log('URL length:', data.url.length);
    console.log('URL preview:', data.url.substring(0, 150) + '...');
    
    // Check if it's actually a presigned URL (should have query parameters)
    const url = new URL(data.url);
    const hasSignature = url.searchParams.has('X-Amz-Signature');
    console.log('Has signature:', hasSignature);
    console.log('Query params:', Array.from(url.searchParams.keys()));
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPresignedUrl();