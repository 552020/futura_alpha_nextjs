import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { userHostingPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { HostingPreferences } from '@/hooks/use-hosting-preferences';

import { logger } from '@/lib/logger';
/**
 * GET /api/me/hosting-preferences
 * Returns the user's current hosting preferences
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's hosting preferences
    const preferences = await db.query.userHostingPreferences.findFirst({
      where: eq(userHostingPreferences.userId, session.user.id),
    });

    // If no preferences exist, return defaults
    if (!preferences) {
      const defaultPreferences: HostingPreferences = {
        frontendHosting: 'vercel',
        backendHosting: 'vercel',
        databaseHosting: ['neon'],
        blobHosting: ['s3'],
      };
      return NextResponse.json(defaultPreferences);
    }

    // Return preferences directly (already in correct format)
    const response: HostingPreferences = {
      frontendHosting: preferences.frontendHosting,
      backendHosting: preferences.backendHosting,
      databaseHosting: preferences.databaseHosting,
      blobHosting: preferences.blobHosting,
      updatedAt: preferences.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching hosting preferences:', undefined, { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/me/hosting-preferences
 * Updates the user's hosting preferences
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const updates: Partial<HostingPreferences> = body;

    // Validate that at least one field is being updated
    const validFields = ['frontendHosting', 'backendHosting', 'databaseHosting', 'blobHosting'];
    const hasValidUpdates = Object.keys(updates).some(key => validFields.includes(key));

    if (!hasValidUpdates) {
      return NextResponse.json({ error: 'No valid hosting preference fields provided' }, { status: 400 });
    }

    // Check if preferences already exist
    const existingPreferences = await db.query.userHostingPreferences.findFirst({
      where: eq(userHostingPreferences.userId, session.user.id),
    });

    let updatedPreferences;

    if (existingPreferences) {
      // Update existing preferences
      const [updated] = await db
        .update(userHostingPreferences)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(userHostingPreferences.userId, session.user.id))
        .returning();

      updatedPreferences = updated;
    } else {
      // Create new preferences with defaults + updates
      const [created] = await db
        .insert(userHostingPreferences)
        .values({
          userId: session.user.id,
          frontendHosting: updates.frontendHosting || 'vercel',
          backendHosting: updates.backendHosting || 'vercel',
          databaseHosting: updates.databaseHosting || ['neon'],
          blobHosting: updates.blobHosting || ['s3'],
        })
        .returning();

      updatedPreferences = created;
    }

    // Return updated preferences directly
    const response: HostingPreferences = {
      frontendHosting: updatedPreferences.frontendHosting,
      backendHosting: updatedPreferences.backendHosting,
      databaseHosting: updatedPreferences.databaseHosting,
      blobHosting: updatedPreferences.blobHosting,
      updatedAt: updatedPreferences.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error updating hosting preferences:', undefined, { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
