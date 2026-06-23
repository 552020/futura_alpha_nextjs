import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const canisterId = process.env.NEXT_PUBLIC_CANISTER_ID_BACKEND;
  
  if (!canisterId) {
    return NextResponse.json({ error: 'Canister ID not configured' }, { status: 500 });
  }

  // Reconstruct the path
  const path = params.path.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  
  // Forward to the canister with proper Host header
  const targetUrl = `http://127.0.0.1:4943/asset/${path}${searchParams ? `?${searchParams}` : ''}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Host': `${canisterId}.localhost:4943`,
        'User-Agent': request.headers.get('user-agent') || 'Next.js ICP Proxy',
      },
    });

    // Forward the response
    const responseBody = await response.arrayBuffer();
    
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': response.headers.get('cache-control') || 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('ICP Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from canister' }, { status: 500 });
  }
}

