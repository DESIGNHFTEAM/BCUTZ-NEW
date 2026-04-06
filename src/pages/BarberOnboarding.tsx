import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Upload, MapPin, Clock, Loader2, Scissors, Sparkles, CheckCircle2, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useConfetti } from '@/hooks/useConfetti';

type BusinessType = 'barbershop' | 'salon';

interface FormData {
  shopName: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  businessType: BusinessType;
  openingHours: Record<string, { open: string; close: string; closed: boolean }>;
}

const defaultOpeningHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '16:00', closed: false },
  sunday: { open: '09:00', close: '16:00', closed: true },
};

const steps = [
  { id: 'basics', title: 'Shop Details', description: 'Tell us about your shop' },
  { id: 'location', title: 'Location', description: 'Where are you located?' },
  { id: 'hours', title: 'Opening Hours', description: 'Set your availability' },
];

export default function BarberOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { fireCelebration } = useConfetti();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    shopName: '',
    description: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'CH',
    businessType: 'barbershop',
    openingHours: defaultOpeningHours,
  });

  const updateFormData = (key: keyof FormData, value: string | Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpeningHoursChange = (
    day: string,
    field: 'open' | 'close' | 'closed',
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value,
        },
      },
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        return formData.shopName.length >= 2;
      case 1:
        return formData.address && formData.city && formData.postalCode;
      case 2:
        return true; // Opening hours have defaults
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    } else {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Geocode the address to get lat/lng for map display
      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke(
          'geocode-address',
          {
            body: {
              address: formData.address,
              city: formData.city,
              postalCode: formData.postalCode,
              country: formData.country,
            },
          }
        );

        if (!geocodeError && geocodeData?.latitude && geocodeData?.longitude) {
          latitude = geocodeData.latitude;
          longitude = geocodeData.longitude;
          console.log('Geocoded address:', latitude, longitude);
        } else {
          console.log('Geocoding skipped or failed:', geocodeError);
        }
      } catch (geocodeErr) {
        console.log('Geocoding error (non-blocking):', geocodeErr);
        // Continue without coordinates - map will fallback to city-level
      }

      // Create barber profile FIRST (before requesting role)
      const { error: profileError } = await supabase.from('barber_profiles').insert({
        user_id: user.id,
        shop_name: formData.shopName,
        description: formData.description || null,
        phone: formData.phone || null,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country,
        latitude,
        longitude,
        opening_hours: formData.openingHours,
        business_type: formData.businessType,
      });

      if (profileError) throw profileError;

      // Request barber role AFTER profile is created
      const { error: roleError } = await supabase
        .rpc('request_barber_role');

      if (roleError) {
        console.log('Role request error (non-blocking):', roleError);
        // Don't throw - profile was created successfully
      }

      // Fire celebration confetti
      fireCelebration();
      
      // Show success dialog instead of navigating immediately
      setShowSuccessDialog(true);
    } catch (error: unknown) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            key="basics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Business Type Selector */}
            <div className="space-y-3">
              <Label>Business Type *</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateFormData('businessType', 'barbershop')}
                  className={`p-4 border-2 transition-all flex flex-col items-center gap-3 ${
                    formData.businessType === 'barbershop'
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <Scissors className={`w-8 h-8 ${formData.businessType === 'barbershop' ? 'text-accent' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className="font-display tracking-wider text-sm">BARBERSHOP</p>
                    <p className="text-xs text-muted-foreground mt-1">Men's grooming & haircuts</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData('businessType', 'salon')}
                  className={`p-4 border-2 transition-all flex flex-col items-center gap-3 ${
                    formData.businessType === 'salon'
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <Sparkles className={`w-8 h-8 ${formData.businessType === 'salon' ? 'text-accent' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className="font-display tracking-wider text-sm">BEAUTY SALON</p>
                    <p className="text-xs text-muted-foreground mt-1">Full-service beauty care</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopName">{formData.businessType === 'salon' ? 'Salon Name' : 'Shop Name'} *</Label>
              <Input
                id="shopName"
                placeholder={formData.businessType === 'salon' ? 'e.g., Glamour Beauty Studio' : 'e.g., Classic Cuts Zürich'}
                value={formData.shopName}
                onChange={(e) => updateFormData('shopName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">About Your {formData.businessType === 'salon' ? 'Salon' : 'Shop'}</Label>
              <Textarea
                id="description"
                placeholder={formData.businessType === 'salon' 
                  ? 'Tell clients about your salon, your services, and what makes you unique...'
                  : 'Tell clients about your shop, your style, and what makes you unique...'}
                rows={4}
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+41 79 123 45 67"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
              />
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="location"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                placeholder="Bahnhofstrasse 123"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  placeholder="8001"
                  value={formData.postalCode}
                  onChange={(e) => updateFormData('postalCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Zürich"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value="Switzerland" disabled className="bg-muted" />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="hours"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {Object.entries(formData.openingHours).map(([day, hours]) => (
              <div
                key={day}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50"
              >
                <div className="w-24 capitalize font-medium">{day}</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => handleOpeningHoursChange(day, 'closed', !e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Open</span>
                </label>
                {!hours.closed && (
                  <>
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => handleOpeningHoursChange(day, 'open', e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => handleOpeningHoursChange(day, 'close', e.target.value)}
                      className="w-28"
                    />
                  </>
                )}
                {hours.closed && (
                  <span className="text-muted-foreground text-sm">Closed</span>
                )}
              </div>
            ))}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
<main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Progress */}
          <div className="mb-12">
            <div className="flex justify-between mb-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 ${index < steps.length - 1 ? 'relative' : ''}`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                        index < currentStep
                          ? 'bg-primary text-primary-foreground'
                          : index === currentStep
                          ? 'bg-gradient-gold text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className="text-xs mt-2 text-center hidden sm:block">
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5 ${
                        index < currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-8"
          >
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold mb-2">
                {steps[currentStep].title}
              </h1>
              <p className="text-muted-foreground">{steps[currentStep].description}</p>
            </div>

            <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-gradient-gold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
              </div>
            </motion.div>
            <DialogTitle className="text-2xl font-display text-center">
              🎉 Shop Profile Created!
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-base">
                Your {formData.businessType === 'salon' ? 'salon' : 'barbershop'} <strong>"{formData.shopName}"</strong> has been set up successfully.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-start gap-3">
                  <Clock3 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Pending Admin Approval</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      For security reasons, our team will review your shop profile. This usually takes less than 1 hour. You'll receive an email once approved.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                In the meantime, you can add your services and complete your profile.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => {
                window.location.href = '/dashboard/services';
              }}
              className="bg-gradient-gold"
            >
              Add Your Services
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
            >
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
