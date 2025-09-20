```ts
import { NextRequest, NextResponse } from 'next/server';
import { getStorageConfiguration, validateStorageConfiguration, checkRequiredEnvVars } from '@/lib/storage-config';

export async function GET(request: NextRequest) {
  try {
    // Only allow access in development or with proper authentication
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to add authentication check here
      // For now, we'll allow it but you should secure this endpoint
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized access to storage status' }, { status: 401 });
      }
    }

    const config = getStorageConfiguration();
    const validation = validateStorageConfiguration();
    const envCheck = checkRequiredEnvVars();

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        storage: {
          preferred: config.preferred,
          available: config.available.map(provider => ({
            name: provider.name,
            configured: provider.configured,
            available: provider.available,
            description: provider.description,
            priority: provider.priority,
          })),
          fallbacks: config.fallbacks,
          warnings: config.warnings,
        },
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          recommendations: validation.recommendations,
        },
        environment_variables: {
          total_checked: envCheck.missing.length + envCheck.present.length,
          present_count: envCheck.present.length,
          missing_count: envCheck.missing.length,
          // Don't expose actual values for security
          present_vars: envCheck.present,
          missing_vars: envCheck.missing,
        },
        summary: {
          ready_for_uploads: validation.valid && config.available.some(p => p.available),
          primary_storage_working: config.available.find(p => p.name === config.preferred)?.available || false,
          fallback_available: config.fallbacks.length > 0,
          total_providers_configured: config.available.filter(p => p.available).length,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Add cache control to prevent caching of sensitive info
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error checking storage status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check storage configuration',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Optional: Support POST for triggering storage validation/tests
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Storage testing not available in production' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case 'validate':
        const validation = validateStorageConfiguration();
        return NextResponse.json({
          action: 'validate',
          result: validation,
          timestamp: new Date().toISOString(),
        });

      case 'test-upload':
        // You could add actual upload testing here
        return NextResponse.json({
          action: 'test-upload',
          message: 'Upload testing not yet implemented',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            available_actions: ['validate', 'test-upload'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ Error in storage status POST:', error);
    return NextResponse.json(
      {
        error: 'Failed to process storage status request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```
