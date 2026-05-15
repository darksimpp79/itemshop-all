import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { detectServerNameFromHostname } from '@/lib/domain';

// Next.js 16: proxy.ts must export `proxy`
export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostnameWithPort = request.headers.get('host') || '';
  const hostname = hostnameWithPort.split(':')[0] || "";
  
  // Ignoruj pliki statyczne i API, aby uniknąć pętli i zbędnych zapytań
  if (
    url.pathname.startsWith('/_next') || 
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') // proste sprawdzenie rozszerzeń plików
  ) {
    return NextResponse.next();
  }

  const backendBaseUrl =
    process.env.ITEMSHOP_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, "") ||
    "http://127.0.0.1:8080";

  const domainConfig = {
    baseDomain: process.env.NEXT_PUBLIC_DOMAIN_BASE || 'pumpking.club',
    allowLocalhost: true,
  };
  
  const serverName = detectServerNameFromHostname(hostname, domainConfig);

  // Dodatkowa ochrona przed nazwami systemowymi
  const reservedNames = ['www', 'admin', 'api', 'panel'];

  if (serverName && !reservedNames.includes(serverName.toLowerCase())) {
    // ── DEMO: nie odpytuj backendu, użyj mock API Route Handlers ──────────────
    if (serverName.toLowerCase() === 'demo') {
      if (url.pathname === '/') {
        const u = new URL('/default', request.url);
        u.searchParams.set('serverName', 'demo');
        return NextResponse.rewrite(u);
      }
      if (url.pathname.startsWith('/shop/')) {
        const mode = url.pathname.split('/')[2] || 'survival';
        const u = new URL(`/default/shop/${mode}`, request.url);
        u.searchParams.set('serverName', 'demo');
        return NextResponse.rewrite(u);
      }
      if (url.pathname === '/themes') {
        const u = new URL('/themes', request.url);
        u.searchParams.set('serverName', 'demo');
        return NextResponse.rewrite(u);
      }
      return NextResponse.next();
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[Proxy] Próba identyfikacji: ${serverName} -> ${backendBaseUrl}/api/storefront/${serverName}/info`);

    try {
      // Używamy abort controller, aby fetch nie wisiał w nieskończoność
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${backendBaseUrl}/api/storefront/${serverName}/info`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        // Pobieramy motyw bezpośrednio z pola 'theme' z bazy
        const theme = (data.theme || 'default').toLowerCase();
        
        console.log(`[Proxy] Sukces! Motyw: ${theme} dla ${serverName}`);

        // Dynamiczny rewrite na podstawie motywu
        if (url.pathname === '/') {
          const rewriteUrl = new URL(`/${theme}`, request.url);
          rewriteUrl.searchParams.set('serverName', serverName);
          return NextResponse.rewrite(rewriteUrl);
        }

        if (url.pathname.startsWith('/shop/')) {
          const parts = url.pathname.split('/');
          const mode = parts[2] || 'survival'; // fallback na survival
          const rewriteUrl = new URL(`/${theme}/shop/${mode}`, request.url);
          rewriteUrl.searchParams.set('serverName', serverName);
          return NextResponse.rewrite(rewriteUrl);
        }

        if (url.pathname === '/themes') {
          const rewriteUrl = new URL('/themes', request.url);
          rewriteUrl.searchParams.set('serverName', serverName);
          return NextResponse.rewrite(rewriteUrl);
        }
      } else {
        console.warn(`[Proxy] Sklep ${serverName} nie istnieje w bazie (Status: ${res.status})`);
      }
    } catch (e) {
      console.error("[Proxy] Błąd połączenia z backendem Java. Sprawdź czy Spring Boot działa na 8080.", e);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Matcher wykluczający ścieżki, które nie powinny być procesowane
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};