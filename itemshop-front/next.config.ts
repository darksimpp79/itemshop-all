/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Zezwolenie na Hot Reloading (odświeżanie na żywo) przez tunel Cloudflare
  allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS
    ? process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS.split(',').map(s => s.trim())
    : [
        'localhost', 
        '*.localhost',      // Wpuszcza wszystkie testowe sklepy z przycisku "Podgląd"
        'pumpking.club', 
        '*.pumpking.club'   // Wpuszcza WSZYSTKIE obecne i przyszłe sklepy graczy (np. koxcraft)
      ],

  async rewrites() {
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
                       process.env.ITEMSHOP_BACKEND_URL || 
                       'http://127.0.0.1:8080';
    
    // Ensure backend URL doesn't have trailing /api
    const baseUrl = backendUrl.replace(/\/api\/?$/, '');
    
    return [
      {
        // Wszystko, co idzie na /api/... w Next.js
        source: '/api/:path*',
        // Leci do backendu ze zmiennych środowiskowych (reverse proxy w produkcji)
        destination: `${baseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;