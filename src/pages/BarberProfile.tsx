import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Star, Clock, Calendar, ArrowLeft, ArrowRight,
  ChevronLeft, ChevronRight, Check, X, Image as ImageIcon, MessageSquare, Pen, SlidersHorizontal,
  RefreshCw, AlertTriangle, MessageCircle
} from 'lucide-react';
import { LazyImage } from '@/components/ui/lazy-image';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, addDays, isSameDay } from 'date-fns';
import { PageTransition } from '@/components/animations/PageTransition';
import { ReportButton } from '@/components/ReportButton';
import { AdminBadge } from '@/components/AdminBadge';
import { LikeButton } from '@/components/LikeButton';
import { VideoGallery } from '@/components/VideoGallery';
import { ChatDialog } from '@/components/ChatDialog';
import { WriteReviewDialog } from '@/components/WriteReviewDialog';
import { VoucherCodeInput } from '@/components/VoucherCodeInput';
import { CurrencySelector, CurrencyDisclaimer } from '@/components/CurrencySelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PullToRefresh } from '@/components/PullToRefresh';
import { calculateBookingFee } from '@/lib/feeCalculator';
import { useBookingPreflight } from '@/hooks/useBookingPreflight';
import { useTranslation } from 'react-i18next';
import { LocalBusinessSchema } from '@/components/seo/LocalBusinessSchema';
import { ReviewSchema } from '@/components/seo/ReviewSchema';
import { ServiceSchema } from '@/components/seo/ServiceSchema';
import { VideoObjectSchema } from '@/components/seo/VideoObjectSchema';

type ReviewSortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

interface BarberProfile {
  id: string;
  user_id: string;
  shop_name: string;
  description: string | null;
  city: string;
  country: string;
  profile_image_url: string | null;
  gallery_images: string[];
  videos: string[];
  avg_rating: number;
  total_reviews: number;
  is_admin?: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  barber_reply: string | null;
  customer_id: string;
  is_admin?: boolean;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface BlockedTime {
  blocked_date: string;
  start_time: string;
  end_time: string;
}

interface ExistingBooking {
  booking_date: string;
  start_time: string;
  end_time: string;
}

// Platform fee is now calculated dynamically based on currency

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  }
};

export default function BarberProfile() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency, formatPrice } = useCurrency();

  // Use preflight hook for unified loading of barber, services, and availability
  const preflight = useBookingPreflight(id);

  // Local state for reviews and UI
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'service' | 'datetime' | 'confirm'>('service');
  const [isBooking, setIsBooking] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewableBooking, setReviewableBooking] = useState<{ id: string } | null>(null);
  const [visibleReviewCount, setVisibleReviewCount] = useState(2);
  const [reviewPage, setReviewPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');
  const reviewsRef = useRef<HTMLDivElement>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: string; code: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  // Derived data from preflight with safe defaults
  const barber = preflight.data.barber as BarberProfile | null;
  const services = (preflight.data.services || []) as Service[];
  const blockedTimes = preflight.data.blockedTimes || [];
  const existingBookings = preflight.data.existingBookings || [];
  const isLoading = preflight.isLoading;
  const loadError = preflight.error;
  
  // Calculate dynamic platform fee based on user's currency
  const getPlatformFee = useCallback((servicePrice: number, serviceCurrency: string) => {
    return calculateBookingFee(servicePrice, currency);
  }, [currency]);

  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // Fetch reviews separately (they can load after the main page)
  useEffect(() => {
    if (id && preflight.isReady) {
      fetchReviews();
      fetchReviewableBooking();
    }
  }, [id, user, preflight.isReady]);

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchReviewableBooking = async () => {
    if (!user || !id) return;
    
    // Find a completed booking that hasn't been reviewed yet
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('barber_id', id)
      .eq('customer_id', user.id)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false })
      .limit(10);

    if (!bookings || bookings.length === 0) {
      setReviewableBooking(null);
      return;
    }

    // Check which bookings already have reviews
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('booking_id')
      .in('booking_id', bookings.map(b => b.id));

    const reviewedBookingIds = new Set(existingReviews?.map(r => r.booking_id) || []);
    const unreviewedBooking = bookings.find(b => !reviewedBookingIds.has(b.id));

    setReviewableBooking(unreviewedBooking || null);
  };

  const handleOpenReviewDialog = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to write a review.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!reviewableBooking) {
      toast({
        title: 'No completed bookings',
        description: 'You can only review after completing an appointment at this barber.',
        variant: 'destructive',
      });
      return;
    }

    setReviewDialogOpen(true);
  };

  // fetchBarber, fetchServices, fetchBlockedTimes, fetchExistingBookings are now handled by useBookingPreflight

  const fetchReviews = async (page = 0, append = false, sort: ReviewSortOption = reviewSort) => {
    const pageSize = 10;
    
    // Determine order based on sort option
    let orderColumn: 'created_at' | 'rating' = 'created_at';
    let ascending = false;
    
    switch (sort) {
      case 'newest':
        orderColumn = 'created_at';
        ascending = false;
        break;
      case 'oldest':
        orderColumn = 'created_at';
        ascending = true;
        break;
      case 'highest':
        orderColumn = 'rating';
        ascending = false;
        break;
      case 'lowest':
        orderColumn = 'rating';
        ascending = true;
        break;
    }
    
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, barber_reply, customer_id')
      .eq('barber_id', id)
      .order(orderColumn, { ascending })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('fetchReviews error:', error);
      return;
    }

    if (!data) return;

    // Check if there are more reviews
    setHasMoreReviews(data.length === pageSize);

    // IMPORTANT: Do NOT join profiles here. Public visitors often can't read profiles due to RLS,
    // and that would make the entire reviews query fail.
    const reviewsWithAdminStatus = await Promise.all(
      data.map(async (review) => {
        if (review.customer_id) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', review.customer_id)
            .eq('role', 'admin')
            .maybeSingle();
          return { ...review, profiles: null, is_admin: !!roleData };
        }
        return { ...review, profiles: null, is_admin: false };
      })
    );

    if (append) {
      setReviews(prev => [...prev, ...(reviewsWithAdminStatus as unknown as Review[])]);
    } else {
      setReviews(reviewsWithAdminStatus as unknown as Review[]);
    }
  };

  const handleSortChange = (value: ReviewSortOption) => {
    setReviewSort(value);
    setReviewPage(0);
    setVisibleReviewCount(2);
    fetchReviews(0, false, value);
  };

  const handleShowMoreReviews = () => {
    if (visibleReviewCount < reviews.length) {
      // Show more from already loaded reviews (up to 10)
      setVisibleReviewCount(Math.min(visibleReviewCount + 4, 10, reviews.length));
    } else if (hasMoreReviews) {
      // Load next page
      setIsLoadingMoreReviews(true);
      const nextPage = reviewPage + 1;
      setReviewPage(nextPage);
      fetchReviews(nextPage, true).finally(() => {
        setIsLoadingMoreReviews(false);
        setVisibleReviewCount(prev => prev + 4);
      });
    }
  };

  // fetchBlockedTimes and fetchExistingBookings are now handled by useBookingPreflight

  const isTimeSlotAvailable = (date: Date, time: string): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check blocked times
    const isBlocked = blockedTimes.some((bt) => {
      if (bt.blocked_date !== dateStr) return false;
      return time >= bt.start_time.slice(0, 5) && time < bt.end_time.slice(0, 5);
    });
    if (isBlocked) return false;

    // Check existing bookings
    const isBooked = existingBookings.some((eb) => {
      if (eb.booking_date !== dateStr) return false;
      return time >= eb.start_time.slice(0, 5) && time < eb.end_time.slice(0, 5);
    });
    if (isBooked) return false;

    // Check if time is in the past
    const now = new Date();
    const slotDate = new Date(dateStr + 'T' + time);
    if (slotDate <= now) return false;

    return true;
  };

  const handleServiceSelect = (service: Service) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in or create an account to book an appointment.',
      });
      navigate('/auth');
      return;
    }
    setSelectedService(service);
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setStep('datetime');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('confirm');
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!selectedService || !selectedTime || !barber) return;

    setIsBooking(true);

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + selectedService.duration_minutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    const platformFee = getPlatformFee(selectedService.price, selectedService.currency);
    const totalAmount = selectedService.price + platformFee;

    // Create the booking first
    const { data: booking, error } = await supabase.from('bookings').insert({
      customer_id: user.id,
      barber_id: barber.id,
      service_id: selectedService.id,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTime,
      end_time: endTime,
      service_name: selectedService.name,
      service_price: selectedService.price,
      platform_fee: platformFee,
      total_amount: totalAmount,
      currency: currency, // Use user's preferred currency
      status: 'pending',
    }).select().single();

    if (error || !booking) {
      toast({
        title: 'Booking failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setIsBooking(false);
      return;
    }

    // Now redirect to Stripe checkout
    try {
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-booking-checkout',
        {
          body: {
            bookingId: booking.id,
            serviceId: selectedService.id,
            barberId: barber.id,
            voucherCode: appliedVoucher?.code || undefined,
            currency: currency, // Pass user's preferred currency
          },
        }
      );

      if (checkoutError || !checkoutData?.url) {
        throw new Error(checkoutError?.message || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = checkoutData.url;
    } catch (checkoutErr) {
      console.error('Checkout error:', checkoutErr);
      toast({
        title: 'Payment setup failed',
        description: 'Booking created but payment failed. Go to My Bookings to pay.',
        variant: 'destructive',
      });
      navigate('/bookings');
    }

    setIsBooking(false);
  };

  const allImages = barber ? [barber.profile_image_url, ...(barber.gallery_images || [])].filter(Boolean) as string[] : [];

  // Shuffle gallery images (after profile image) and videos randomly per page load
  const shuffledImages = useMemo(() => {
    if (allImages.length <= 1) return allImages;
    const [profile, ...rest] = allImages;
    const shuffled = [...rest].sort(() => Math.random() - 0.5);
    return [profile, ...shuffled];
  }, [allImages.join(',')]);

  const shuffledVideos = useMemo(() => {
    const vids = barber?.videos || [];
    if (vids.length <= 1) return vids;
    return [...vids].sort(() => Math.random() - 0.5);
  }, [barber?.videos?.join(',')]);

  // Must be before conditional returns to follow React hooks rules
  const handleRefresh = useCallback(async () => {
    await preflight.refetch();
    if (preflight.isReady) {
      await fetchReviews();
    }
  }, [id, preflight]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
<div className="pt-32 pb-16 container mx-auto px-4">
          <div className="h-[60vh] bg-muted animate-pulse mb-8" />
          <div className="h-8 w-1/3 bg-muted animate-pulse mb-4" />
          <div className="h-4 w-1/2 bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
<div className="pt-32 pb-16 container mx-auto px-4 text-center">
            <h1 className="font-display text-4xl tracking-wider mb-4">
              {loadError ? t('barberProfile.couldNotLoad') : t('barberProfile.barberNotFound')}
            </h1>
            {loadError && (
              <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                {loadError}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => preflight.refetch()}
                className="rounded-none gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('barberProfile.retry')}
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-none border-2"
              >
                <Link to="/barbers">{t('barberProfile.browseBarbers')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Generate the current page URL for schema
  const currentUrl = typeof window !== 'undefined' 
    ? window.location.href 
    : `https://bcutz.lovable.app/barber/${id}`;

  return (
    <PageTransition>
      <LocalBusinessSchema
        name={barber.shop_name}
        description={barber.description}
        image={barber.profile_image_url}
        city={barber.city}
        country={barber.country}
        rating={barber.avg_rating}
        reviewCount={barber.total_reviews}
        url={currentUrl}
      />
      <ReviewSchema
        reviews={reviews}
        itemReviewed={{ name: barber.shop_name, type: 'LocalBusiness' }}
      />
      <ServiceSchema
        services={services}
        providerName={barber.shop_name}
        providerUrl={currentUrl}
      />
      {barber.videos && barber.videos.length > 0 && (
        <VideoObjectSchema
          videos={barber.videos.map((url) => ({ url }))}
          uploaderName={barber.shop_name}
          uploaderUrl={currentUrl}
        />
      )}
      <div className="min-h-screen bg-background">
<PullToRefresh onRefresh={handleRefresh}>
          <main className="pt-20">
            <div className="container mx-auto px-4 mb-4">
              <Breadcrumbs />
            </div>
          {/* Hero Section */}
          <div className="relative h-[60vh] md:h-[70vh] bg-muted">
            {barber.profile_image_url ? (
              <LazyImage
                src={barber.profile_image_url}
                alt={barber.shop_name}
                className="w-full h-full"
                progressive
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[150px]">💈</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            
            {/* Back Button */}
            <Link 
              to="/barbers"
              className="absolute top-24 left-4 md:left-8 z-10 flex items-center gap-2 text-sm tracking-wider hover:underline underline-offset-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('barberProfile.back')}
            </Link>

            {/* Gallery Button */}
            {shuffledImages.length > 1 && (
              <button
                onClick={() => setShowGallery(true)}
                className="absolute top-24 right-4 md:right-8 z-10 flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm border border-foreground/20 text-sm tracking-wider hover:bg-foreground hover:text-background transition-all"
              >
                <ImageIcon className="w-4 h-4" />
                {shuffledImages.length} {t('barberProfile.photos')}
              </button>
            )}

            {/* Hero Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="container mx-auto"
              >
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <button
                    onClick={scrollToReviews}
                    className="flex items-center gap-2 bg-accent px-4 py-2 text-background text-sm tracking-wider hover:bg-accent/90 transition-colors cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{barber.avg_rating.toFixed(1)}</span>
                  </button>
                  <button
                    onClick={scrollToReviews}
                    className="flex items-center gap-2 border border-foreground/30 px-4 py-2 text-sm tracking-wider hover:bg-foreground/10 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{barber.total_reviews} {t('barberProfile.reviews')}</span>
                  </button>
                  {barber.is_admin && <AdminBadge />}
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-wider leading-none">
                    {barber.shop_name.toUpperCase()}
                  </h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-muted-foreground tracking-wider text-sm">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {barber.city.toUpperCase()}, {barber.country.toUpperCase()}
                  </span>
                  <LikeButton barberId={barber.id} variant="button" showCount />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-foreground/30 text-foreground hover:bg-foreground/10"
                    onClick={() => {
                      if (!user) {
                        toast({ title: 'Login required', description: 'Please log in to send a message.' });
                        navigate('/auth');
                        return;
                      }
                      setChatOpen(true);
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('barberProfile.message', 'MESSAGE')}
                  </Button>
                  <ReportButton reportedBarberId={barber.id} variant="button" />
                </div>
              </motion.div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-16">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-16">
                {/* Description */}
                {barber.description && (
                  <motion.section
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                  >
                    <h2 className="font-display text-2xl tracking-wider mb-6">{t('barberProfile.about')}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {barber.description}
                    </p>
                  </motion.section>
                )}

                {/* Location Info - Show only city/country to public, full details after login */}
                <motion.section
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <h2 className="font-display text-2xl tracking-wider mb-6">{t('barberProfile.location')}</h2>
                  <div className="border-2 border-border p-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                      <MapPin className="w-5 h-5" />
                      <span className="tracking-wider">
                        {barber.city.toUpperCase()}, {barber.country.toUpperCase()}
                      </span>
                    </div>
                    {user ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-4">
                          {t('barberProfile.locationNote')}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([barber.city, barber.country].filter(Boolean).join(', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm tracking-wider text-accent hover:text-accent/80 transition-colors"
                        >
                          {t('barberProfile.viewOnMap')}
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </>
                    ) : (
                      <div className="bg-muted/50 p-4 rounded-sm">
                        <p className="text-sm text-muted-foreground mb-3">
                          {t('barberProfile.loginToSeeMore')}
                        </p>
                        <Button 
                          onClick={() => navigate('/auth')} 
                          size="sm"
                          className="rounded-none"
                        >
                          {t('barberProfile.loginButton')}
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.section>

                {/* Showcase Videos */}
                {shuffledVideos.length > 0 && (
                  <motion.section
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                  >
                    <VideoGallery 
                      videos={shuffledVideos} 
                      shopName={barber.shop_name} 
                    />
                  </motion.section>
                )}

                {/* Services - Show prices to all, but booking requires login */}
                <motion.section
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <h2 className="font-display text-2xl tracking-wider mb-6">{t('barberProfile.services')}</h2>
                  {services.length === 0 ? (
                    <div className="border-2 border-dashed border-border p-12 text-center">
                      <p className="text-muted-foreground tracking-wider">{t('barberProfile.noServicesYet')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {services.map((service, index) => (
                          <motion.div
                            key={service.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className={`w-full p-6 border-2 transition-all duration-300 text-left ${
                              user 
                                ? `cursor-pointer group ${
                                    selectedService?.id === service.id
                                      ? 'border-foreground bg-foreground text-background'
                                      : 'border-border hover:border-foreground'
                                  }`
                                : 'border-border'
                            }`}
                            onClick={() => user && handleServiceSelect(service)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-display text-xl tracking-wider mb-2">
                                  {service.name.toUpperCase()}
                                </h3>
                                {service.description && (
                                  <p className={`text-sm mb-3 ${
                                    selectedService?.id === service.id ? 'text-background/70' : 'text-muted-foreground'
                                  }`}>
                                    {service.description}
                                  </p>
                                )}
                                <div className={`flex items-center gap-2 text-sm ${
                                  selectedService?.id === service.id ? 'text-background/70' : 'text-muted-foreground'
                                }`}>
                                  <Clock className="w-4 h-4" />
                                  {service.duration_minutes} {t('barberProfile.min')}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-display text-2xl font-bold">
                                  {formatPrice(service.price, service.currency)}
                                </span>
                                {user && (
                                  <div className={`w-10 h-10 border-2 flex items-center justify-center transition-all ${
                                    selectedService?.id === service.id 
                                      ? 'border-background bg-background' 
                                      : 'border-foreground/30 group-hover:border-foreground'
                                  }`}>
                                    {selectedService?.id === service.id ? (
                                      <Check className="w-5 h-5 text-foreground" />
                                    ) : (
                                      <ArrowRight className="w-5 h-5" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Login prompt for guests */}
                      {!user && (
                        <div className="mt-6 p-6 bg-muted/50 border-2 border-dashed border-border text-center">
                          <p className="text-muted-foreground mb-4">
                            {t('barberProfile.loginToBook')}
                          </p>
                          <div className="flex justify-center gap-3">
                            <Button
                              variant="outline"
                              className="rounded-none border-2"
                              onClick={() => navigate('/auth')}
                            >
                              {t('barberProfile.signIn')}
                            </Button>
                            <Button
                              className="rounded-none bg-accent text-accent-foreground hover:bg-accent/90"
                              onClick={() => navigate('/auth?mode=signup')}
                            >
                              {t('barberProfile.createAccount')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.section>

                {/* Reviews */}
                <motion.section
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <div ref={reviewsRef} />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="font-display text-2xl tracking-wider">{t('barberProfile.reviews')}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Sort Filter */}
                      <Select value={reviewSort} onValueChange={(v) => handleSortChange(v as ReviewSortOption)}>
                        <SelectTrigger className="w-[160px] h-9 text-xs tracking-wider">
                          <SlidersHorizontal className="w-3 h-3 mr-2" />
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest" className="text-xs tracking-wider">{t('barberProfile.newestFirst')}</SelectItem>
                          <SelectItem value="oldest" className="text-xs tracking-wider">{t('barberProfile.oldestFirst')}</SelectItem>
                          <SelectItem value="highest" className="text-xs tracking-wider">{t('barberProfile.highestRated')}</SelectItem>
                          <SelectItem value="lowest" className="text-xs tracking-wider">{t('barberProfile.lowestRated')}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        onClick={handleOpenReviewDialog}
                        variant="outline"
                        size="sm"
                        className="gap-2 tracking-wider"
                      >
                        <Pen className="w-4 h-4" />
                        {t('barberProfile.writeReview')}
                      </Button>
                      <div className="flex items-center gap-2 text-sm tracking-wider text-muted-foreground">
                        <Star className="w-4 h-4 fill-accent text-accent" />
                        <span className="font-bold text-foreground">{barber.avg_rating.toFixed(1)}</span>
                        <span>({barber.total_reviews})</span>
                      </div>
                    </div>
                  </div>
                  
                  {reviews.length === 0 ? (
                    <div className="border-2 border-dashed border-border p-12 text-center">
                      <p className="text-muted-foreground tracking-wider">{t('barberProfile.noReviews')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {reviews.slice(0, visibleReviewCount).map((review, index) => (
                          <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className="border-2 border-border p-6"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-muted flex items-center justify-center font-display text-xl">
                                  {review.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold tracking-wider">
                                      {review.profiles?.full_name?.toUpperCase() || 'ANONYMOUS'}
                                    </p>
                                    {review.is_admin && <AdminBadge />}
                                  </div>
                                  <p className="text-xs text-muted-foreground tracking-wider">
                                    {format(new Date(review.created_at), 'MMM d, yyyy').toUpperCase()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating ? 'fill-accent text-accent' : 'text-border'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            {review.comment && (
                              <p className="text-muted-foreground leading-relaxed">
                                {review.comment}
                              </p>
                            )}

                            {review.barber_reply && (
                              <div className="mt-4 pl-4 border-l-2 border-accent">
                                <p className="text-xs text-accent tracking-wider mb-2">{t('barberProfile.barberReply')}</p>
                                <p className="text-muted-foreground text-sm">
                                  {review.barber_reply}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Show More / Load More Button */}
                      {(visibleReviewCount < reviews.length || hasMoreReviews) && (
                        <div className="mt-6 text-center">
                          <Button
                            variant="outline"
                            onClick={handleShowMoreReviews}
                            disabled={isLoadingMoreReviews}
                            className="tracking-wider"
                          >
                            {isLoadingMoreReviews ? (
                              t('common.loading')
                            ) : visibleReviewCount < reviews.length ? (
                              `${t('barberProfile.showMore')} (${Math.min(reviews.length - visibleReviewCount, 4)})`
                            ) : (
                              t('barberProfile.loadMoreReviews')
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2 tracking-wider">
                            {t('barberProfile.showing', { current: Math.min(visibleReviewCount, reviews.length), total: barber.total_reviews })}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </motion.section>
              </div>

              {/* Booking Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  className="border-2 border-foreground p-6 sticky top-24"
                >
                  <h2 className="font-display text-xl tracking-wider mb-6">{t('barberProfile.bookAppointment')}</h2>

                  {step === 'service' && (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground tracking-wider text-sm">
                        {t('barberProfile.selectService')}
                      </p>
                    </div>
                  )}

                  {step === 'datetime' && selectedService && (
                    <div className="space-y-6">
                      <div className="pb-4 border-b border-border">
                        <p className="text-xs text-muted-foreground tracking-wider mb-1">{t('barberProfile.selectedService')}</p>
                        <p className="font-display text-lg tracking-wider">{selectedService.name.toUpperCase()}</p>
                        <p className="text-accent font-bold">{formatPrice(selectedService.price, selectedService.currency)}</p>
                      </div>

                      {/* Date Selection */}
                      <div>
                        <p className="text-xs text-muted-foreground tracking-wider mb-4">{t('barberProfile.selectDate')}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {dates.slice(0, 8).map((date) => (
                            <button
                              key={date.toISOString()}
                              onClick={() => setSelectedDate(date)}
                              className={`py-3 border-2 text-center transition-all ${
                                isSameDay(date, selectedDate)
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'border-border hover:border-foreground'
                              }`}
                            >
                              <p className="text-[10px] tracking-wider opacity-70">
                                {format(date, 'EEE').toUpperCase()}
                              </p>
                              <p className="font-display text-lg">{format(date, 'd')}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time Selection */}
                      <div>
                        <p className="text-xs text-muted-foreground tracking-wider mb-4">{t('barberProfile.selectTime')}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map((time) => {
                            const available = isTimeSlotAvailable(selectedDate, time);
                            return (
                              <button
                                key={time}
                                onClick={() => available && handleTimeSelect(time)}
                                disabled={!available}
                                className={`py-3 border-2 text-sm tracking-wider transition-all ${
                                  available
                                    ? 'border-border hover:border-foreground'
                                    : 'border-border/50 text-muted-foreground/50 cursor-not-allowed line-through'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                        {timeSlots.every((slot) => !isTimeSlotAvailable(selectedDate, slot)) && (
                          <p className="text-xs text-muted-foreground text-center mt-4">
                            {t('barberProfile.noSlotsAvailable')}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedService(null);
                          setStep('service');
                        }}
                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground tracking-wider"
                      >
                        {t('barberProfile.changeService')}
                      </button>
                    </div>
                  )}

                  {step === 'confirm' && selectedService && selectedTime && (() => {
                    const platformFee = getPlatformFee(selectedService.price, selectedService.currency);
                    const total = selectedService.price - voucherDiscount + platformFee;
                    
                    return (
                    <div className="space-y-6">
                      <div className="space-y-4 pb-6 border-b border-border">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground tracking-wider">{t('barberProfile.service')}</span>
                          <span className="font-medium tracking-wider">{selectedService.name.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground tracking-wider">{t('barberProfile.date')}</span>
                          <span className="font-medium tracking-wider">{format(selectedDate, 'EEE, MMM d').toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground tracking-wider">{t('barberProfile.time')}</span>
                          <span className="font-medium tracking-wider">{selectedTime}</span>
                        </div>
                      </div>

                      {/* Currency Selector */}
                      <CurrencySelector showDisclaimer={false} />
                      
                      {/* Currency Conversion Disclaimer */}
                      <CurrencyDisclaimer />

                      {/* Voucher Code Input */}
                      <div className="pb-6 border-b border-border">
                        <p className="text-xs text-muted-foreground tracking-wider mb-3">{t('barberProfile.haveVoucher')}</p>
                        <VoucherCodeInput
                          servicePrice={selectedService.price}
                          currency={currency}
                          onVoucherApplied={(voucher, discount) => {
                            setAppliedVoucher(voucher ? { id: voucher.id, code: voucher.code } : null);
                            setVoucherDiscount(discount);
                          }}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground tracking-wider">{t('barberProfile.service')}</span>
                          <span>{formatPrice(selectedService.price, selectedService.currency)}</span>
                        </div>
                        {voucherDiscount > 0 && (
                          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                            <span className="tracking-wider">{t('barberProfile.voucherDiscount')}</span>
                            <span>-{formatPrice(voucherDiscount, selectedService.currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground tracking-wider">{t('barberProfile.bookingFee')}</span>
                          <span>{formatPrice(platformFee, currency)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-3 border-t border-border">
                          <span className="tracking-wider">{t('barberProfile.total')}</span>
                          <span className="text-accent">
                            {formatPrice(total, currency)}
                          </span>
                        </div>
                        {voucherDiscount > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 text-center">
                            {t('barberProfile.youSave', { amount: formatPrice(voucherDiscount, selectedService.currency) })}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={handleBooking}
                        disabled={isBooking}
                        className="w-full h-14 text-sm tracking-widest font-semibold rounded-none bg-foreground text-background hover:bg-accent transition-all"
                      >
                        {isBooking ? t('barberProfile.processing') : t('barberProfile.bookPayNow')}
                      </Button>

                      <button
                        onClick={() => setStep('datetime')}
                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground tracking-wider"
                      >
                        {t('barberProfile.changeDateOrTime')}
                      </button>
                    </div>
                    );
                  })()}
                </motion.div>
              </div>
            </div>
          </div>
        </main>
        </PullToRefresh>
{/* Gallery Modal */}
        <AnimatePresence>
          {showGallery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
              onClick={() => setShowGallery(false)}
            >
              <button
                onClick={() => setShowGallery(false)}
                className="absolute top-6 right-6 w-12 h-12 border-2 border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveGalleryIndex((prev) => (prev === 0 ? shuffledImages.length - 1 : prev - 1));
                }}
                className="absolute left-6 w-12 h-12 border-2 border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveGalleryIndex((prev) => (prev === shuffledImages.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-6 w-12 h-12 border-2 border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="max-w-4xl max-h-[80vh] mx-auto px-20" onClick={(e) => e.stopPropagation()}>
                <LazyImage
                  src={shuffledImages[activeGalleryIndex]}
                  alt={`Gallery ${activeGalleryIndex + 1}`}
                  className="w-full h-full"
                  progressive
                />
                <p className="text-center mt-4 text-sm tracking-widest text-muted-foreground">
                  {activeGalleryIndex + 1} / {shuffledImages.length}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Write Review Dialog */}
        {barber && reviewableBooking && (
          <WriteReviewDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            bookingId={reviewableBooking.id}
            barberId={barber.id}
            shopName={barber.shop_name}
            onReviewSubmitted={() => {
              fetchReviews();
              fetchReviewableBooking();
              preflight.refetch();
            }}
          />
        )}

        <ChatDialog
          barberId={barber.id}
          barberName={barber.shop_name}
          barberImage={barber.profile_image_url}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </PageTransition>
  );
}
