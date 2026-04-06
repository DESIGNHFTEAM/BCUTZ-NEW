import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, ArrowRight, Flame, TrendingUp, Scissors, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface TrendingBarber {
  id: string;
  shop_name: string;
  city: string;
  profile_image_url: string | null;
  avg_rating: number;
  total_reviews: number;
  business_type: 'barbershop' | 'salon';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export function TrendingBarbersSection() {
  const { t } = useTranslation();
  const [barbers, setBarbers] = useState<TrendingBarber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrendingBarbers();
  }, []);

  const fetchTrendingBarbers = async () => {
    try {
      // Fetch top-rated, verified barbers
      const { data, error } = await supabase
        .from('barber_profiles_public')
        .select('id, shop_name, city, profile_image_url, avg_rating, total_reviews, business_type')
        .eq('is_verified', true)
        .eq('is_active', true)
        .gte('avg_rating', 4.0)
        .order('avg_rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(6);

      if (!error && data) {
        setBarbers(data.map(b => ({ 
          ...b, 
          business_type: (b.business_type || 'barbershop') as 'barbershop' | 'salon'
        })));
      }
    } catch (err) {
      console.error('Error fetching trending barbers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (barbers.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--accent)) 0%, transparent 50%),
                             radial-gradient(circle at 80% 50%, hsl(var(--accent)) 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-accent" />
            <span className="text-xs tracking-[0.3em] text-accent uppercase">Trending Now</span>
            <Flame className="w-5 h-5 text-accent" />
          </div>
          <h2 className="font-display text-4xl md:text-6xl tracking-wider mb-4">
            TOP RATED
            <br />
            <span className="text-accent">PROFESSIONALS</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover the highest-rated barbers and salons loved by our community
          </p>
        </motion.div>

        {/* Barbers Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {barbers.map((barber, index) => (
            <motion.div key={barber.id} variants={itemVariants}>
              <Link 
                to={`/barber/${barber.id}`}
                className="group block relative aspect-[4/3] overflow-hidden bg-card border-2 border-transparent hover:border-accent transition-all duration-500"
              >
                {/* Image */}
                {barber.profile_image_url ? (
                  <img
                    src={barber.profile_image_url}
                    alt={barber.shop_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-6xl">{barber.business_type === 'salon' ? '💅' : '💈'}</span>
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                {/* Trending Badge */}
                {index < 3 && (
                  <div className="absolute top-4 left-4 flex items-center gap-1 bg-accent px-3 py-1.5 text-accent-foreground text-xs tracking-wider">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-semibold">#{index + 1} TRENDING</span>
                  </div>
                )}

                {/* Rating Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-3 py-1.5 text-xs tracking-wider">
                  <Star className="w-3 h-3 fill-accent text-accent" />
                  <span className="font-semibold">{barber.avg_rating.toFixed(1)}</span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    {barber.business_type === 'salon' ? (
                      <Sparkles className="w-4 h-4 text-accent" />
                    ) : (
                      <Scissors className="w-4 h-4 text-accent" />
                    )}
                    <span className="text-xs tracking-wider text-muted-foreground uppercase">
                      {barber.business_type}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold tracking-wider mb-2 line-clamp-1 group-hover:text-accent transition-colors">
                    {barber.shop_name.toUpperCase()}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground tracking-wider">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{barber.city.toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {barber.total_reviews} reviews
                    </div>
                  </div>
                </div>

                {/* Hover Arrow */}
                <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
                  <div className="w-10 h-10 border-2 border-foreground bg-background flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background tracking-wider"
          >
            <Link to="/barbers">
              VIEW ALL PROFESSIONALS
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
