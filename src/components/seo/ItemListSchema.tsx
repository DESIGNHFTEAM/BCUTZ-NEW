import { Helmet } from 'react-helmet-async';

interface ItemListItem {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  url: string;
  rating?: number | null;
  reviewCount?: number | null;
}

interface ItemListSchemaProps {
  items: ItemListItem[];
  listName: string;
  listDescription?: string;
  itemType?: 'ListItem' | 'LocalBusiness' | 'Product' | 'Service';
}

export function ItemListSchema({
  items,
  listName,
  listDescription,
  itemType = 'ListItem',
}: ItemListSchemaProps) {
  if (items.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    description: listDescription,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': itemType === 'ListItem' ? 'Thing' : itemType,
        '@id': item.url,
        name: item.name,
        ...(item.description && { description: item.description }),
        ...(item.image && { image: item.image }),
        url: item.url,
        ...(item.rating && item.reviewCount && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: item.rating.toFixed(1),
            reviewCount: item.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
