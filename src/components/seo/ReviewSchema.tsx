import { Helmet } from 'react-helmet-async';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

interface ReviewSchemaProps {
  reviews: Review[];
  itemReviewed: {
    name: string;
    type?: string;
  };
}

export function ReviewSchema({ reviews, itemReviewed }: ReviewSchemaProps) {
  // Only include reviews with comments (more valuable for SEO)
  const validReviews = reviews
    .filter((r) => r.comment && r.comment.trim().length > 10)
    .slice(0, 5); // Limit to 5 reviews for schema

  if (validReviews.length === 0) return null;

  const reviewSchemas = validReviews.map((review) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': itemReviewed.type || 'LocalBusiness',
      name: itemReviewed.name,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating.toString(),
      bestRating: '5',
      worstRating: '1',
    },
    author: {
      '@type': 'Person',
      name: review.profiles?.full_name || 'Anonymous',
    },
    datePublished: review.created_at.split('T')[0],
    reviewBody: review.comment,
  }));

  return (
    <Helmet>
      {reviewSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
