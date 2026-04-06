import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Plus, Loader2, Scissors, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: 'haircut' | 'beard' | 'combo' | 'specialty';
}

const serviceTemplates: ServiceTemplate[] = [
  {
    id: 'classic-haircut',
    name: 'Classic Haircut',
    description: 'Traditional scissor or clipper cut tailored to your style',
    price: 35,
    duration_minutes: 30,
    category: 'haircut',
  },
  {
    id: 'fade-haircut',
    name: 'Fade Haircut',
    description: 'Modern fade with seamless blending',
    price: 40,
    duration_minutes: 35,
    category: 'haircut',
  },
  {
    id: 'kids-haircut',
    name: 'Kids Haircut',
    description: 'Haircut for children under 12',
    price: 25,
    duration_minutes: 25,
    category: 'haircut',
  },
  {
    id: 'beard-trim',
    name: 'Beard Trim',
    description: 'Professional beard shaping and trimming',
    price: 20,
    duration_minutes: 20,
    category: 'beard',
  },
  {
    id: 'beard-shape',
    name: 'Beard Shape & Line Up',
    description: 'Clean lines and detailed beard sculpting',
    price: 25,
    duration_minutes: 25,
    category: 'beard',
  },
  {
    id: 'hot-towel-shave',
    name: 'Hot Towel Shave',
    description: 'Traditional straight razor shave with hot towel treatment',
    price: 35,
    duration_minutes: 30,
    category: 'beard',
  },
  {
    id: 'haircut-beard',
    name: 'Haircut + Beard',
    description: 'Complete grooming package with haircut and beard trim',
    price: 50,
    duration_minutes: 45,
    category: 'combo',
  },
  {
    id: 'full-service',
    name: 'Full Service Package',
    description: 'Haircut, beard trim, hot towel, and styling',
    price: 70,
    duration_minutes: 60,
    category: 'combo',
  },
  {
    id: 'hair-design',
    name: 'Hair Design',
    description: 'Creative hair designs and patterns',
    price: 15,
    duration_minutes: 15,
    category: 'specialty',
  },
  {
    id: 'hair-coloring',
    name: 'Hair Coloring',
    description: 'Professional hair coloring service',
    price: 45,
    duration_minutes: 45,
    category: 'specialty',
  },
];

const categoryLabels = {
  haircut: 'Haircuts',
  beard: 'Beard Services',
  combo: 'Packages',
  specialty: 'Specialty',
};

const categoryIcons = {
  haircut: '✂️',
  beard: '🧔',
  combo: '💈',
  specialty: '✨',
};

interface ServiceWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberProfileId: string;
  onServicesAdded: () => void;
}

export function ServiceWizard({ 
  open, 
  onOpenChange, 
  barberProfileId,
  onServicesAdded 
}: ServiceWizardProps) {
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedServices(new Set(serviceTemplates.map(s => s.id)));
  };

  const clearAll = () => {
    setSelectedServices(new Set());
  };

  const handleSave = async () => {
    if (selectedServices.size === 0) {
      toast({
        title: 'No services selected',
        description: 'Please select at least one service to add.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const servicesToInsert = serviceTemplates
        .filter(s => selectedServices.has(s.id))
        .map(s => ({
          barber_id: barberProfileId,
          name: s.name,
          description: s.description,
          price: s.price,
          duration_minutes: s.duration_minutes,
          currency: 'CHF',
          is_active: true,
        }));

      const { error } = await supabase
        .from('services')
        .insert(servicesToInsert);

      if (error) throw error;

      toast({
        title: 'Services added!',
        description: `Successfully added ${servicesToInsert.length} service${servicesToInsert.length > 1 ? 's' : ''} to your profile.`,
      });

      setSelectedServices(new Set());
      onOpenChange(false);
      onServicesAdded();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add services. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const groupedServices = serviceTemplates.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, ServiceTemplate[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Service Setup
          </DialogTitle>
          <DialogDescription>
            Select from common barber services to quickly populate your menu. You can edit prices and details later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">
            {selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 py-4 space-y-6">
          {(Object.keys(groupedServices) as Array<keyof typeof categoryLabels>).map((category) => (
            <div key={category}>
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <span>{categoryIcons[category]}</span>
                {categoryLabels[category]}
              </h3>
              <div className="grid gap-2">
                {groupedServices[category].map((service) => (
                  <motion.button
                    key={service.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleService(service.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedServices.has(service.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          <AnimatePresence>
                            {selectedServices.has(service.id) && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-semibold text-primary">CHF {service.price}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || selectedServices.size === 0}
            className="bg-gradient-gold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add {selectedServices.size} Service{selectedServices.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
