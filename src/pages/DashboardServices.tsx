import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Clock, DollarSign, Loader2, X, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ServiceWizard } from '@/components/ServiceWizard';
import { PullToRefresh } from '@/components/PullToRefresh';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  currency: string;
  is_active: boolean;
}

interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  duration_minutes?: string;
}

// Zod validation schema for service data
const serviceSchema = z.object({
  name: z.string()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name cannot exceed 100 characters'),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  price: z.string()
    .refine((val) => val !== '' && !isNaN(parseFloat(val)), 'Price must be a valid number')
    .refine((val) => parseFloat(val) > 0, 'Price must be greater than 0')
    .refine((val) => parseFloat(val) < 10000, 'Price cannot exceed 10,000'),
  duration_minutes: z.string()
    .refine((val) => !isNaN(parseInt(val)), 'Duration must be a number')
    .refine((val) => parseInt(val) >= 5, 'Duration must be at least 5 minutes')
    .refine((val) => parseInt(val) <= 480, 'Duration cannot exceed 8 hours'),
  is_active: z.boolean(),
});

const defaultFormData: ServiceFormData = {
  name: '',
  description: '',
  price: '',
  duration_minutes: '30',
  is_active: true,
};

export default function DashboardServices() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { toast } = useToast();
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('barber'))) {
      navigate('/barber-onboarding');
    }
  }, [user, authLoading, hasRole, navigate]);

  useEffect(() => {
    if (user && hasRole('barber')) {
      fetchBarberProfile();
    }
  }, [user, hasRole]);

  const fetchBarberProfile = async () => {
    const { data: profile } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (profile) {
      setBarberProfileId(profile.id);
      fetchServices(profile.id);
    } else {
      navigate('/barber-onboarding');
    }
  };

  const fetchServices = async (barberId: string) => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at');

    if (!error && data) {
      setServices(data);
    }
    setIsLoading(false);
  };

  const openAddDialog = () => {
    setEditingService(null);
    setFormData(defaultFormData);
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
      is_active: service.is_active,
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (serviceId: string) => {
    setDeletingServiceId(serviceId);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!barberProfileId) {
      toast({
        title: 'Error',
        description: 'Barber profile not found.',
        variant: 'destructive',
      });
      return;
    }

    // Clear previous errors
    setFormErrors({});

    // Validate form data with zod
    const validationResult = serviceSchema.safeParse(formData);
    
    if (!validationResult.success) {
      const errors: FormErrors = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        if (field) {
          errors[field] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      const serviceData = {
        barber_id: barberProfileId,
        name: validationResult.data.name.trim(),
        description: validationResult.data.description?.trim() || null,
        price: parseFloat(validationResult.data.price),
        duration_minutes: parseInt(validationResult.data.duration_minutes),
        is_active: validationResult.data.is_active,
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;

        toast({ title: 'Service updated successfully' });
      } else {
        const { error } = await supabase.from('services').insert(serviceData);

        if (error) throw error;

        toast({ title: 'Service added successfully' });
      }

      setIsDialogOpen(false);
      setFormErrors({});
      fetchServices(barberProfileId);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save service',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingServiceId || !barberProfileId) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', deletingServiceId);

      if (error) throw error;

      toast({ title: 'Service removed' });
      setIsDeleteDialogOpen(false);
      fetchServices(barberProfileId);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to remove service',
        variant: 'destructive',
      });
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    if (!barberProfileId) return;

    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (!error) {
      fetchServices(barberProfileId);
    }
  };

  if (authLoading || !user || !hasRole('barber')) {
    return null;
  }

  const handleRefresh = useCallback(async () => {
    if (barberProfileId) await fetchServices(barberProfileId);
  }, [barberProfileId]);

  return (
    <div className="min-h-screen bg-background">
<PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <Breadcrumbs />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="font-display text-4xl font-bold mb-2">{t('dashboardServices.title')}</h1>
              <p className="text-muted-foreground">
                {t('dashboardServices.subtitle')}
              </p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button 
                variant="outline" 
                onClick={() => setIsWizardOpen(true)}
                className="border-primary/50 hover:border-primary"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('dashboardServices.quickSetup')}
              </Button>
              <Button onClick={openAddDialog} className="bg-gradient-gold">
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboardServices.addService')}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-card animate-shimmer" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-card rounded-2xl border border-border"
            >
              <Sparkles className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">{t('dashboardServices.noServicesYet')}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t('dashboardServices.noServicesDesc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setIsWizardOpen(true)} className="bg-gradient-gold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('dashboardServices.quickSetupWizard')}
                </Button>
                <Button variant="outline" onClick={openAddDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dashboardServices.addCustomService')}
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-card rounded-xl border border-border p-6 ${
                      !service.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-lg">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={() => toggleServiceStatus(service)}
                      />
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{service.duration_minutes} {t('dashboardServices.min')}</span>
                      </div>
                      <div className="font-display font-bold text-gradient-gold">
                        {service.currency} {service.price}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(service)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        {t('dashboardServices.edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(service.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
      </PullToRefresh>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? t('dashboardServices.editService') : t('dashboardServices.addNewService')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">{t('dashboardServices.serviceName')} *</Label>
              <Input
                id="serviceName"
                placeholder={t('dashboardServices.serviceNamePlaceholder')}
                maxLength={100}
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceDescription">{t('dashboardServices.description')}</Label>
              <Textarea
                id="serviceDescription"
                placeholder={t('dashboardServices.descriptionPlaceholder')}
                rows={3}
                maxLength={500}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                className={formErrors.description ? 'border-destructive' : ''}
              />
              {formErrors.description && (
                <p className="text-sm text-destructive">{formErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">{formData.description.length}/500</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="servicePrice">{t('dashboardServices.price')} *</Label>
                <Input
                  id="servicePrice"
                  type="number"
                  min="0.01"
                  max="9999.99"
                  step="0.50"
                  placeholder="35.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  className={formErrors.price ? 'border-destructive' : ''}
                />
                {formErrors.price && (
                  <p className="text-sm text-destructive">{formErrors.price}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceDuration">{t('dashboardServices.duration')} *</Label>
                <Input
                  id="serviceDuration"
                  type="number"
                  min="5"
                  max="480"
                  step="5"
                  placeholder="30"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration_minutes: e.target.value,
                    }))
                  }
                  className={formErrors.duration_minutes ? 'border-destructive' : ''}
                />
                {formErrors.duration_minutes && (
                  <p className="text-sm text-destructive">{formErrors.duration_minutes}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="serviceActive">{t('dashboardServices.active')}</Label>
              <Switch
                id="serviceActive"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-gold">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('dashboardServices.saving')}
                </>
              ) : (
                t('dashboardServices.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboardServices.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboardServices.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dashboardServices.deleteConfirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('dashboardServices.deleteConfirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Service Wizard */}
      {barberProfileId && (
        <ServiceWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          barberProfileId={barberProfileId}
          onServicesAdded={() => fetchServices(barberProfileId)}
        />
      )}
    </div>
  );
}
