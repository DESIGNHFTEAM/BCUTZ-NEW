import { Helmet } from 'react-helmet-async';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_minutes: number;
}

interface ServiceSchemaProps {
  services: Service[];
  providerName: string;
  providerUrl: string;
}

export function ServiceSchema({ services, providerName, providerUrl }: ServiceSchemaProps) {
  if (services.length === 0) return null;

  const serviceSchemas = services.map((service) => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description || `${service.name} service provided by ${providerName}`,
    provider: {
      '@type': 'LocalBusiness',
      name: providerName,
      url: providerUrl,
    },
    offers: {
      '@type': 'Offer',
      price: service.price.toFixed(2),
      priceCurrency: service.currency.toUpperCase(),
      availability: 'https://schema.org/InStock',
    },
    // Duration in ISO 8601 format
    duration: `PT${service.duration_minutes}M`,
  }));

  return (
    <Helmet>
      {serviceSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
