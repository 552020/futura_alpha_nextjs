import { NextRequest, NextResponse } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

export const locales = ['en', 'fr', 'es', 'pt', 'it', 'de', 'pl', 'zh'];
export const defaultLocale = 'en';

const allowedOrigins = ['https://www.futura.now', 'https://futura.now', 'https://peek.futura.now'];

function getLocale(request: NextRequest): string | undefined {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  const locale = matchLocale(languages, locales, defaultLocale);
  return locale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get('origin');

  // Log for /decide paths
  if (pathname.includes('decide')) {
    // console.log("🔥 DECIDE HIT");
    // console.log(" → Host:", request.headers.get("host"));
    // console.log(" → Origin:", origin);
    // console.log(" → Method:", request.method);
    // console.log(" → Pathname:", pathname);
  }

  // Handle PostHog paths
  const isPosthogPath =
    pathname === '/ingest' ||
    pathname === '/ingest/decide' ||
    pathname === '/ingest/e' ||
    pathname === '/ingest/s' ||
    pathname === '/ingest/array' ||
    pathname === '/ingest/i' ||
    pathname.startsWith('/ingest/decide') ||
    pathname.startsWith('/ingest/static') ||
    pathname.startsWith('/ingest/e') ||
    pathname.startsWith('/ingest/array') ||
    pathname.startsWith('/ingest/i') ||
    pathname.startsWith('/ingest/s');

  // Handle PostHog requests with CORS
  if (isPosthogPath) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });

      if (origin && allowedOrigins.includes(origin)) {
        // console.log("🟢 Handling preflight from allowed origin:", origin);
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Max-Age', '86400');
      } else {
        // console.warn("⛔ Origin not allowed:", origin);
      }

      return response;
    }

    // Handle actual request
    const response = NextResponse.next();

    if (origin && allowedOrigins.includes(origin)) {
      // console.log("✅ Setting CORS headers for origin:", origin);
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Expose-Headers', '*');

      // Log the response headers
      // console.log("🧾 Response Headers being sent:");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      response.headers.forEach((_value, _key) => {
        // console.log(`   - ${_key}: ${_value}`);
      });
    } else {
      // console.warn("❌ No CORS headers set — origin not allowed:", origin);
    }
    return response;
  }

  // Skip static files, API, and tests
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/tests') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|webp)$/)
  ) {
    return NextResponse.next();
  }

  // Handle localization for all other paths
  const missingLocale = locales.every(locale => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`);

  if (missingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const matcher = [
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   */
  '/((?!api|_next/static|_next/image|favicon.ico).*)',
];
