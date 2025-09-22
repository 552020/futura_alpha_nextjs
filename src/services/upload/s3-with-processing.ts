/**
 * Enhanced S3 upload with parallel processing
 *
 * Implements the parallel lanes approach:
 * - Lane A: Upload original to S3
 * - Lane B: Process image derivatives (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 */

import { getSingleGrant } from './grant';
import { uploadToS3 } from './single-file-processor';
import { processImageDerivatives } from './image-derivatives';
import { finalizeAllAssets, type ProcessedAssets } from './finalize';

export async function uploadToS3WithProcessing(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  data: { id: string };
  results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
  userId: string;
}> {
  console.log(`🚀 Starting parallel upload for: ${file.name}`);
  const startTime = Date.now();

  try {
    // 1. Single grant before starting both lanes
    const grant = await getSingleGrant(file);

    // 2. Start both lanes simultaneously
    const laneAPromise = uploadToS3(file, onProgress);

    let laneBPromise: Promise<ProcessedAssets> | null = null;
    if (file.type.startsWith('image/')) {
      // Lane B processes original File object immediately
      console.log(`🖼️ Starting Lane B (derivatives) for: ${file.name}`);
      laneBPromise = processImageDerivatives(file, grant);
    } else {
      console.log(`⏭️ Skipping Lane B (derivatives) for non-image: ${file.name}`);
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // Log lane results
    console.log(`📊 Lane A result: ${laneAResult.status === 'fulfilled' ? '✅ success' : '❌ failed'}`);
    console.log(
      `📊 Lane B result: ${laneBResult?.status === 'fulfilled' ? '✅ success' : laneBResult?.status === 'rejected' ? '❌ failed' : '⏭️ skipped'}`
    );

    // 4. Single finalize with all assets and precise statuses
    await finalizeAllAssets(laneAResult, laneBResult);

    const duration = Date.now() - startTime;
    console.log(`✅ Parallel upload completed for: ${file.name} (${duration}ms)`);

    // Return Lane A result (original upload)
    if (laneAResult.status === 'fulfilled') {
      return laneAResult.value;
    } else {
      throw laneAResult.reason;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Parallel upload failed for: ${file.name} (${duration}ms)`, error);
    throw error;
  }
}
