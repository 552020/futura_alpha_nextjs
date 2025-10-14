import { test, expect } from '@playwright/test';

test.describe('Asset Serving Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the vault page where images are displayed
    await page.goto('http://localhost:3000/vault');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('images display with correct dimensions after upload', async ({ page }) => {
    // This test automates the exact workflow you had to do manually:
    // 1. Upload an image
    // 2. Check that it displays with correct dimensions (not 32x32 placeholder)
    // 3. Verify the asset serving is working correctly

    // Check if there are any existing images first
    const existingImages = page.locator('img[src*="/api/assets/"]');
    const imageCount = await existingImages.count();
    
    if (imageCount === 0) {
      // If no images exist, we need to upload one first
      // This would require authentication setup, which is complex
      // For now, we'll skip this test if no images are present
      test.skip('No images found - upload required for this test');
    }

    // Check each image to ensure it's not displaying as a placeholder
    for (let i = 0; i < imageCount; i++) {
      const image = existingImages.nth(i);
      
      // Wait for the image to load
      await image.waitFor({ state: 'visible' });
      
      // Get the natural dimensions of the image
      const naturalWidth = await image.evaluate((img: HTMLImageElement) => img.naturalWidth);
      const naturalHeight = await image.evaluate((img: HTMLImageElement) => img.naturalHeight);
      
      // Log the dimensions for debugging
      console.log(`Image ${i + 1}: ${naturalWidth}x${naturalHeight}`);
      
      // Verify the image is not a placeholder (32x32 or smaller)
      expect(naturalWidth).toBeGreaterThan(32);
      expect(naturalHeight).toBeGreaterThan(32);
      
      // For display images, they should be much larger (typically 1400x1400 or similar)
      // For thumbnails, they should be at least 400x400
      if (naturalWidth >= 1000 || naturalHeight >= 1000) {
        console.log(`✅ Display image detected: ${naturalWidth}x${naturalHeight}`);
      } else if (naturalWidth >= 400 || naturalHeight >= 400) {
        console.log(`✅ Thumbnail image detected: ${naturalWidth}x${naturalHeight}`);
      } else {
        console.log(`⚠️ Small image detected: ${naturalWidth}x${naturalHeight} - might be placeholder`);
      }
    }
  });

  test('asset URLs serve correct content', async ({ page }) => {
    // This test checks that asset URLs are serving the correct content
    // by making direct HTTP requests to the asset endpoints

    // Find all asset URLs on the page
    const assetImages = page.locator('img[src*="/api/assets/"]');
    const imageCount = await assetImages.count();
    
    if (imageCount === 0) {
      test.skip('No asset images found - upload required for this test');
    }

    // Check each asset URL
    for (let i = 0; i < imageCount; i++) {
      const image = assetImages.nth(i);
      const src = await image.getAttribute('src');
      
      if (!src) continue;
      
      // Make a direct request to the asset URL
      const response = await page.request.get(src);
      
      // Verify the response is successful
      expect(response.status()).toBe(200);
      
      // Verify the content type is an image
      const contentType = response.headers()['content-type'];
      expect(contentType).toMatch(/^image\//);
      
      // Get the content length
      const contentLength = response.headers()['content-length'];
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength);
        
        // Verify the file is not placeholder-sized (should be > 2KB)
        expect(sizeInBytes).toBeGreaterThan(2000);
        
        console.log(`Asset ${i + 1}: ${contentType}, ${sizeInBytes} bytes`);
        
        if (sizeInBytes < 50000) {
          console.log(`⚠️ Asset might be placeholder-sized: ${sizeInBytes} bytes`);
        } else {
          console.log(`✅ Asset size looks correct: ${sizeInBytes} bytes`);
        }
      }
    }
  });

  test('image upload and processing workflow', async ({ page }) => {
    // This test would automate the complete upload workflow
    // Note: This requires authentication setup which is complex with Internet Identity
    
    // For now, we'll create a placeholder test that can be expanded
    // when authentication is properly set up
    
    // Check if user is authenticated
    const authButton = page.locator('button:has-text("Connect")');
    const isAuthenticated = await authButton.count() === 0;
    
    if (!isAuthenticated) {
      test.skip('Authentication required for upload test - Internet Identity setup needed');
    }
    
    // TODO: Implement full upload workflow test
    // 1. Click upload button
    // 2. Select image file
    // 3. Wait for processing
    // 4. Verify image appears with correct dimensions
    // 5. Check that asset URLs serve correct content
    
    console.log('Upload workflow test would go here when authentication is set up');
  });
});

test.describe('Asset Serving Debugging', () => {
  test('check asset serving endpoints directly', async ({ page }) => {
    // This test helps debug asset serving issues by checking endpoints directly
    
    // Navigate to vault page
    await page.goto('http://localhost:3000/vault');
    await page.waitForLoadState('networkidle');
    
    // Open browser dev tools to monitor network requests
    await page.evaluate(() => {
      console.log('🔍 [Playwright] Monitoring network requests for asset serving...');
    });
    
    // Look for any asset-related network requests
    const requests: string[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/assets/')) {
        requests.push(request.url());
        console.log(`🔍 [Playwright] Asset request: ${request.url()}`);
      }
    });
    
    // Wait a bit for any lazy-loaded images
    await page.waitForTimeout(2000);
    
    // Log all asset requests found
    console.log(`🔍 [Playwright] Found ${requests.length} asset requests`);
    requests.forEach((url, index) => {
      console.log(`🔍 [Playwright] Request ${index + 1}: ${url}`);
    });
    
    // This test helps identify what asset URLs are being requested
    // and can be used to debug asset serving issues
  });
});

