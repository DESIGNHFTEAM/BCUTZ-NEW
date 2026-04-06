import { Helmet } from 'react-helmet-async';

interface OrganizationSchemaProps {
  siteUrl: string;
}

export function OrganizationSchema({ siteUrl }: OrganizationSchemaProps) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'BCUTZ',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/pwa-512x512.png`,
      width: 512,
      height: 512,
    },
    description: 'BCUTZ is a modern booking platform connecting customers with professional barbers and hairstylists across Switzerland.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Schulhausstrasse 15',
      addressLocality: 'St. Antoni',
      postalCode: '1713',
      addressRegion: 'Fribourg',
      addressCountry: 'CH',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'team@bcutz.com',
      contactType: 'customer service',
    },
    sameAs: [],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: 'BCUTZ',
    description: 'Book your perfect haircut with top-rated barbers and salons',
    publisher: {
      '@id': `${siteUrl}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/barbers?location={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
}
