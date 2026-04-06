import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Camera, Edit2, Calendar, Star, Heart, 
  CreditCard, Globe, Bell, ChevronRight, LogOut, Loader2, Shield, Gift, Clock,
  Cake, CalendarIcon, Trash2, AlertTriangle
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { PageTransition } from '@/components/animations/PageTransition';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { PullToRefresh } from '@/components/PullToRefresh';
import { getPathWithLanguage, getPathWithoutLanguage, getLanguageFromPath, type LanguageCode } from '@/lib/i18n';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  birthday: string | null;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  service_name: string;
  status: string;
  total_amount: number;
  currency: string;
  barber_profiles: {
    shop_name: string;
    city: string;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  barber_profiles: {
    shop_name: string;
  } | null;
}


const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: customEase }
  }
};

export default function CustomerProfile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Helper to get localized path
  const currentLang = getLanguageFromPath(location.pathname);
  const localizedPath = (path: string) => getPathWithLanguage(path, currentLang);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionStep, setDeletionStep] = useState<'request' | 'confirm'>('request');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    preferred_language: 'en',
    birthday: undefined as Date | undefined,
  });

  // Moved before conditional return to fix hooks order
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchProfile(), fetchBookings(), fetchReviews()]);
  }, [user]);

  const { uploadImage, isUploading: isUploadingAvatar } = useImageUpload({
    bucket: 'avatars',
    onSuccess: async (url) => {
      if (!user) return;
      await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);
      fetchProfile();
    },
  });

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBookings();
      fetchReviews();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        preferred_language: data.preferred_language || 'en',
        birthday: data.birthday ? parse(data.birthday, 'yyyy-MM-dd', new Date()) : undefined,
      });
    }
    setIsLoading(false);
  };

  const fetchBookings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, start_time, service_name, status, total_amount, currency,
        barber_profiles (shop_name, city)
      `)
      .eq('customer_id', user.id)
      .order('booking_date', { ascending: false })
      .limit(10);

    if (data) {
      setBookings(data as unknown as Booking[]);
    }
  };

  const fetchReviews = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        barber_profiles:barber_id (shop_name)
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(data as unknown as Review[]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        preferred_language: formData.preferred_language,
        birthday: formData.birthday ? format(formData.birthday, 'yyyy-MM-dd') : null,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.profile.updateError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toasts.success'),
        description: t('toasts.profile.updateSuccess'),
      });
      setIsEditing(false);
      fetchProfile();
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleRequestDeletion = async (isResend = false) => {
    if (isResend) {
      setIsResending(true);
    } else {
      setIsDeleting(true);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { 
          is_founder_action: false,
          action: 'request_deletion'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: isResend ? t('toasts.deletion.codeResent') : t('toasts.deletion.confirmationSent'),
        description: t('toasts.deletion.checkEmail'),
      });
      
      setDeletionStep('confirm');
      
      // Start 60 second cooldown for resend
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast({
        title: t('toasts.error'),
        description: error.message || t('toasts.deletion.requestError'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsResending(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (confirmationCode.length !== 6) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.deletion.invalidCode'),
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { 
          is_founder_action: false,
          action: 'confirm_deletion',
          confirmation_code: confirmationCode
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('toasts.deletion.accountDeleted'),
        description: t('toasts.deletion.accountDeletedDesc'),
      });
      
      await signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: t('toasts.error'),
        description: error.message || t('toasts.deletion.deleteError'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletionStep('request');
    setConfirmationCode('');
    setResendCooldown(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-500 border-green-500';
      case 'pending': return 'text-accent border-accent';
      case 'completed': return 'text-muted-foreground border-muted-foreground';
      case 'cancelled': return 'text-destructive border-destructive';
      default: return 'text-muted-foreground border-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
<div className="pt-32 pb-16 container mx-auto px-4">
          <div className="h-32 w-32 bg-muted animate-pulse mx-auto mb-6" />
          <div className="h-8 w-48 bg-muted animate-pulse mx-auto mb-4" />
          <div className="h-4 w-32 bg-muted animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
          <main className="pt-24 pb-24">
            <div className="container mx-auto px-4">
              <Breadcrumbs />
            
            {/* Profile Header */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-center mb-16"
            >
              <div className="relative inline-block mb-6">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div className="w-32 h-32 border-2 border-foreground flex items-center justify-center bg-muted overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name || 'Profile'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <button 
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-foreground text-background flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                {profile?.full_name?.toUpperCase() || 'YOUR PROFILE'}
              </h1>
              <p className="text-foreground/80 tracking-wider">
                {profile?.email}
              </p>
            </motion.div>

            {/* Tabs */}
            <Tabs defaultValue="profile" className="max-w-4xl mx-auto">
              <TabsList className="w-full bg-transparent border-b-2 border-border rounded-none h-auto p-0 mb-12 flex-wrap">
                <TabsTrigger 
                  value="profile" 
                    className="flex-1 rounded-none border-b-2 border-transparent text-foreground/80 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground py-4 text-xs md:text-sm tracking-widest"
                >
                  {t('profile.tabs.profile')}
                </TabsTrigger>
                <TabsTrigger 
                  value="bookings" 
                    className="flex-1 rounded-none border-b-2 border-transparent text-foreground/80 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground py-4 text-xs md:text-sm tracking-widest"
                >
                  {t('profile.tabs.bookings')}
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                    className="flex-1 rounded-none border-b-2 border-transparent text-foreground/80 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground py-4 text-xs md:text-sm tracking-widest"
                >
                  {t('profile.tabs.reviews')}
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                    className="flex-1 rounded-none border-b-2 border-transparent text-foreground/80 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground py-4 text-xs md:text-sm tracking-widest"
                >
                  {t('profile.tabs.settings')}
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-border p-8"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="font-display text-xl tracking-wider">{t('profile.personalInformation')}</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      glow={false}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {isEditing ? t('profile.cancelButton') : t('profile.editButton')}
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-xs tracking-widest text-foreground/75">{t('profile.fullName')}</Label>
                        {isEditing ? (
                          <Input
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="mt-2 rounded-none border-2"
                          />
                        ) : (
                          <p className="mt-2 text-lg text-foreground">{profile?.full_name || '—'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs tracking-widest text-foreground/75">{t('profile.email')}</Label>
                        <p className="mt-2 text-lg text-foreground">{profile?.email || '—'}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-xs tracking-widest text-foreground/75">{t('profile.phone')}</Label>
                        {isEditing ? (
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="mt-2 rounded-none border-2"
                          />
                        ) : (
                          <p className="mt-2 text-lg text-foreground">{profile?.phone || '—'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs tracking-widest text-foreground/75">{t('profile.language')}</Label>
                        {isEditing ? (
                          <select
                            value={formData.preferred_language}
                            onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                            className="mt-2 w-full h-10 px-3 border-2 border-border bg-background text-foreground"
                          >
                            <option value="en">English</option>
                            <option value="de">Deutsch</option>
                            <option value="fr">Français</option>
                            <option value="it">Italiano</option>
                          </select>
                        ) : (
                          <p className="mt-2 text-lg text-foreground">
                            {formData.preferred_language === 'de' ? 'Deutsch' : 
                             formData.preferred_language === 'fr' ? 'Français' :
                             formData.preferred_language === 'it' ? 'Italiano' : 'English'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-xs tracking-widest text-foreground/75">{t('profile.birthday')}</Label>
                        {isEditing ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "mt-2 w-full justify-start text-left font-normal rounded-none border-2",
                                  !formData.birthday && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.birthday ? format(formData.birthday, "PPP") : <span>{t('profile.pickBirthday')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={formData.birthday}
                                onSelect={(date) => setFormData({ ...formData, birthday: date })}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                                captionLayout="dropdown-buttons"
                                fromYear={1920}
                                toYear={new Date().getFullYear()}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <Cake className="w-4 h-4 text-accent" />
                            <p className="text-lg text-foreground">{profile?.birthday ? format(parse(profile.birthday, 'yyyy-MM-dd', new Date()), 'MMMM d') : '—'}</p>
                          </div>
                        )}
                        {isEditing && (
                          <p className="text-xs text-foreground/70 mt-1">
                            Add your birthday to receive bonus points each year!
                          </p>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="pt-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="border-2 border-border p-6 text-center">
                    <p className="font-display text-3xl mb-1 text-foreground">{bookings.length}</p>
                    <p className="text-xs tracking-widest text-muted-foreground">BOOKINGS</p>
                  </div>
                  <div className="border-2 border-border p-6 text-center">
                    <p className="font-display text-3xl mb-1 text-foreground">{reviews.length}</p>
                    <p className="text-xs tracking-widest text-muted-foreground">REVIEWS</p>
                  </div>
                  <div className="border-2 border-border p-6 text-center">
                    <p className="font-display text-3xl mb-1 text-foreground">0</p>
                    <p className="text-xs tracking-widest text-muted-foreground">FAVORITES</p>
                  </div>
                </div>
              </TabsContent>

              {/* Loyalty Tab - Coming Soon */}
              <TabsContent value="loyalty" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-border p-8 md:p-12 text-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{t('loyalty.comingSoon.title')}</span>
                  </div>
                  
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                    <Gift className="w-10 h-10 text-primary" />
                  </div>
                  
                  <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wider mb-4">
                    {t('loyalty.comingSoon.subtitle')}
                  </h2>
                  
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    {t('loyalty.comingSoon.description')}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
                    {[
                      { title: t('loyalty.comingSoon.features.rewards') },
                      { title: t('loyalty.comingSoon.features.tiers') },
                      { title: t('loyalty.comingSoon.features.birthday') },
                      { title: t('loyalty.comingSoon.features.referrals') },
                    ].map((feature, i) => (
                      <div key={i} className="p-4 border border-border/50 bg-muted/30 text-center opacity-60">
                        <p className="text-xs font-display tracking-wider">{feature.title}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="font-display text-xl tracking-wider">{t('profile.yourBookings')}</h2>
                    <Button asChild>
                      <Link to={localizedPath("/barbers")}>{t('profile.bookNew')}</Link>
                    </Button>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="border-2 border-dashed border-border p-16 text-center">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground tracking-wider mb-4">{t('profile.noBookingsYet')}</p>
                      <Button asChild>
                        <Link to={localizedPath("/barbers")}>{t('profile.findABarber')}</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div 
                          key={booking.id} 
                          className="border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors"
                        >
                          <div className="flex items-center gap-6">
                            <div className="text-center min-w-[60px]">
                              <p className="font-display text-2xl">
                                {format(new Date(booking.booking_date), 'd')}
                              </p>
                              <p className="text-xs tracking-widest text-muted-foreground">
                                {format(new Date(booking.booking_date), 'MMM').toUpperCase()}
                              </p>
                            </div>
                            <div>
                              <p className="font-display text-lg tracking-wider">
                                {booking.barber_profiles?.shop_name?.toUpperCase() || 'BARBER'}
                              </p>
                              <p className="text-sm text-muted-foreground tracking-wider">
                                {booking.service_name.toUpperCase()} • {booking.start_time}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs tracking-widest border px-2 py-1 ${getStatusColor(booking.status)}`}>
                              {booking.status.toUpperCase()}
                            </p>
                            <p className="font-display text-lg mt-2">
                              {booking.currency} {booking.total_amount}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="font-display text-xl tracking-wider mb-8">{t('profile.yourReviews')}</h2>

                  {reviews.length === 0 ? (
                    <div className="border-2 border-dashed border-border p-16 text-center">
                      <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground tracking-wider">{t('profile.noReviewsYet')}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('profile.completeBookingToReview')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-2 border-border p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-display text-lg tracking-wider">
                                {review.barber_profiles?.shop_name?.toUpperCase() || 'BARBER'}
                              </p>
                              <p className="text-xs text-muted-foreground tracking-wider">
                                {format(new Date(review.created_at), 'MMM d, yyyy').toUpperCase()}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-accent text-accent' : 'text-border'}`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-muted-foreground">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Quick Language Switcher */}
                  <div className="border-2 border-border p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Globe className="w-5 h-5" />
                      <div>
                        <p className="font-display tracking-wider">{t('profile.quickLanguage')}</p>
                        <p className="text-sm text-foreground/75">{t('profile.quickLanguageDesc')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { code: 'en' as LanguageCode, flag: '🇬🇧', name: 'EN' },
                        { code: 'de' as LanguageCode, flag: '🇨🇭', name: 'DE' },
                        { code: 'fr' as LanguageCode, flag: '🇨🇭', name: 'FR' },
                        { code: 'it' as LanguageCode, flag: '🇨🇭', name: 'IT' },
                      ].map((lang) => {
                        const currentLang = formData.preferred_language || 'en';
                        const isActive = currentLang === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={async () => {
                              // Update i18n immediately using the imported instance
                              const i18nInstance = (await import('@/lib/i18n')).default;
                              i18nInstance.changeLanguage(lang.code);
                              localStorage.setItem('i18nextLng', lang.code);
                              
                              // Save to profile
                              if (user) {
                                await supabase
                                  .from('profiles')
                                  .update({ preferred_language: lang.code })
                                  .eq('id', user.id);
                                
                                setFormData(prev => ({ ...prev, preferred_language: lang.code }));
                                toast({
                                  title: t('common.success', 'Success'),
                                  description: t('settings.languageChanged', 'Language changed'),
                                });
                              }
                              
                              // Navigate to the correct language path
                              const currentPathWithoutLang = getPathWithoutLanguage(window.location.pathname);
                              const newPath = getPathWithLanguage(currentPathWithoutLang, lang.code);
                              
                              if (newPath !== window.location.pathname) {
                                navigate(newPath + window.location.search + window.location.hash, { replace: true });
                              }
                            }}
                            className={`border-2 p-3 flex flex-col items-center justify-center gap-1 transition-all ${
                              isActive
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-background text-foreground hover:border-foreground hover:bg-secondary'
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="text-xs font-display tracking-wider">{lang.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Link 
                    to={localizedPath("/settings/payment-methods")}
                    className="w-full border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <CreditCard className="w-5 h-5" />
                      <div>
                        <p className="font-display tracking-wider">{t('settings.paymentMethods', 'PAYMENT METHODS')}</p>
                        <p className="text-sm text-foreground/75">{t('settings.paymentMethodsDesc', 'Manage your payment options')}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground/70" />
                  </Link>

                  <Link 
                    to={localizedPath("/settings/notifications")}
                    className="w-full border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Bell className="w-5 h-5" />
                      <div>
                        <p className="font-display tracking-wider">{t('settings.notifications', 'NOTIFICATIONS')}</p>
                        <p className="text-sm text-foreground/75">{t('settings.notificationsDesc', 'Email and push notifications')}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground/70" />
                  </Link>

                  <Link 
                    to={localizedPath("/settings/language-region")}
                    className="w-full border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Globe className="w-5 h-5" />
                      <div>
                        <p className="font-display tracking-wider">{t('profile.languageRegion', 'LANGUAGE & REGION')}</p>
                        <p className="text-sm text-foreground/75">
                          {formData.preferred_language === 'de' ? 'Deutsch' : 
                           formData.preferred_language === 'fr' ? 'Français' :
                           formData.preferred_language === 'it' ? 'Italiano' : 'English'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground/70" />
                  </Link>

                  <Link 
                    to={localizedPath("/settings/saved-barbers")}
                    className="w-full border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Heart className="w-5 h-5" />
                      <div>
                        <p className="font-display tracking-wider">{t('profile.savedBarbersTitle')}</p>
                        <p className="text-sm text-foreground/75">{t('profile.savedBarbersDesc')}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground/70" />
                  </Link>

                  <Link 
                    to={localizedPath("/settings/2fa")}
                    className="w-full border-2 border-border p-6 flex items-center justify-between hover:border-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Shield className="w-5 h-5" />
                      <div>
                        <p className="font-display tracking-wider">{t('profile.twoFactorTitle')}</p>
                        <p className="text-sm text-foreground/75">{t('profile.twoFactorDesc')}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground/70" />
                  </Link>

                  <div className="pt-8 space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('profile.signOutButton')}
                    </Button>

                    {/* Hidden delete account - scroll to find it */}
                    <div className="pt-16 border-t border-border/30">
                      <p className="text-xs text-foreground/60 text-center mb-4">{t('profile.deleteAccountDialog.dangerZone')}</p>
                      <Button 
                        variant="outline" 
                        className="w-full text-destructive border-destructive/40 hover:bg-destructive/10 text-xs"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        {t('profile.deleteAccountDialog.deleteButton')}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        </PullToRefresh>
{/* Delete Account Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={handleCloseDeleteDialog}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="text-base sm:text-lg">
                  {deletionStep === 'request' ? t('profile.deleteAccountDialog.title') : t('profile.deleteAccountDialog.confirmTitle')}
                </span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-sm text-muted-foreground">
              {deletionStep === 'request' ? (
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-sm">
                    {t('profile.deleteAccountDialog.warning')} <span className="font-bold text-destructive">{t('profile.deleteAccountDialog.permanent')}</span>.
                  </p>
                  <p className="text-sm">
                    {t('profile.deleteAccountDialog.emailNotice')}
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-xs sm:text-sm">
                    <li>{t('profile.deleteAccountDialog.dataList.profile')}</li>
                    <li>{t('profile.deleteAccountDialog.dataList.bookings')}</li>
                    <li>{t('profile.deleteAccountDialog.dataList.reviews')}</li>
                    <li>{t('profile.deleteAccountDialog.dataList.savedBarbers')}</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-sm">
                    {t('profile.deleteAccountDialog.codeSent')}
                  </p>
                  <p className="text-sm">{t('profile.deleteAccountDialog.enterCode')}</p>
                  <div className="mt-3 sm:mt-4">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.5em] font-mono border-2"
                      maxLength={6}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('profile.deleteAccountDialog.didntReceive')}</p>
                    <Button
                       variant="outline"
                      size="sm"
                      onClick={() => handleRequestDeletion(true)}
                      disabled={resendCooldown > 0 || isResending}
                       className="text-xs sm:text-sm text-foreground"
                    >
                      {isResending ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-3 h-3 mr-2" />
                      )}
                      {resendCooldown > 0 
                        ? t('profile.deleteAccountDialog.resendIn', { seconds: resendCooldown })
                        : t('profile.deleteAccountDialog.resendCode')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <Button
                onClick={() => {
                  if (deletionStep === 'request') {
                    handleRequestDeletion();
                  } else {
                    handleConfirmDeletion();
                  }
                }}
                disabled={isDeleting || (deletionStep === 'confirm' && confirmationCode.length !== 6)}
                variant="destructive"
                className="w-full"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : deletionStep === 'request' ? (
                  <Mail className="w-4 h-4 mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {deletionStep === 'request' ? t('profile.deleteAccountDialog.sendCode') : t('profile.deleteAccountDialog.deleteAccount')}
              </Button>
              <Button
                variant="outline"
                onClick={handleCloseDeleteDialog}
                disabled={isDeleting}
                className="w-full"
              >
                {t('profile.deleteAccountDialog.cancel')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
