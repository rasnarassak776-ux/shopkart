/**
 * ============================================================================
 * TEMPORARY PRESENTATION DATA — FRONTEND ONLY
 * ============================================================================
 * Static content used to showcase the Shopkart storefront design system before
 * the Product Catalog APIs exist. Nothing here is persisted, seeded or served
 * by any backend service, and it must not be imported by backend code.
 *
 * Replace these exports with Catalog API data in the catalog phase; the
 * components only depend on the view models in `./types`.
 *
 * Photography: Unsplash (https://unsplash.com/license), hotlinked via next/image.
 * Links use PLACEHOLDER_HREF until catalog routes are implemented.
 * ============================================================================
 */
import type { CategorySummary, ProductSummary, Promotion } from './types';

export const PLACEHOLDER_HREF = '#';

const unsplash = (id: string, width = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

export const presentationCategories: CategorySummary[] = [
  {
    slug: 'electronics',
    name: 'Electronics',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '1,200+ items',
    image: { src: unsplash('1593642632559-0c6d3fc62b89', 600), alt: 'Laptop on a bright work desk' },
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '3,400+ items',
    image: { src: unsplash('1556905055-8f358a7a47b2', 600), alt: 'Folded knitwear, denim and a beanie' },
  },
  {
    slug: 'footwear',
    name: 'Footwear',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '850+ items',
    image: { src: unsplash('1560769629-975ec94e6a86', 600), alt: 'Pair of colourful sneakers' },
  },
  {
    slug: 'home-living',
    name: 'Home & Living',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '2,100+ items',
    image: { src: unsplash('1586023492125-27b2c045efd7', 600), alt: 'Yellow armchair in a modern living room' },
  },
  {
    slug: 'beauty',
    name: 'Beauty',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '960+ items',
    image: { src: unsplash('1612817288484-6f916006741a', 600), alt: 'Skincare bottles arranged with stones' },
  },
  {
    slug: 'watches',
    name: 'Watches',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '420+ items',
    image: { src: unsplash('1523275335684-37898b6baf30', 600), alt: 'Minimal white wristwatch' },
  },
  {
    slug: 'audio',
    name: 'Audio',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '380+ items',
    image: { src: unsplash('1583394838336-acd977736f90', 600), alt: 'Black over-ear headphones' },
  },
  {
    slug: 'bags-travel',
    name: 'Bags & Travel',
    href: PLACEHOLDER_HREF,
    itemCountLabel: '540+ items',
    image: { src: unsplash('1553062407-98eeb64c6a62', 600), alt: 'Navy everyday backpack' },
  },
];

export const presentationFeaturedProducts: ProductSummary[] = [
  {
    id: 'demo-aurora-headphones',
    href: PLACEHOLDER_HREF,
    brand: 'Aurora',
    name: 'Aurora Wireless Over-Ear Headphones with Active Noise Cancelling',
    price: 4999,
    compareAtPrice: 7999,
    rating: 4.6,
    reviewCount: 2184,
    badge: 'bestseller',
    image: { src: unsplash('1505740420928-5e560c06d30e'), alt: 'Black wireless headphones on a yellow background' },
  },
  {
    id: 'demo-strata-watch',
    href: PLACEHOLDER_HREF,
    brand: 'Strata',
    name: 'Strata Minimal Analog Watch, 40mm Silicone Strap',
    price: 3299,
    compareAtPrice: 4499,
    rating: 4.4,
    reviewCount: 862,
    image: { src: unsplash('1523275335684-37898b6baf30'), alt: 'White minimalist analog wristwatch' },
  },
  {
    id: 'demo-stride-runner',
    href: PLACEHOLDER_HREF,
    brand: 'Stride',
    name: 'Stride Knit Lightweight Running Shoes',
    price: 2799,
    compareAtPrice: 3999,
    rating: 4.5,
    reviewCount: 1320,
    badge: 'new',
    image: { src: unsplash('1491553895911-0055eca6402d'), alt: 'Grey knit running shoe on a white background' },
  },
  {
    id: 'demo-pulse-smartwatch',
    href: PLACEHOLDER_HREF,
    brand: 'Pulse',
    name: 'Pulse Fit Smartwatch with AMOLED Display & SpO2 Tracking',
    price: 6499,
    compareAtPrice: 9999,
    rating: 4.3,
    reviewCount: 3041,
    image: { src: unsplash('1546868871-7041f2a55e12'), alt: 'Black smartwatch with a vivid watch face' },
  },
  {
    id: 'demo-nomad-backpack',
    href: PLACEHOLDER_HREF,
    brand: 'Nomad',
    name: 'Nomad Everyday Backpack 24L, Water-Resistant',
    price: 1899,
    compareAtPrice: 2799,
    rating: 4.7,
    reviewCount: 954,
    badge: 'bestseller',
    image: { src: unsplash('1553062407-98eeb64c6a62'), alt: 'Navy blue backpack against a light wall' },
  },
  {
    id: 'demo-halo-lamp',
    href: PLACEHOLDER_HREF,
    brand: 'Halo Home',
    name: 'Halo Adjustable Metal Desk Lamp',
    price: 1499,
    compareAtPrice: 2199,
    rating: 4.5,
    reviewCount: 412,
    image: { src: unsplash('1507473885765-e6ed057f782c'), alt: 'Grey adjustable desk lamp' },
  },
  {
    id: 'demo-coast-sunglasses',
    href: PLACEHOLDER_HREF,
    brand: 'Coast',
    name: 'Coast Classic Polarised Sunglasses',
    price: 1299,
    compareAtPrice: 1999,
    rating: 4.2,
    reviewCount: 688,
    image: { src: unsplash('1572635196237-14b3f281503f'), alt: 'Black classic sunglasses on a white background' },
  },
  {
    id: 'demo-studio-headphones',
    href: PLACEHOLDER_HREF,
    brand: 'Aurora',
    name: 'Studio Pro Wired Monitor Headphones',
    price: 8999,
    rating: 4.8,
    reviewCount: 276,
    badge: 'limited',
    image: { src: unsplash('1583394838336-acd977736f90'), alt: 'Black studio monitor headphones' },
  },
];

export const presentationNewArrivals: ProductSummary[] = [
  {
    id: 'demo-ellis-sofa',
    href: PLACEHOLDER_HREF,
    brand: 'Ellis & Co.',
    name: 'Ellis Velvet 3-Seater Sofa, Forest Green',
    price: 32999,
    compareAtPrice: 44999,
    rating: 4.6,
    reviewCount: 148,
    badge: 'new',
    image: { src: unsplash('1555041469-a586c61ea9bc'), alt: 'Green velvet three-seater sofa' },
  },
  {
    id: 'demo-cove-chair',
    href: PLACEHOLDER_HREF,
    brand: 'Ellis & Co.',
    name: 'Cove Upholstered Accent Chair',
    price: 8499,
    compareAtPrice: 11999,
    rating: 4.4,
    reviewCount: 96,
    image: { src: unsplash('1567538096630-e0c55bd6374c'), alt: 'Cream upholstered accent chair' },
  },
  {
    id: 'demo-prism-sneakers',
    href: PLACEHOLDER_HREF,
    brand: 'Stride',
    name: 'Prism Street Sneakers, Multicolour',
    price: 3499,
    rating: 4.5,
    reviewCount: 512,
    badge: 'new',
    image: { src: unsplash('1560769629-975ec94e6a86'), alt: 'Multicolour street sneakers' },
  },
  {
    id: 'demo-essential-tee',
    href: PLACEHOLDER_HREF,
    brand: 'Basics Lab',
    name: 'Essential Heavyweight Cotton Graphic Tee',
    price: 799,
    compareAtPrice: 1199,
    rating: 4.3,
    reviewCount: 1874,
    image: { src: unsplash('1618354691373-d851c5c3a990'), alt: 'Black cotton t-shirt on a hanger' },
  },
];

export const presentationHero: Promotion = {
  id: 'hero-new-season',
  eyebrow: 'New season edit',
  title: 'Everyday essentials, thoughtfully picked.',
  description:
    'Discover fresh arrivals across fashion, home and tech — with free delivery on orders above ₹499 and easy 7-day returns.',
  cta: { label: 'Shop new arrivals', href: PLACEHOLDER_HREF },
  tone: 'sand',
  image: { src: unsplash('1515886657613-9f3515b0c78f', 1200), alt: 'Model wearing a bright yellow tracksuit outdoors' },
};

export const presentationHeroTiles: Promotion[] = [
  {
    id: 'tile-audio-week',
    eyebrow: 'Audio week',
    title: 'Up to 40% off earbuds & headphones',
    cta: { label: 'Shop audio', href: PLACEHOLDER_HREF },
    tone: 'dark',
    image: { src: unsplash('1585155770447-2f66e2a397b5', 800), alt: 'Wireless earbuds floating above a hand' },
  },
  {
    id: 'tile-mens-edit',
    eyebrow: "The men's edit",
    title: 'Watches, sneakers & everyday carry',
    cta: { label: 'Explore the edit', href: PLACEHOLDER_HREF },
    tone: 'accent',
    image: { src: unsplash('1544441893-675973e31985', 800), alt: 'Flat lay of a watch, chinos and white sneakers' },
  },
];

export const presentationPromotions: Promotion[] = [
  {
    id: 'promo-home-refresh',
    eyebrow: 'Home refresh',
    title: 'Furniture & décor from ₹999',
    description: 'Calm, considered pieces for every room.',
    cta: { label: 'Shop home', href: PLACEHOLDER_HREF },
    tone: 'sand',
    image: { src: unsplash('1513694203232-719a280e022f', 1000), alt: 'Bright living room with a dark sofa and cabinet' },
  },
  {
    id: 'promo-beauty-edit',
    eyebrow: 'The beauty edit',
    title: 'Flat 25% off makeup essentials',
    description: 'Brushes, palettes and everyday glow.',
    cta: { label: 'Shop beauty', href: PLACEHOLDER_HREF },
    tone: 'dark',
    image: { src: unsplash('1596462502278-27bfdc403348', 1000), alt: 'Makeup brushes and cosmetics on a peach background' },
  },
];
