import { Helmet } from 'react-helmet-async';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image?: string;
}

interface ProductSchemaProps {
  products: Product[];
  sellerName: string;
  sellerUrl: string;
}

export function ProductSchema({ products, sellerName, sellerUrl }: ProductSchemaProps) {
  if (products.length === 0) return null;

  const productSchemas = products.map((product) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} offered by ${sellerName}`,
    image: product.image,
    brand: {
      '@type': 'Brand',
      name: sellerName,
    },
    offers: {
      '@type': 'Offer',
      url: sellerUrl,
      price: product.price.toFixed(2),
      priceCurrency: product.currency.toUpperCase(),
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: sellerName,
      },
    },
  }));

  return (
    <Helmet>
      {productSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
