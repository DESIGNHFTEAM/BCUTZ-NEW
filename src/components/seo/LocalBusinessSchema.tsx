import { Helmet } from 'react-helmet-async';

interface LocalBusinessSchemaProps {
  name: string;
  description?: string | null;
  image?: string | null;
  city: string;
  country: string;
  rating?: number;
  reviewCount?: number;
  url: string;
}

export function LocalBusinessSchema({
  name,
  description,
  image,
  city,
  country,
  rating,
  reviewCount,
  url,
}: LocalBusinessSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name: name,
    description: description || `Professional barber/salon in ${city}, ${country}`,
    image: image || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: country,
    },
    url: url,
    ...(rating && reviewCount && reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.toFixed(1),
            reviewCount: reviewCount,
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
    priceRange: '$$',
    additionalType: 'https://schema.org/BarberShop',
  };

  // Remove undefined values
  const cleanSchema = JSON.parse(JSON.stringify(schema));

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(cleanSchema)}
      </script>
    </Helmet>
  );
}
