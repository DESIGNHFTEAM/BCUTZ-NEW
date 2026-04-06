import { Helmet } from 'react-helmet-async';

interface ContactPageSchemaProps {
  name: string;
  url: string;
  description?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    postalCode?: string;
    addressCountry: string;
  };
  telephone?: string;
  email?: string;
  openingHours?: string;
}

export function ContactPageSchema({
  name,
  url,
  description,
  address,
  telephone,
  email,
  openingHours,
}: ContactPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${name}`,
    url,
    description: description || `Contact ${name} for inquiries, support, and feedback.`,
    mainEntity: {
      '@type': 'Organization',
      name,
      ...(address && {
        address: {
          '@type': 'PostalAddress',
          streetAddress: address.streetAddress,
          addressLocality: address.addressLocality,
          ...(address.postalCode && { postalCode: address.postalCode }),
          addressCountry: address.addressCountry,
        },
      }),
      ...(telephone && { telephone }),
      ...(email && { email }),
      ...(openingHours && { openingHours }),
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        ...(telephone && { telephone }),
        ...(email && { email }),
        availableLanguage: ['English', 'German', 'French', 'Italian'],
      },
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
