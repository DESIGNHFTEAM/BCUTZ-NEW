import { Helmet } from 'react-helmet-async';

interface AggregateRatingSchemaProps {
  itemName: string;
  itemType?: 'Organization' | 'LocalBusiness' | 'Product' | 'Service';
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
  description?: string;
  url?: string;
}

export function AggregateRatingSchema({
  itemName,
  itemType = 'Organization',
  ratingValue,
  reviewCount,
  bestRating = 5,
  worstRating = 1,
  description,
  url,
}: AggregateRatingSchemaProps) {
  // Don't render if no reviews
  if (reviewCount === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': itemType,
    name: itemName,
    ...(description && { description }),
    ...(url && { url }),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ratingValue.toFixed(1),
      bestRating,
      worstRating,
      reviewCount,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
