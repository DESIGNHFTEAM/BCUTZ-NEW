import { Helmet } from 'react-helmet-async';

interface SoftwareApplicationSchemaProps {
  name: string;
  description: string;
  applicationCategory?: string;
  operatingSystem?: string[];
  url: string;
  image?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  offers?: {
    price: string;
    priceCurrency: string;
  };
  author?: {
    name: string;
    url?: string;
  };
  downloadUrl?: string;
  softwareVersion?: string;
  datePublished?: string;
  features?: string[];
}

export function SoftwareApplicationSchema({
  name,
  description,
  applicationCategory = 'LifestyleApplication',
  operatingSystem = ['iOS', 'Android', 'Windows', 'macOS'],
  url,
  image,
  aggregateRating,
  offers,
  author,
  downloadUrl,
  softwareVersion,
  datePublished,
  features,
}: SoftwareApplicationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory,
    operatingSystem: operatingSystem.join(', '),
    url,
    ...(image && { image }),
    ...(downloadUrl && { downloadUrl }),
    ...(softwareVersion && { softwareVersion }),
    ...(datePublished && { datePublished }),
    ...(features && { featureList: features.join(', ') }),
    ...(aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue.toFixed(1),
        reviewCount: aggregateRating.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(offers && {
      offers: {
        '@type': 'Offer',
        price: offers.price,
        priceCurrency: offers.priceCurrency,
      },
    }),
    ...(author && {
      author: {
        '@type': 'Organization',
        name: author.name,
        ...(author.url && { url: author.url }),
      },
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
