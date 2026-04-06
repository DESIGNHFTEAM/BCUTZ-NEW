import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';

interface EventSchemaProps {
  eventName: string;
  description: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  locationName: string;
  locationAddress: string;
  locationCity: string;
  locationCountry: string;
  organizerName: string;
  organizerUrl?: string;
  eventUrl?: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
}

export function EventSchema({
  eventName,
  description,
  startDate,
  startTime,
  endTime,
  locationName,
  locationAddress,
  locationCity,
  locationCountry,
  organizerName,
  organizerUrl,
  eventUrl,
  eventStatus = 'EventScheduled',
}: EventSchemaProps) {
  // Create ISO datetime strings
  const startDateTime = `${startDate}T${startTime}:00`;
  const endDateTime = `${startDate}T${endTime}:00`;

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: eventName,
    description: description,
    startDate: startDateTime,
    endDate: endDateTime,
    eventStatus: `https://schema.org/${eventStatus}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: locationName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: locationAddress,
        addressLocality: locationCity,
        addressCountry: locationCountry,
      },
    },
    organizer: {
      '@type': 'LocalBusiness',
      name: organizerName,
      url: organizerUrl,
    },
    ...(eventUrl && { url: eventUrl }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(eventSchema)}
      </script>
    </Helmet>
  );
}
