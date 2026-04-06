import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, Search, ChevronUp, ChevronDown, Grid, Rows3, Heart, Share2, MessageCircle, Bookmark, X, ArrowRight, Calendar, Flame, Users, Scissors, Sparkles, ChevronDown as ChevronDownIcon, Lock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/animations/PageTransition';
import { TrendingBadge } from '@/components/TrendingBadge';
import { barberMatchesSearch } from '@/lib/locationUtils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import { ItemListSchema } from '@/components/seo/ItemListSchema';

type BusinessType = 'all' | 'barbershop' | 'salon';

interface BarberProfile {
  id: string;
  shop_name: string;
  description: string | null;
  city: string;
  country: string;
  profile_image_url: string | null;
  avg_rating: number;
  total_reviews: number;
  latitude: number | null;
  longitude: number | null;
  business_type: 'barbershop' | 'salon';
  videos: string[] | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function Barbers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationQuery = searchParams.get('location') || '';
  const viewParam = searchParams.get('view');
  const isMobile = useIsMobile();
  
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(locationQuery);
  const [viewMode, setViewMode] = useState<'reels' | 'grid'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(!!locationQuery || viewParam === 'search');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BusinessType>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // Moved before conditional return to fix hooks order
  const handleRefresh = useCallback(async () => {
    await fetchBarbers();
  }, []);

  const handleBookClick = (barberId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in or create an account to book an appointment.',
      });
      navigate('/auth');
    } else {
      navigate(`/barber/${barberId}`);
    }
  };

  // Get unique cities from barbers for the dropdown
  const availableCities = useMemo(() => {
    const cities = [...new Set(barbers.map(b => b.city))].filter(Boolean).sort();
    return cities;
  }, [barbers]);

  // Set initial view mode based on device
  useEffect(() => {
    if (isMobile) {
      setViewMode('reels');
    } else {
      setViewMode('grid');
    }
  }, [isMobile]);

  // Handle view param from bottom nav
  useEffect(() => {
    if (viewParam === 'search') {
      setShowSearch(true);
      setViewMode('grid');
    }
  }, [viewParam]);

  // Sync search query with URL location param
  useEffect(() => {
    if (locationQuery) {
      setSearchQuery(locationQuery);
      setShowSearch(true);
    }
  }, [locationQuery]);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    setIsLoading(true);
    // Use public view that excludes sensitive data (banking, full address, phone)
    // Only show verified and active barbers
    const { data, error } = await supabase
      .from('barber_profiles_public')
      .select('id, shop_name, description, city, country, profile_image_url, avg_rating, total_reviews, latitude, longitude, business_type, videos')
      .eq('is_verified', true)
      .eq('is_active', true);

    if (!error && data) {
      // Default business_type to 'barbershop' if not set
      setBarbers(data.map(b => ({ ...b, business_type: b.business_type || 'barbershop' })) as BarberProfile[]);
    }
    setIsLoading(false);
  };

  const filteredBarbers = barbers.filter((barber) => {
    const matchesSearch = barberMatchesSearch(barber.shop_name, barber.city, searchQuery);
    const matchesType = businessTypeFilter === 'all' || barber.business_type === businessTypeFilter;
    const matchesCity = cityFilter === 'all' || barber.city === cityFilter;
    return matchesSearch && matchesType && matchesCity;
  });

  const navigateBarber = (direction: 'up' | 'down') => {
    if (filteredBarbers.length === 0) return;
    
    if (direction === 'up') {
      // Loop to end if at start
      setCurrentIndex(currentIndex === 0 ? filteredBarbers.length - 1 : currentIndex - 1);
    } else {
      // Loop to start if at end
      setCurrentIndex(currentIndex === filteredBarbers.length - 1 ? 0 : currentIndex + 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'reels') {
        if (e.key === 'ArrowUp') navigateBarber('up');
        if (e.key === 'ArrowDown') navigateBarber('down');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, viewMode, filteredBarbers.length]);

  // Handle touch/scroll/wheel navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container || viewMode !== 'reels') return;

    let startY = 0;
    let isDragging = false;
    let isScrolling = false;
    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return;
      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (Math.abs(diff) > 50) {
        if (diff > 0) navigateBarber('down');
        else navigateBarber('up');
      }
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      if (isScrolling) return;
      isScrolling = true;
      
      if (e.deltaY > 0) {
        navigateBarber('down');
      } else if (e.deltaY < 0) {
        navigateBarber('up');
      }
      
      // Debounce to prevent rapid scrolling
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 300);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, viewMode, filteredBarbers.length]);

  if (viewMode === 'reels') {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-background overflow-hidden pb-14 md:pb-0">
        {/* Top Bar - Compact on mobile */}
        <div className="absolute top-0 left-0 right-0 z-50 p-3 md:p-6 safe-area-pt">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" variant="nav" className="md:hidden" />
              <Logo size="md" variant="nav" className="hidden md:block" />
            </Link>
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-foreground/20 bg-background/20 backdrop-blur-sm hover:bg-foreground hover:text-background transition-all"
                onClick={() => setShowSearch(!showSearch)}
              >
                {showSearch ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Search className="w-4 h-4 md:w-5 md:h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex h-10 w-10 rounded-none border border-foreground/20 bg-background/20 backdrop-blur-sm hover:bg-foreground hover:text-background transition-all"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden space-y-3"
              >
                <Input
                  type="text"
                  placeholder={t('barbers.searchProfessionals')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="bg-background/90 backdrop-blur-sm border-foreground/30 rounded-none h-12 font-sans tracking-wider placeholder:text-muted-foreground/50"
                  autoFocus
                />
                {/* Business Type Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setBusinessTypeFilter('all'); setCurrentIndex(0); }}
                    className={`flex-1 py-2 px-3 text-xs tracking-wider transition-all ${
                      businessTypeFilter === 'all'
                        ? 'bg-foreground text-background'
                        : 'bg-background/50 backdrop-blur-sm border border-foreground/30'
                    }`}
                  >
                    {t('barbers.all')}
                  </button>
                  <button
                    onClick={() => { setBusinessTypeFilter('barbershop'); setCurrentIndex(0); }}
                    className={`flex-1 py-2 px-3 text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      businessTypeFilter === 'barbershop'
                        ? 'bg-foreground text-background'
                        : 'bg-background/50 backdrop-blur-sm border border-foreground/30'
                    }`}
                  >
                    <Scissors className="w-3 h-3" />
                    {t('barbers.barbershops')}
                  </button>
                  <button
                    onClick={() => { setBusinessTypeFilter('salon'); setCurrentIndex(0); }}
                    className={`flex-1 py-2 px-3 text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      businessTypeFilter === 'salon'
                        ? 'bg-foreground text-background'
                        : 'bg-background/50 backdrop-blur-sm border border-foreground/30'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {t('barbers.beautySalons')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Hints - Hide bottom on mobile (use bottom nav) */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-24 z-40 flex-col items-center gap-1">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="opacity-50"
          >
            <ChevronUp className="w-6 h-6" />
          </motion.div>
        </div>
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-8 z-40 flex-col items-center gap-1">
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="opacity-50"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </div>

        {/* Reels Container */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-display text-xl tracking-widest"
              >
                {t('barbers.loading')}
              </motion.div>
            </div>
          ) : filteredBarbers.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <p className="font-display text-2xl tracking-widest mb-6">{t('barbers.noProfessionalsFound')}</p>
                <Button 
                  variant="outline" 
                  onClick={() => { setSearchQuery(''); setBusinessTypeFilter('all'); }}
                  className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background"
                >
                  {t('barbers.clearFilters')}
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-full w-full"
            >
              <ReelCard barber={filteredBarbers[currentIndex]} isLoggedIn={!!user} onBookClick={(id) => handleBookClick(id, { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator - hide on mobile */}
        <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-2">
          {filteredBarbers.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-0.5 transition-all duration-300 ${
                index === currentIndex 
                  ? 'h-8 bg-foreground' 
                  : 'h-3 bg-foreground/30 hover:bg-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Mobile Progress Dots */}
        <div className="md:hidden absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex gap-1.5">
          {filteredBarbers.slice(0, Math.min(filteredBarbers.length, 10)).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex 
                  ? 'w-6 h-1.5 bg-foreground' 
                  : 'w-1.5 h-1.5 bg-foreground/40'
              }`}
            />
          ))}
          {filteredBarbers.length > 10 && (
            <span className="text-xs text-muted-foreground ml-1">+{filteredBarbers.length - 10}</span>
          )}
        </div>
      </div>
    );
  }

  // Grid View

  // Prepare items for schema
  const schemaItems = filteredBarbers.map((barber) => ({
    id: barber.id,
    name: barber.shop_name,
    description: barber.description,
    image: barber.profile_image_url,
    url: `https://bcutz.lovable.app/barber/${barber.id}`,
    rating: barber.avg_rating,
    reviewCount: barber.total_reviews,
  }));

  return (
    <PageTransition>
      <ItemListSchema
        items={schemaItems}
        listName="Professional Barbers in Switzerland"
        listDescription="Browse verified professional barbers and beauty salons. Book your next haircut with BCUTZ."
        itemType="LocalBusiness"
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
          <main className="pt-32 pb-24">
          <div className="container mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
            >
              <div>
                <p className="text-xs tracking-[0.3em] text-muted-foreground mb-4">
                  {t('barbers.discover')} / {t('barbers.professionals')}
                </p>
                <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wider leading-none">
                  {t('barbers.findYour')}
                  <br />
                  <span className="text-accent">{t('barbers.professional')}</span>
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm tracking-wider text-foreground/80">
                  {filteredBarbers.length} {t('barbers.available')}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background"
                  onClick={() => setViewMode('reels')}
                >
                  <Rows3 className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>

            {/* Guest Sign-up Banner */}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="mb-8 p-6 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-2 border-accent/30"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl tracking-wider mb-1">JOIN CUTZ TODAY</h3>
                    <p className="text-foreground/80 text-sm">
                      Create a free account to book appointments, save your favorite barbers, and earn loyalty rewards.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background tracking-wider"
                      onClick={() => navigate('/auth')}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="rounded-none bg-accent text-accent-foreground hover:bg-accent/90 tracking-wider"
                      onClick={() => navigate('/auth?mode=signup')}
                    >
                      Create Account
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Search & Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-12 space-y-4"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('barbers.searchProfessionals')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg tracking-wider placeholder:text-muted-foreground/80 focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                {/* City Filter Dropdown */}
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-full md:w-[200px] h-14 border-0 border-b-2 border-border rounded-none bg-transparent text-lg tracking-wider text-foreground focus:ring-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-foreground/70" />
                      <SelectValue placeholder={t('barbers.allCities')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-2 border-border">
                    <SelectItem value="all" className="tracking-wider">{t('barbers.allCities')}</SelectItem>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city} className="tracking-wider">
                        {city.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Business Type Filter */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setBusinessTypeFilter('all')}
                  className={`py-2 px-4 text-xs tracking-wider border-2 transition-all ${
                    businessTypeFilter === 'all'
                      ? 'bg-foreground text-background border-foreground'
                       : 'bg-background text-foreground border-border hover:border-foreground hover:bg-secondary'
                  }`}
                >
                  {t('barbers.all')}
                </button>
                <button
                  onClick={() => setBusinessTypeFilter('barbershop')}
                  className={`py-2 px-4 text-xs tracking-wider border-2 flex items-center gap-2 transition-all ${
                    businessTypeFilter === 'barbershop'
                      ? 'bg-foreground text-background border-foreground'
                       : 'bg-background text-foreground border-border hover:border-foreground hover:bg-secondary'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  {t('barbers.barbershops')}
                </button>
                <button
                  onClick={() => setBusinessTypeFilter('salon')}
                  className={`py-2 px-4 text-xs tracking-wider border-2 flex items-center gap-2 transition-all ${
                    businessTypeFilter === 'salon'
                      ? 'bg-foreground text-background border-foreground'
                       : 'bg-background text-foreground border-border hover:border-foreground hover:bg-secondary'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('barbers.beautySalons')}
                </button>
              </div>
            </motion.div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-card animate-pulse" />
                ))}
              </div>
            ) : filteredBarbers.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-border">
                <p className="font-display text-2xl tracking-widest mb-6">{t('barbers.noProfessionalsFound')}</p>
                <Button 
                  variant="outline" 
                  onClick={() => { setSearchQuery(''); setBusinessTypeFilter('all'); }}
                  className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background"
                >
                  {t('barbers.clearFilters')}
                </Button>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredBarbers.map((barber) => (
                  <motion.div key={barber.id} variants={itemVariants}>
                    <div className="group relative aspect-[4/5] overflow-hidden bg-card border-2 border-transparent hover:border-foreground transition-all duration-500">
                      {/* Image */}
                      <Link to={`/barber/${barber.id}`} className="block h-full">
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
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                        {/* Business Type & Rating badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-3 py-1.5 text-xs tracking-wider">
                            <Star className="w-3 h-3 fill-accent text-accent" />
                            <span className="font-semibold">{barber.avg_rating.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2.5 py-1 text-[10px] tracking-wider">
                            {barber.business_type === 'salon' ? (
                              <><Sparkles className="w-3 h-3 text-accent" /><span>SALON</span></>
                            ) : (
                              <><Scissors className="w-3 h-3 text-accent" /><span>BARBER</span></>
                            )}
                          </div>
                          {barber.avg_rating >= 4.5 && (
                            <TrendingBadge type="hot" />
                          )}
                          {barber.total_reviews >= 10 && barber.avg_rating >= 4.0 && (
                            <TrendingBadge type="trending" />
                          )}
                        </div>

                        {/* Arrow */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-10 h-10 border-2 border-foreground bg-background flex items-center justify-center">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <h3 className="font-display text-2xl font-bold tracking-wider mb-2 line-clamp-1">
                            {barber.shop_name.toUpperCase()}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground tracking-wider mb-4">
                            <MapPin className="w-4 h-4" />
                            <span className="line-clamp-1">{barber.city.toUpperCase()}</span>
                          </div>
                        </div>
                      </Link>

                      {/* Quick Book Button - Requires login */}
                      <div className="absolute bottom-6 right-6 z-10">
                        <Button 
                          size="sm" 
                          className="rounded-none bg-foreground text-background hover:bg-accent transition-all shadow-lg"
                          onClick={(e) => handleBookClick(barber.id, e)}
                        >
                          {user ? (
                            <>
                              <Calendar className="w-4 h-4 mr-2" />
                              Book
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Login to Book
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </main>
        </PullToRefresh>
</div>
    </PageTransition>
  );
}

// Review type for the overlay
interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  barber_reply: string | null;
  customer_name: string | null;
  customer_avatar: string | null;
}

// Reviews Overlay Component
function ReviewsOverlay({ barberId, shopName, isOpen, onClose }: { barberId: string; shopName: string; isOpen: boolean; onClose: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchReviews();
    }
  }, [isOpen, barberId]);

  const fetchReviews = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, barber_reply, customer_id')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Fetch customer names from profiles_public
      const customerIds = data.map(r => r.customer_id).filter(Boolean);
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('id, full_name, avatar_url')
          .in('id', customerIds);
        
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id!, { full_name: p.full_name, avatar_url: p.avatar_url }]));
        }
      }

      setReviews(data.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        barber_reply: r.barber_reply,
        customer_name: r.customer_id ? profilesMap[r.customer_id]?.full_name || 'Anonymous' : 'Anonymous',
        customer_avatar: r.customer_id ? profilesMap[r.customer_id]?.avatar_url || null : null,
      })));
    }
    setIsLoading(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={onClose}
          />
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl max-h-[75vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            
            {/* Header */}
            <div className="px-4 pb-3 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-lg tracking-wider">REVIEWS</h3>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Reviews List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">No reviews yet</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Be the first to leave a review!</p>
                </div>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="flex gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                      {review.customer_avatar ? (
                        <img src={review.customer_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {review.customer_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold truncate">{review.customer_name}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(review.created_at)}</span>
                      </div>
                      {/* Stars */}
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                      )}
                      {/* Barber reply */}
                      {review.barber_reply && (
                        <div className="mt-2 pl-3 border-l-2 border-accent/40">
                          <p className="text-xs text-muted-foreground mb-0.5 font-semibold">{shopName}</p>
                          <p className="text-xs text-foreground/70">{review.barber_reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Reel Card Component - Instagram-style with video support
function ReelCard({ barber, isLoggedIn, onBookClick }: { barber: BarberProfile; isLoggedIn: boolean; onBookClick: (barberId: string) => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const hasVideos = barber.videos && barber.videos.length > 0;

  // Check if already saved
  useEffect(() => {
    if (!user) return;
    const checkSaved = async () => {
      const { data } = await supabase
        .from('saved_barbers')
        .select('id')
        .eq('user_id', user.id)
        .eq('barber_id', barber.id)
        .maybeSingle();
      setLiked(!!data);
    };
    checkSaved();
  }, [user, barber.id]);

  // Auto-play video when card mounts or video changes
  useEffect(() => {
    if (videoRef.current && hasVideos) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIndex, barber.id]);

  // Reset video index when barber changes
  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [barber.id]);

  // Cycle through videos on end
  const handleVideoEnded = () => {
    if (hasVideos && barber.videos!.length > 1) {
      setCurrentVideoIndex((prev) => (prev + 1) % barber.videos!.length);
    }
  };

  const handleVideoPrev = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (hasVideos && barber.videos!.length > 1) {
      setCurrentVideoIndex((prev) => (prev - 1 + barber.videos!.length) % barber.videos!.length);
    }
  };

  const handleVideoNext = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (hasVideos && barber.videos!.length > 1) {
      setCurrentVideoIndex((prev) => (prev + 1) % barber.videos!.length);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to save barbers.' });
      navigate('/auth');
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);

    if (liked) {
      await supabase.from('saved_barbers').delete().eq('user_id', user.id).eq('barber_id', barber.id);
      setLiked(false);
    } else {
      await supabase.from('saved_barbers').insert({ user_id: user.id, barber_id: barber.id });
      setLiked(true);
    }
    setLikeLoading(false);
  };

  const handleBook = () => {
    if (!isLoggedIn) {
      toast({
        title: 'Login Required',
        description: 'Please log in or create an account to book an appointment.',
      });
      navigate('/auth');
    } else {
      navigate(`/barber/${barber.id}`);
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* Background Video or Image */}
      <div className="absolute inset-0">
        {hasVideos ? (
          <video
            ref={videoRef}
            key={barber.videos![currentVideoIndex]}
            src={barber.videos![currentVideoIndex]}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop={barber.videos!.length === 1}
            playsInline
            onEnded={handleVideoEnded}
          />
        ) : barber.profile_image_url ? (
          <img
            src={barber.profile_image_url}
            alt={barber.shop_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-[80px] md:text-[120px]">{barber.business_type === 'salon' ? '💅' : '💈'}</span>
          </div>
        )}
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

        {/* Tap zones for skipping videos */}
        {hasVideos && barber.videos!.length > 1 && (
          <>
            <div
              className="absolute left-0 top-0 w-1/3 h-2/3 z-30 cursor-pointer"
              onClick={handleVideoPrev}
            />
            <div
              className="absolute right-0 top-0 w-1/3 h-2/3 z-30 cursor-pointer"
              onClick={handleVideoNext}
            />
          </>
        )}
      </div>

      {/* Video progress bars - tappable */}
      {hasVideos && barber.videos!.length > 1 && (
        <div className="absolute top-14 left-4 right-4 z-50 flex gap-1">
          {barber.videos!.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentVideoIndex(idx); }}
              className={`h-1 flex-1 rounded-full transition-all ${
                idx === currentVideoIndex ? 'bg-foreground' : 'bg-foreground/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Right Side Actions */}
      <div className="absolute right-3 md:right-6 bottom-28 md:bottom-40 flex flex-col items-center gap-4 md:gap-6 z-40">
        {/* Like / Save Barber */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <motion.div 
            animate={liked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              liked 
                ? 'bg-red-500' 
                : 'bg-background/30 backdrop-blur-sm'
            }`}
          >
            <Heart className={`w-5 h-5 md:w-6 md:h-6 ${liked ? 'fill-white text-white' : ''}`} />
          </motion.div>
          <span className="text-[10px]">{liked ? 'Saved' : 'Like'}</span>
        </motion.button>

        {/* Reviews / Comments */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowReviews(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-background/30 backdrop-blur-sm">
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-[10px]">{barber.total_reviews}</span>
        </motion.button>

        {/* Bookmark */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setSaved(!saved)}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            saved 
              ? 'bg-foreground' 
              : 'bg-background/30 backdrop-blur-sm'
          }`}>
            <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${saved ? 'fill-background text-background' : ''}`} />
          </div>
          <span className="text-[10px]">Save</span>
        </motion.button>

        {/* Share */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={async () => {
            try {
              await navigator.share?.({
                title: barber.shop_name,
                url: `${window.location.origin}/barber/${barber.id}`,
              });
            } catch {
              navigator.clipboard?.writeText(`${window.location.origin}/barber/${barber.id}`);
              toast({ title: 'Link copied!' });
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-background/30 backdrop-blur-sm">
            <Share2 className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-[10px]">Share</span>
        </motion.button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-16 md:bottom-0 left-0 right-16 md:right-24 p-4 md:p-8 z-40">
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-2 md:mb-4">
            <div className="flex items-center gap-1 bg-accent px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs tracking-wider text-background rounded-full">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-bold">{barber.avg_rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 bg-background/30 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs tracking-wider rounded-full">
              <Users className="w-3 h-3" />
              <span>{barber.total_reviews}</span>
            </div>
            <div className="flex items-center gap-1 bg-background/30 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs tracking-wider rounded-full">
              {barber.business_type === 'salon' ? (
                <><Sparkles className="w-3 h-3 text-accent" /><span>SALON</span></>
              ) : (
                <><Scissors className="w-3 h-3 text-accent" /><span>BARBER</span></>
              )}
            </div>
          </div>
          
          <h2 className="font-display text-2xl md:text-5xl font-bold tracking-wider mb-1 md:mb-3 leading-none">
            {barber.shop_name.toUpperCase()}
          </h2>
          
          <div className="flex items-center gap-1.5 text-foreground/70 text-xs md:text-sm">
            <MapPin className="w-3 h-3 md:w-4 md:h-4" />
            <span>{barber.city}</span>
          </div>
          
          {barber.description && (
            <p className="hidden md:block text-foreground/70 line-clamp-2 max-w-lg mt-4">
              {barber.description}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <Button 
          onClick={handleBook}
          className="h-11 md:h-14 px-6 md:px-10 text-xs md:text-sm tracking-widest font-semibold rounded-full bg-foreground text-background hover:bg-accent hover:text-background transition-all duration-300"
        >
          {isLoggedIn ? 'BOOK NOW' : 'LOGIN TO BOOK'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Reviews Overlay */}
      <ReviewsOverlay
        barberId={barber.id}
        shopName={barber.shop_name}
        isOpen={showReviews}
        onClose={() => setShowReviews(false)}
      />
    </div>
  );
}
