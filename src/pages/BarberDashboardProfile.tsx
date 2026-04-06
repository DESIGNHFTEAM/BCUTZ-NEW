import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Camera, Edit2, MapPin, Clock, Star, 
  Image as ImageIcon, Save, X, Plus, Trash2, Loader2, Film, Scissors, Sparkles, AlertTriangle
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { PageTransition } from '@/components/animations/PageTransition';
import { VideoUploader } from '@/components/VideoUploader';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type BusinessType = 'barbershop' | 'salon';

interface BarberProfile {
  id: string;
  user_id: string;
  shop_name: string;
  description: string | null;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string | null;
  profile_image_url: string | null;
  gallery_images: string[] | null;
  videos: string[] | null;
  avg_rating: number | null;
  total_reviews: number | null;
  bank_iban: string | null;
  bank_account_holder: string | null;
  business_type: BusinessType;
  opening_hours: Record<string, { open: string; close: string; closed?: boolean }> | null;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
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

const defaultOpeningHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '16:00', closed: false },
  sunday: { open: '09:00', close: '16:00', closed: true },
};

export default function BarberDashboardProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shop');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [shopForm, setShopForm] = useState({
    shop_name: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    business_type: 'barbershop' as BusinessType,
  });


  const [openingHours, setOpeningHours] = useState(defaultOpeningHours);

  // Profile image upload
  const { uploadImage: uploadProfileImage, isUploading: isUploadingProfile } = useImageUpload({
    bucket: 'avatars',
    onSuccess: async (url) => {
      if (!barberProfile) return;
      await supabase
        .from('barber_profiles')
        .update({ profile_image_url: url })
        .eq('id', barberProfile.id);
      fetchData();
    },
  });

  // Gallery image upload - folder must be barber profile ID to match storage RLS policy
  const { uploadImage: uploadGalleryImage, deleteImage: deleteGalleryImage, isUploading: isUploadingGallery } = useImageUpload({
    bucket: 'gallery',
    folderPrefix: barberProfile?.id,
  });

  const handleProfileImageClick = () => {
    profileImageInputRef.current?.click();
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadProfileImage(file);
    }
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const MAX_GALLERY_IMAGES = 25;
  const MAX_VIDEOS = 15;
  const galleryCount = barberProfile?.gallery_images?.length || 0;
  const videoCount = barberProfile?.videos?.length || 0;
  const galleryNearLimit = galleryCount >= MAX_GALLERY_IMAGES - 3;
  const galleryAtLimit = galleryCount >= MAX_GALLERY_IMAGES;

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && barberProfile) {
      if (galleryAtLimit) {
        toast({ title: 'Gallery full', description: `Maximum ${MAX_GALLERY_IMAGES} images allowed.`, variant: 'destructive' });
        return;
      }
      const url = await uploadGalleryImage(file);
      if (url) {
        const currentGallery = barberProfile.gallery_images || [];
        await supabase
          .from('barber_profiles')
          .update({ gallery_images: [...currentGallery, url] })
          .eq('id', barberProfile.id);
        fetchData();
      }
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  const handleDeleteGalleryImage = async (imageUrl: string) => {
    if (!barberProfile) return;
    
    setIsDeletingImage(imageUrl);
    const success = await deleteGalleryImage(imageUrl);
    
    if (success) {
      const updatedGallery = (barberProfile.gallery_images || []).filter(img => img !== imageUrl);
      await supabase
        .from('barber_profiles')
        .update({ gallery_images: updatedGallery })
        .eq('id', barberProfile.id);
      fetchData();
    }
    setIsDeletingImage(null);
  };

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!barberProfile || isUploadingGallery || galleryAtLimit) return;

    const files = Array.from(e.dataTransfer.files).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)
    );

    for (const file of files) {
      const url = await uploadGalleryImage(file);
      if (url) {
        const current = (await supabase
          .from('barber_profiles')
          .select('gallery_images')
          .eq('id', barberProfile.id)
          .single()).data?.gallery_images || [];
        await supabase
          .from('barber_profiles')
          .update({ gallery_images: [...current, url] })
          .eq('id', barberProfile.id);
      }
    }
    fetchData();
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    // Fetch user profile
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (userData) {
      setUserProfile(userData);
    }

    // Fetch barber profile
    const { data: barberData } = await supabase
      .from('barber_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (barberData) {
      const profile: BarberProfile = {
        ...barberData,
        business_type: (barberData.business_type as BusinessType) || 'barbershop',
        opening_hours: barberData.opening_hours as BarberProfile['opening_hours'],
      };
      setBarberProfile(profile);
      setShopForm({
        shop_name: profile.shop_name || '',
        description: profile.description || '',
        address: profile.address || '',
        city: profile.city || '',
        postal_code: profile.postal_code || '',
        phone: profile.phone || '',
        business_type: profile.business_type || 'barbershop',
      });
      if (profile.opening_hours) {
        setOpeningHours({ ...defaultOpeningHours, ...profile.opening_hours });
      }
    }
    
    setIsLoading(false);
  };

  const handleSaveShop = async () => {
    if (!barberProfile) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('barber_profiles')
      .update({
        shop_name: shopForm.shop_name,
        description: shopForm.description,
        address: shopForm.address,
        city: shopForm.city,
        postal_code: shopForm.postal_code,
        phone: shopForm.phone,
        business_type: shopForm.business_type,
      })
      .eq('id', barberProfile.id);

    if (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.shop.detailsUpdateError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toasts.success'),
        description: t('toasts.shop.detailsUpdated'),
      });
      fetchData();
    }
    setIsSaving(false);
  };


  const handleSaveHours = async () => {
    if (!barberProfile) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('barber_profiles')
      .update({
        opening_hours: openingHours,
      })
      .eq('id', barberProfile.id);

    if (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.shop.hoursUpdateError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toasts.success'),
        description: t('toasts.shop.hoursUpdated'),
      });
      fetchData();
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
<div className="pt-32 pb-16 container mx-auto px-4">
          <div className="h-32 w-32 bg-muted animate-pulse mx-auto mb-6" />
          <div className="h-8 w-48 bg-muted animate-pulse mx-auto mb-4" />
        </div>
      </div>
    );
  }

  if (!barberProfile) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
<div className="pt-32 pb-16 container mx-auto px-4 text-center">
            <h1 className="font-display text-4xl tracking-wider mb-6">NO BARBER PROFILE</h1>
            <p className="text-muted-foreground mb-8">You need to complete the barber onboarding first.</p>
            <Button asChild>
              <Link to="/barber-onboarding">COMPLETE ONBOARDING</Link>
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
<main className="pt-32 pb-24">
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
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
                <div className="w-32 h-32 border-2 border-foreground flex items-center justify-center bg-muted overflow-hidden">
                  {barberProfile?.profile_image_url ? (
                    <img 
                      src={barberProfile.profile_image_url} 
                      alt={barberProfile.shop_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <button 
                  onClick={handleProfileImageClick}
                  disabled={isUploadingProfile}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-foreground text-background flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isUploadingProfile ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                {barberProfile?.shop_name?.toUpperCase()}
              </h1>
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {barberProfile?.city?.toUpperCase()}
                </span>
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  {barberProfile?.avg_rating?.toFixed(1) || '0.0'}
                </span>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
              <div className="border-2 border-border p-4 text-center">
                <p className="font-display text-2xl">{barberProfile?.avg_rating?.toFixed(1) || '0.0'}</p>
                <p className="text-[10px] tracking-widest text-muted-foreground">RATING</p>
              </div>
              <div className="border-2 border-border p-4 text-center">
                <p className="font-display text-2xl">{barberProfile?.total_reviews || 0}</p>
                <p className="text-[10px] tracking-widest text-muted-foreground">REVIEWS</p>
              </div>
              <Link to="/dashboard/services" className="border-2 border-border p-4 text-center hover:border-foreground transition-colors">
                <p className="font-display text-2xl">→</p>
                <p className="text-[10px] tracking-widest text-muted-foreground">SERVICES</p>
              </Link>
              <Link to="/dashboard/calendar" className="border-2 border-border p-4 text-center hover:border-foreground transition-colors">
                <p className="font-display text-2xl">→</p>
                <p className="text-[10px] tracking-widest text-muted-foreground">CALENDAR</p>
              </Link>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl mx-auto">
              <TabsList className="w-full bg-transparent border-b-2 border-border rounded-none h-auto p-0 mb-12 flex-wrap">
                <TabsTrigger 
                  value="shop" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent py-4 text-xs tracking-widest"
                >
                  SHOP INFO
                </TabsTrigger>
                <TabsTrigger 
                  value="hours" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent py-4 text-xs tracking-widest"
                >
                  HOURS
                </TabsTrigger>
                <TabsTrigger 
                  value="gallery" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent py-4 text-xs tracking-widest"
                >
                  GALLERY
                </TabsTrigger>
                <TabsTrigger 
                  value="videos" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent py-4 text-xs tracking-widest"
                >
                  <Film className="w-3 h-3 mr-1" />
                  VIDEOS
                </TabsTrigger>
              </TabsList>

              {/* Shop Info Tab */}
              <TabsContent value="shop" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-border p-8"
                >
                  <h2 className="font-display text-xl tracking-wider mb-8">SHOP DETAILS</h2>

                  <div className="space-y-6">
                    {/* Business Type Selector */}
                    <div>
                      <Label className="text-xs tracking-widest text-muted-foreground mb-3 block">BUSINESS TYPE</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setShopForm({ ...shopForm, business_type: 'barbershop' })}
                          className={`p-4 border-2 transition-all flex items-center gap-3 ${
                            shopForm.business_type === 'barbershop'
                              ? 'border-foreground bg-foreground/5'
                              : 'border-border hover:border-foreground/50'
                          }`}
                        >
                          <Scissors className={`w-6 h-6 ${shopForm.business_type === 'barbershop' ? 'text-accent' : 'text-muted-foreground'}`} />
                          <div className="text-left">
                            <p className="font-display tracking-wider text-sm">BARBERSHOP</p>
                            <p className="text-xs text-muted-foreground">Men's grooming</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShopForm({ ...shopForm, business_type: 'salon' })}
                          className={`p-4 border-2 transition-all flex items-center gap-3 ${
                            shopForm.business_type === 'salon'
                              ? 'border-foreground bg-foreground/5'
                              : 'border-border hover:border-foreground/50'
                          }`}
                        >
                          <Sparkles className={`w-6 h-6 ${shopForm.business_type === 'salon' ? 'text-accent' : 'text-muted-foreground'}`} />
                          <div className="text-left">
                            <p className="font-display tracking-wider text-sm">BEAUTY SALON</p>
                            <p className="text-xs text-muted-foreground">Full-service beauty</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs tracking-widest text-muted-foreground">{shopForm.business_type === 'salon' ? 'SALON NAME' : 'SHOP NAME'}</Label>
                      <Input
                        value={shopForm.shop_name}
                        onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
                        className="mt-2 rounded-none border-2"
                      />
                    </div>

                    <div>
                      <Label className="text-xs tracking-widest text-muted-foreground">DESCRIPTION</Label>
                      <Textarea
                        value={shopForm.description}
                        onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
                        className="mt-2 rounded-none border-2 min-h-[100px]"
                        placeholder={shopForm.business_type === 'salon' ? 'Tell customers about your salon...' : 'Tell customers about your shop...'}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-xs tracking-widest text-muted-foreground">ADDRESS</Label>
                        <Input
                          value={shopForm.address}
                          onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                          className="mt-2 rounded-none border-2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs tracking-widest text-muted-foreground">CITY</Label>
                        <Input
                          value={shopForm.city}
                          onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })}
                          className="mt-2 rounded-none border-2"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-xs tracking-widest text-muted-foreground">POSTAL CODE</Label>
                        <Input
                          value={shopForm.postal_code}
                          onChange={(e) => setShopForm({ ...shopForm, postal_code: e.target.value })}
                          className="mt-2 rounded-none border-2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs tracking-widest text-muted-foreground">PHONE</Label>
                        <Input
                          value={shopForm.phone}
                          onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                          className="mt-2 rounded-none border-2"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button onClick={handleSaveShop} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Hours Tab */}
              <TabsContent value="hours" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-border p-8"
                >
                  <h2 className="font-display text-xl tracking-wider mb-8">OPENING HOURS</h2>

                  <div className="space-y-4">
                    {Object.entries(openingHours).map(([day, hours]) => (
                      <div key={day} className="flex items-center gap-4">
                        <div className="w-32">
                          <p className="font-display tracking-wider">{day.toUpperCase()}</p>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!hours.closed}
                            onChange={(e) => setOpeningHours({
                              ...openingHours,
                              [day]: { ...hours, closed: !e.target.checked }
                            })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-muted-foreground">Open</span>
                        </label>
                        {!hours.closed && (
                          <>
                            <Input
                              type="time"
                              value={hours.open}
                              onChange={(e) => setOpeningHours({
                                ...openingHours,
                                [day]: { ...hours, open: e.target.value }
                              })}
                              className="w-32 rounded-none border-2"
                            />
                            <span className="text-muted-foreground">—</span>
                            <Input
                              type="time"
                              value={hours.close}
                              onChange={(e) => setOpeningHours({
                                ...openingHours,
                                [day]: { ...hours, close: e.target.value }
                              })}
                              className="w-32 rounded-none border-2"
                            />
                          </>
                        )}
                        {hours.closed && (
                          <span className="text-muted-foreground tracking-wider">CLOSED</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-8">
                    <Button onClick={handleSaveHours} disabled={isSaving}>
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'SAVING...' : 'SAVE HOURS'}
                    </Button>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border-2 p-8 transition-colors ${isDragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleGalleryDrop}
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="font-display text-xl tracking-wider">GALLERY</h2>
                    <span className={`text-sm tracking-wider ${galleryNearLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {galleryCount}/{MAX_GALLERY_IMAGES}
                    </span>
                  </div>

                  {galleryNearLimit && !galleryAtLimit && (
                    <div className="flex items-center gap-2 p-3 mb-4 border border-yellow-500/30 bg-yellow-500/10 text-sm text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>You're approaching the {MAX_GALLERY_IMAGES} image limit ({MAX_GALLERY_IMAGES - galleryCount} remaining)</span>
                    </div>
                  )}

                  {galleryAtLimit && (
                    <div className="flex items-center gap-2 p-3 mb-4 border border-destructive/30 bg-destructive/10 text-sm text-destructive">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Gallery is full. Delete images to upload more.</span>
                    </div>
                  )}

                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleGalleryChange}
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {barberProfile?.gallery_images?.map((image, index) => (
                      <div key={index} className="relative aspect-square bg-muted group">
                        <img 
                          src={image} 
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button 
                          onClick={() => handleDeleteGalleryImage(image)}
                          disabled={isDeletingImage === image}
                          className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          {isDeletingImage === image ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                    {!galleryAtLimit && (
                      <button 
                        onClick={handleGalleryClick}
                        disabled={isUploadingGallery}
                        className="aspect-square border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-foreground transition-colors disabled:opacity-50"
                      >
                        {isUploadingGallery ? (
                          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        ) : (
                          <Plus className="w-8 h-8 text-muted-foreground" />
                        )}
                        <span className="text-xs tracking-widest text-muted-foreground">
                          {isUploadingGallery ? 'UPLOADING...' : 'ADD PHOTO'}
                        </span>
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mt-6">
                    Drag & drop images here or click to upload. Max 5MB per image.
                  </p>
                </motion.div>
              </TabsContent>

              {/* Videos Tab */}
              <TabsContent value="videos" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-border p-8"
                >
                  <h2 className="font-display text-xl tracking-wider mb-8">SHOWCASE VIDEOS</h2>

                  {barberProfile && user && (
                    <VideoUploader
                      userId={user.id}
                      videos={barberProfile.videos || []}
                      maxVideos={MAX_VIDEOS}
                      onVideosChange={async (newVideos) => {
                        const { error } = await supabase
                          .from('barber_profiles')
                          .update({ videos: newVideos })
                          .eq('id', barberProfile.id);

                        if (error) {
                          toast({
                            title: t('toasts.error'),
                            description: t('toasts.shop.videosUpdateError'),
                            variant: 'destructive',
                          });
                        } else {
                          setBarberProfile({ ...barberProfile, videos: newVideos });
                        }
                      }}
                    />
                  )}
                </motion.div>
              </TabsContent>

            </Tabs>
          </div>
        </main>
</div>
    </PageTransition>
  );
}
