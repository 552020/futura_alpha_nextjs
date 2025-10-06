import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export type UserSettings = {
  hasAdvancedSettings: boolean;
  updatedAt: string;
};

/**
 * GET /api/user-settings
 * Returns the user's current settings
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's settings
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    // If no settings exist, return defaults
    if (!settings) {
      const defaultSettings: UserSettings = {
        hasAdvancedSettings: false,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json(defaultSettings);
    }

    // Return settings
    const response: UserSettings = {
      hasAdvancedSettings: settings.hasAdvancedSettings,
      updatedAt: settings.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching user settings:', undefined, {
      data: error instanceof Error ? error : undefined,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/user-settings
 * Updates the user's settings
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
    const updates: Partial<UserSettings> = body;

    // Validate that at least one field is being updated
    const validFields = ['hasAdvancedSettings'];
    const hasValidUpdates = Object.keys(updates).some(key => validFields.includes(key));

    if (!hasValidUpdates) {
      return NextResponse.json({ error: 'No valid settings fields provided' }, { status: 400 });
    }

    // Check if settings already exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(userSettings)
        .set({
          hasAdvancedSettings: updates.hasAdvancedSettings ?? existingSettings.hasAdvancedSettings,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, session.user.id))
        .returning();

      updatedSettings = updated;

      // Log settings update
      logger.info('🔄 User settings updated in database', {
        userId: session.user.id,
        changes: updates,
        previousValues: existingSettings,
        newValues: updated,
      });
    } else {
      // Create new settings with defaults + updates
      const [created] = await db
        .insert(userSettings)
        .values({
          userId: session.user.id,
          hasAdvancedSettings: updates.hasAdvancedSettings ?? false,
        })
        .returning();

      updatedSettings = created;

      // Log settings creation
      logger.info('🆕 User settings created in database', {
        userId: session.user.id,
        initialValues: created,
      });
    }

    // Return updated settings
    const response: UserSettings = {
      hasAdvancedSettings: updatedSettings.hasAdvancedSettings,
      updatedAt: updatedSettings.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error updating user settings:', undefined, {
      data: error instanceof Error ? error : undefined,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
