import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Star, ArrowRight, Scissors, MapPin } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { NeonButtonLink } from '@/components/ui/neon-button';
import { Input } from '@/components/ui/input';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

// Use tuple type for cubic bezier easing
const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  initial: {
    opacity: 0,
    y: 60,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: customEase,
    },
  },
};

const logoVariants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 1,
      ease: customEase,
    },
  },
};

const lineVariants = {
  initial: {
    scaleX: 0,
  },
  animate: {
    scaleX: 1,
    transition: {
      duration: 1.2,
      ease: customEase,
      delay: 0.5,
    },
  },
};

export function HeroSection() {
  const [location, setLocation] = useState('');
  // Real stats - default rating starts at 5.0 until reviews adjust it
  const [stats, setStats] = useState({
    barberCount: 0,
    clientCount: 0,
    avgRating: 5.0,
  });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const routeLocation = useLocation();
  const currentLang = getLanguageFromPath(routeLocation.pathname);

  // Fetch real-time stats from database (public data - works without login)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use the public stats function (no auth required)
        const { data, error } = await supabase.rpc('get_public_stats');

        if (error) {
          console.error('Error fetching stats:', error);
          // Default to 5.0 rating when no data
          setStats({ barberCount: 0, clientCount: 0, avgRating: 5.0 });
        } else if (data && data.length > 0) {
          const statsData = data[0];
          setStats({
            barberCount: Number(statsData.barber_count) || 0,
            clientCount: Number(statsData.user_count) || 0,
            // Default to 5.0 if no reviews yet
            avgRating: Number(statsData.avg_rating) || 5.0,
          });
        }
        setStatsLoaded(true);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({ barberCount: 0, clientCount: 0, avgRating: 5.0 });
        setStatsLoaded(true);
      }
    };

    fetchStats();

    // Poll for stats updates every 60 seconds
    const interval = setInterval(fetchStats, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleSearch = () => {
    const basePath = getPathWithLanguage('/barbers', currentLang);
    navigate(`${basePath}${location ? `?location=${encodeURIComponent(location)}` : ''}`);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K+';
    }
    return num > 0 ? num.toString() + '+' : '0';
  };

  const formatRating = (rating: number): string => {
    return rating > 0 ? rating.toFixed(1) : '—';
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Stark Background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Animated Grid Pattern */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ duration: 2 }}
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="container mx-auto px-4 pt-24 pb-12 relative z-10"
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Logo Display */}
          <motion.div
            variants={logoVariants}
            className="mb-8"
          >
            <Logo size="xl" variant="hero" className="mx-auto h-24 md:h-32" />
          </motion.div>

          {/* Decorative Line */}
          <motion.div 
            variants={lineVariants}
            className="w-24 h-[2px] bg-foreground mx-auto mb-10 origin-left"
          />

          {/* Headline */}
          <div className="overflow-hidden pt-2">
            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-9xl leading-normal mb-2 tracking-wider"
            >
              {t('hero.bookYour')}
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-9xl leading-normal mb-6 md:mb-8 tracking-wider"
            >
              {t('hero.perfectCut')}
            </motion.h1>
          </div>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-base md:text-xl text-foreground/80 max-w-xl mx-auto mb-8 md:mb-12 px-4"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* Search Box */}
          <motion.div
            variants={itemVariants}
            className="max-w-xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-card border-2 border-border rounded-none">
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="pl-12 h-14 bg-transparent border-0 text-lg placeholder:text-muted-foreground rounded-none"
                />
              </div>
              <button
                onClick={handleSearch}
                className="inline-flex items-center justify-center h-14 px-6 bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
              >
                <Search className="w-5 h-5 mr-2" />
                {t('hero.findBarbers')}
              </button>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
          >
            <NeonButtonLink to={getPathWithLanguage('/how-it-works', currentLang)} variant="outline" size="default" glow="subtle">
              {t('hero.howItWorks')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </NeonButtonLink>
            <NeonButtonLink to={getPathWithLanguage('/for-professionals', currentLang)} variant="primary" size="default" glow="premium">
              <Scissors className="w-4 h-4 mr-2" />
              {t('hero.becomeProfessional')}
            </NeonButtonLink>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-12 md:gap-20 mt-20"
          >
            {[
              { value: formatNumber(stats.barberCount), label: t('hero.barbers') },
              { value: formatNumber(stats.clientCount), label: t('hero.happyClients') },
              { value: formatRating(stats.avgRating), label: t('hero.avgRating'), icon: Star },
            ].map((stat, index) => (
              <motion.div 
                key={index} 
                className="text-center group"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-4xl md:text-5xl font-display text-foreground">
                    {stat.value}
                  </span>
                  {stat.icon && <stat.icon className="w-5 h-5 text-foreground fill-foreground" />}
                </div>
                <span className="text-xs text-muted-foreground tracking-widest">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-muted-foreground/50 flex justify-center pt-2"
        >
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-2 bg-foreground" 
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
