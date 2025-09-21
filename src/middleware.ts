import { NextRequest, NextResponse } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

export const locales = ['en', 'fr', 'es', 'pt', 'it', 'de', 'pl', 'zh'];
export const defaultLocale = 'en';

const allowedOrigins = ['https://www.futura.now', 'https://futura.now', 'https://peek.futura.now'];

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

function getLocale(request: NextRequest): string | undefined {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  const locale = matchLocale(languages, locales, defaultLocale);
  return locale;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get('origin');
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Rate limiting
  const now = Date.now();
  const rateLimitKey = `${clientIP}-${pathname}`;
  const rateLimitData = rateLimitMap.get(rateLimitKey);

  if (rateLimitData) {
    if (now < rateLimitData.resetTime) {
      if (rateLimitData.count >= RATE_LIMIT_MAX_REQUESTS) {
        console.log(`🚫 Rate limit exceeded: ${clientIP} for ${pathname}`);
        return new NextResponse('Too Many Requests', { status: 429 });
      }
      rateLimitData.count++;
    } else {
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
  } else {
    rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  // Block WordPress attack attempts and common vulnerability scanners
  const isWordPressAttack =
    pathname.includes('/wp-admin') ||
    pathname.includes('/wp-content') ||
    pathname.includes('/wp-includes') ||
    pathname.includes('/wp-login') ||
    pathname.includes('/wp-config') ||
    pathname.includes('/xmlrpc.php') ||
    pathname.includes('/wp-json') ||
    pathname.includes('/.env') ||
    pathname.includes('/admin') ||
    pathname.includes('/administrator') ||
    pathname.includes('/phpmyadmin') ||
    pathname.includes('/.git') ||
    pathname.includes('/.svn') ||
    pathname.includes('/backup') ||
    pathname.includes('/config') ||
    pathname.includes('/database') ||
    pathname.includes('/db') ||
    pathname.includes('/sql') ||
    pathname.includes('/mysql') ||
    pathname.includes('/phpinfo') ||
    pathname.includes('/info.php') ||
    pathname.includes('/test.php') ||
    pathname.includes('/shell') ||
    pathname.includes('/cgi-bin') ||
    pathname.includes('/.htaccess') ||
    pathname.includes('/.htpasswd') ||
    (pathname.includes('/robots.txt') && !pathname.endsWith('/robots.txt'));

  if (isWordPressAttack) {
    console.log(`🚫 Blocked attack attempt: ${pathname} from ${clientIP}`);
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  }

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
    const response = NextResponse.redirect(
      new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url)
    );
    addSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
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
