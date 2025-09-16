import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/requireAuth';

export async function POST(request: NextRequest) {
  try {
    // Get the user's session - this will bypass NextAuth in test mode
    const session = await requireAuth(request);

    if (!session) {
      return NextResponse.json(
        {
          message: 'Authentication required',
          error: 'No valid session found',
          status: 'unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    return NextResponse.json(
      {
        message: 'Hello from authenticated test endpoint!',
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          image: session.user?.image,
          role: session.user?.role,
          loginProvider: session.user?.loginProvider,
          linkedIcPrincipal: session.user?.linkedIcPrincipal,
          icpPrincipal: session.user?.icpPrincipal,
        },
        sessionData: {
          expires: session.expires,
        },
        receivedData: body,
        timestamp: new Date().toISOString(),
        method: 'POST',
        endpoint: '/api/test/auth',
        status: 'success',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Error in authenticated test endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      },
      { status: 500 }
    );
  }
}

// GET method for testing authenticated GET requests
export async function GET(request: NextRequest) {
  try {
    // Get the user's session - this will bypass NextAuth in test mode
    const session = await requireAuth(request);

    if (!session) {
      return NextResponse.json(
        {
          message: 'Authentication required',
          error: 'No valid session found',
          status: 'unauthorized',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          image: session.user?.image,
          role: session.user?.role,
          loginProvider: session.user?.loginProvider,
          linkedIcPrincipal: session.user?.linkedIcPrincipal,
          icpPrincipal: session.user?.icpPrincipal,
        },
        sessionData: {
          expires: session.expires,
        },
        timestamp: new Date().toISOString(),
        method: 'GET',
        endpoint: '/api/test/auth',
        status: 'success',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Error in authenticated test endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      },
      { status: 500 }
    );
  }
}
