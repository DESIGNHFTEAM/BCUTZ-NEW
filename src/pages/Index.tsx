import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { TrendingBarbersSection } from '@/components/home/TrendingBarbersSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { CTASection } from '@/components/home/CTASection';
import { PageTransition } from '@/components/animations/PageTransition';
import { useAuth } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrganizationSchema } from '@/components/seo/OrganizationSchema';
import { AggregateRatingSchema } from '@/components/seo/AggregateRatingSchema';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [platformStats, setPlatformStats] = useState({ avgRating: 0, reviewCount: 0 });

  // On mobile, redirect to auth if not logged in, or to reels if logged in
  useEffect(() => {
    if (isLoading) return;
    
    if (isMobile) {
      if (!user) {
        navigate('/auth');
      } else {
        navigate('/barbers');
      }
    }
  }, [user, isLoading, isMobile, navigate]);

  // Fetch platform-wide stats for aggregate rating
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.rpc('get_public_stats');
      if (data && data[0]) {
        setPlatformStats({
          avgRating: data[0].avg_rating || 0,
          reviewCount: data[0].user_count || 0,
        });
      }
    };
    fetchStats();
  }, []);

  // Site URL for schema markup
  const siteUrl = 'https://bcutz.lovable.app';

  // On desktop, show the landing page
  return (
    <PageTransition>
      <OrganizationSchema siteUrl={siteUrl} />
      <AggregateRatingSchema
        itemName="BCUTZ"
        itemType="Organization"
        ratingValue={platformStats.avgRating}
        reviewCount={platformStats.reviewCount}
        description="Switzerland's premier barber booking platform connecting clients with verified professional barbers."
        url={siteUrl}
      />
      <div className="min-h-screen bg-background">
<main>
          <HeroSection />
          <TrendingBarbersSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
</div>
    </PageTransition>
  );
};

export default Index;
