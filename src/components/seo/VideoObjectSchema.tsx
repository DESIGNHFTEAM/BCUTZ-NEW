import { Helmet } from 'react-helmet-async';

interface Video {
  url: string;
  name?: string;
  description?: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  duration?: string; // ISO 8601 duration format (e.g., "PT1M30S")
}

interface VideoObjectSchemaProps {
  videos: Video[];
  uploaderName: string;
  uploaderUrl?: string;
}

export function VideoObjectSchema({
  videos,
  uploaderName,
  uploaderUrl,
}: VideoObjectSchemaProps) {
  if (videos.length === 0) return null;

  // Generate a thumbnail URL from the video URL if not provided
  const getThumbnailUrl = (videoUrl: string): string => {
    // For Supabase storage videos, we can't generate thumbnails
    // Use a placeholder or the video URL itself
    return videoUrl;
  };

  const videoSchemas = videos.map((video, index) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name || `Video ${index + 1} by ${uploaderName}`,
    description: video.description || `Professional barber video showcase by ${uploaderName}`,
    thumbnailUrl: video.thumbnailUrl || getThumbnailUrl(video.url),
    contentUrl: video.url,
    uploadDate: video.uploadDate || new Date().toISOString().split('T')[0],
    ...(video.duration && { duration: video.duration }),
    publisher: {
      '@type': 'Organization',
      name: 'BCUTZ',
      url: 'https://bcutz.lovable.app',
      logo: {
        '@type': 'ImageObject',
        url: 'https://bcutz.lovable.app/pwa-512x512.png',
      },
    },
    ...(uploaderUrl && {
      author: {
        '@type': 'Person',
        name: uploaderName,
        url: uploaderUrl,
      },
    }),
  }));

  return (
    <Helmet>
      {videoSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
