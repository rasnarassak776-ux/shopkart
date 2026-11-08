import { Container, SectionHeading } from '@/components/ui';
import { CategoryCard, HeroBanner, ProductCard, PromoBanner, TrustBar } from '@/features/storefront';
import { getStorefrontCatalog } from '@/features/catalog/storefront-data';
import {
  PLACEHOLDER_HREF,
  presentationCategories,
  presentationHero,
  presentationHeroTiles,
  presentationPromotions,
} from '@/features/storefront/presentation-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const catalog = await getStorefrontCatalog();

  const categories =
    catalog.categories.length > 0 ? catalog.categories : presentationCategories;
  const featuredProducts = catalog.products.slice(0, 8);
  const moreProducts = catalog.products.slice(8, 16);

  return (
    <Container className="space-y-12 pt-4 sm:space-y-16 sm:pt-6">
      <div className="space-y-4">
        <HeroBanner
          hero={presentationHero}
          tiles={presentationHeroTiles}
          secondaryCta={{ label: "Today's deals", href: PLACEHOLDER_HREF }}
        />
        <TrustBar />
      </div>

      <section aria-labelledby="categories-heading">
        <SectionHeading
          id="categories-heading"
          title="Shop by category"
          description="Everything you need, organised the way you shop."
          action={{ label: 'All categories', href: '/products' }}
        />
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-4 md:grid-cols-8">
          {categories.map((category) => (
            <li key={category.slug}>
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="featured-products-heading">
        <SectionHeading
          id="featured-products-heading"
          title="Featured products"
          description="Explore items available in the Shopkart catalog."
          action={{ label: 'View all', href: '/products' }}
        />
        {catalog.error ? (
          <div
            role="alert"
            className="rounded-xl border border-dashed border-danger/30 bg-danger/5 p-8 text-center text-sm text-danger-700"
          >
            <p className="font-semibold text-danger-800">Unable to load catalog products</p>
            <p className="mt-1 text-xs text-danger-600">
              The catalog service is temporarily unreachable. Please try again later.
            </p>
          </div>
        ) : featuredProducts.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {featuredProducts.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-ink-muted">
            <p className="font-medium text-ink">No products available right now.</p>
            <p className="mt-1">Check back soon as new products are added to the catalog.</p>
          </div>
        )}
      </section>

      <section aria-label="Promotions" className="grid gap-4 md:grid-cols-2">
        {presentationPromotions.map((promotion) => (
          <PromoBanner key={promotion.id} promotion={promotion} size="lg" />
        ))}
      </section>

      {moreProducts.length > 0 && (
        <section aria-labelledby="more-products-heading">
          <SectionHeading
            id="more-products-heading"
            title="More to explore"
            description="Discover more items across our categories."
            action={{ label: 'View all', href: '/products' }}
          />
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {moreProducts.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
