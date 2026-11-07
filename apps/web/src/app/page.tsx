import { Container, SectionHeading } from '@/components/ui';
import { CategoryCard, HeroBanner, ProductCard, PromoBanner, TrustBar } from '@/features/storefront';
import {
  PLACEHOLDER_HREF,
  presentationCategories,
  presentationFeaturedProducts,
  presentationHero,
  presentationHeroTiles,
  presentationNewArrivals,
  presentationPromotions,
} from '@/features/storefront/presentation-data';

export default function HomePage() {
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
          action={{ label: 'All categories', href: PLACEHOLDER_HREF }}
        />
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-4 md:grid-cols-8">
          {presentationCategories.map((category) => (
            <li key={category.slug}>
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trending-heading">
        <SectionHeading
          id="trending-heading"
          title="Trending this week"
          description="Top picks our customers can't stop adding to cart."
          action={{ label: 'View all', href: PLACEHOLDER_HREF }}
        />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {presentationFeaturedProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Promotions" className="grid gap-4 md:grid-cols-2">
        {presentationPromotions.map((promotion) => (
          <PromoBanner key={promotion.id} promotion={promotion} size="lg" />
        ))}
      </section>

      <section aria-labelledby="new-arrivals-heading">
        <SectionHeading
          id="new-arrivals-heading"
          title="New arrivals"
          description="Fresh drops across home, footwear and fashion."
          action={{ label: 'Shop new in', href: PLACEHOLDER_HREF }}
        />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {presentationNewArrivals.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
