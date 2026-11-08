import * as fs from 'fs';
import * as path from 'path';
import { resolveCatalogImageUrl } from './mappers';

describe('Image URL Resolution & Next.js Rewrite Configuration', () => {
  describe('resolveCatalogImageUrl', () => {
    it('preserves external Unsplash image URLs unchanged', () => {
      const unsplashUrl =
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=600&q=80';
      expect(resolveCatalogImageUrl(unsplashUrl)).toBe(unsplashUrl);
    });

    it('preserves any external http/https image URL unchanged', () => {
      const httpUrl = 'http://example.com/cdn/product.jpg';
      const httpsUrl = 'https://cdn.example.com/product.webp';
      expect(resolveCatalogImageUrl(httpUrl)).toBe(httpUrl);
      expect(resolveCatalogImageUrl(httpsUrl)).toBe(httpsUrl);
    });

    it('returns a normalized relative URL for local catalog images (does not convert to absolute localhost URL)', () => {
      const localWithSlash = '/api/v1/catalog/images/prod-uuid-123.jpg';
      const localWithoutSlash = 'api/v1/catalog/images/prod-uuid-123.jpg';

      expect(resolveCatalogImageUrl(localWithSlash)).toBe(
        '/api/v1/catalog/images/prod-uuid-123.jpg',
      );
      expect(resolveCatalogImageUrl(localWithoutSlash)).toBe(
        '/api/v1/catalog/images/prod-uuid-123.jpg',
      );
    });

    it('returns an empty string when url is undefined, null, or empty (no hardcoded Unsplash fallback)', () => {
      expect(resolveCatalogImageUrl(undefined)).toBe('');
      expect(resolveCatalogImageUrl(null)).toBe('');
      expect(resolveCatalogImageUrl('')).toBe('');
    });
  });

  describe('Next.js rewrite configuration in next.config.mjs', () => {
    it('declares the async rewrites() rule proxying /api/v1/catalog/images/:path* to the catalog API', () => {
      const configPath = path.resolve(__dirname, '../../../next.config.mjs');
      expect(fs.existsSync(configPath)).toBe(true);

      const configText = fs.readFileSync(configPath, 'utf8');

      // Verifies rewrites function exists
      expect(configText).toContain('async rewrites()');
      // Verifies source pattern
      expect(configText).toContain("source: '/api/v1/catalog/images/:path*'");
      // Verifies destination points to catalog API without double slashes
      expect(configText).toContain('${catalogApiUrl}/api/v1/catalog/images/:path*');
      // Verifies fallback catalog URL is defined
      expect(configText).toContain("process.env.NEXT_PUBLIC_CATALOG_API_URL || 'http://localhost:3020'");
      // Verifies remotePatterns is preserved
      expect(configText).toContain('images.unsplash.com');
    });
  });
});
