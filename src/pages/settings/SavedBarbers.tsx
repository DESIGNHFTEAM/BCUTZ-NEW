import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Star, MapPin, Trash2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/animations/PageTransition';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';

interface SavedBarber {
  id: string;
  barber_id: string;
  barber_profiles: {
    id: string;
    shop_name: string;
    city: string;
    avg_rating: number | null;
    total_reviews: number | null;
    profile_image_url: string | null;
  } | null;
}

const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function SavedBarbers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const location = useLocation();
  
  // Helper to get localized path
  const currentLang = getLanguageFromPath(location.pathname);
  const localizedPath = (path: string) => getPathWithLanguage(path, currentLang);
  
  const [savedBarbers, setSavedBarbers] = useState<SavedBarber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSavedBarbers();
  }, [user]);

  const fetchSavedBarbers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('saved_barbers')
      .select(`
        id,
        barber_id,
        barber_profiles (
          id,
          shop_name,
          city,
          avg_rating,
          total_reviews,
          profile_image_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedBarbers(data as unknown as SavedBarber[]);
    }
    setIsLoading(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase
      .from('saved_barbers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.savedBarbers.removeError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toasts.savedBarbers.removed'),
        description: t('toasts.savedBarbers.removedDesc'),
      });
      setSavedBarbers(savedBarbers.filter(b => b.id !== id));
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
<main className="pt-32 pb-24">
          <div className="container mx-auto px-4 max-w-2xl">
            <Breadcrumbs />
            <Link 
              to={localizedPath("/profile")} 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('savedBarbersPage.backToProfile')}
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: customEase }}
              className="font-display text-4xl md:text-5xl tracking-wider mb-12"
            >
              {t('savedBarbersPage.title')}
            </motion.h1>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse" />
                ))}
              </div>
            ) : savedBarbers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-dashed border-border p-16 text-center"
              >
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground tracking-wider mb-4">{t('savedBarbersPage.noSaved')}</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {t('savedBarbersPage.noSavedDesc')}
                </p>
                <Button asChild>
                  <Link to="/barbers">{t('savedBarbersPage.findBarbers')}</Link>
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {savedBarbers.map((saved, index) => (
                  <motion.div
                    key={saved.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border-2 border-border flex items-center justify-center bg-muted overflow-hidden">
                        {saved.barber_profiles?.profile_image_url ? (
                          <img 
                            src={saved.barber_profiles.profile_image_url} 
                            alt={saved.barber_profiles.shop_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-display">
                            {saved.barber_profiles?.shop_name?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <Link 
                          to={`/barber/${saved.barber_id}`}
                          className="font-display text-lg tracking-wider hover:underline"
                        >
                          {saved.barber_profiles?.shop_name?.toUpperCase() || 'BARBER'}
                        </Link>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {saved.barber_profiles?.city || t('savedBarbersPage.unknown')}
                          </span>
                          {saved.barber_profiles?.avg_rating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-accent text-accent" />
                              {saved.barber_profiles.avg_rating.toFixed(1)}
                              <span className="text-muted-foreground">
                                ({saved.barber_profiles.total_reviews || 0})
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/barber/${saved.barber_id}`}>{t('savedBarbersPage.book')}</Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemove(saved.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        glow={false}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
</div>
    </PageTransition>
  );
}