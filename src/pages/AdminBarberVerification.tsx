import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, XCircle, Clock, MapPin, Phone, Mail, 
  ExternalLink, ChevronDown, ChevronUp, Search, Filter, Shield
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PendingBarber {
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
  is_verified: boolean | null;
  is_active: boolean | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

function AdminBarberVerificationContent() {
  const { t } = useTranslation();
  const [barbers, setBarbers] = useState<PendingBarber[]>([]);
  const [allBarbers, setAllBarbers] = useState<PendingBarber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<PendingBarber | null>(null);
  const [dialogMode, setDialogMode] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const canAccessPage = hasRole('admin') || hasRole('founder');

  useEffect(() => {
    if (user && canAccessPage) {
      fetchBarbers();

      // Poll for barber profile changes every 15 seconds
      const pollInterval = setInterval(() => {
        fetchBarbers();
      }, 15000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [user, canAccessPage, filterStatus, t]);

  const fetchBarbers = useCallback(async () => {
    setIsLoading(true);
    
    // Always fetch all barbers for stats
    const { data: allData, error: allError } = await supabase
      .from('barber_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('Error fetching all barbers:', allError);
    } else if (allData) {
      const allBarbersWithProfiles = await Promise.all(
        allData.map(async (barber) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', barber.user_id)
            .single();
          
          return {
            ...barber,
            user_email: profileData?.email || 'N/A',
            user_name: profileData?.full_name || 'N/A',
          };
        })
      );
      setAllBarbers(allBarbersWithProfiles);
      
      // Filter based on status
      let filteredData = allBarbersWithProfiles;
      if (filterStatus === 'pending') {
        filteredData = allBarbersWithProfiles.filter(b => !b.is_verified && b.is_active);
      } else if (filterStatus === 'verified') {
        filteredData = allBarbersWithProfiles.filter(b => b.is_verified === true);
      } else if (filterStatus === 'rejected') {
        filteredData = allBarbersWithProfiles.filter(b => !b.is_active);
      }
      
      setBarbers(filteredData);
    }
    
    setIsLoading(false);
  }, [filterStatus]);

  const handleRefresh = useCallback(async () => {
    await fetchBarbers();
    toast({
      title: t('common.refreshed') || 'Refreshed',
      description: t('common.dataUpdated') || 'Data has been updated',
    });
  }, [fetchBarbers, toast, t]);

  const sendNotificationEmail = async (barberId: string, action: 'approved' | 'rejected', reason?: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-barber-notification', {
        body: { barber_id: barberId, action, reason }
      });
      
      if (error) {
        console.error('Failed to send notification email:', error);
      }
    } catch (err) {
      console.error('Error sending notification email:', err);
    }
  };

  const handleApprove = async () => {
    if (!selectedBarber) return;
    
    setIsProcessing(true);
    
    const { error } = await supabase
      .from('barber_profiles')
      .update({ 
        is_verified: true,
        is_active: true,
      })
      .eq('id', selectedBarber.id);

    if (error) {
      toast({
        title: t('founder.barberVerification.error'),
        description: t('founder.barberVerification.failedApprove'),
        variant: 'destructive',
      });
    } else {
      // Optimistically update the UI immediately
      const updatedBarber = { ...selectedBarber, is_verified: true, is_active: true };
      
      setAllBarbers(prev => 
        prev.map(b => b.id === selectedBarber.id ? updatedBarber : b)
      );
      
      // Update filtered list based on current filter
      if (filterStatus === 'pending') {
        setBarbers(prev => prev.filter(b => b.id !== selectedBarber.id));
      } else if (filterStatus === 'verified') {
        setBarbers(prev => [...prev, updatedBarber]);
      } else if (filterStatus === 'all') {
        setBarbers(prev => prev.map(b => b.id === selectedBarber.id ? updatedBarber : b));
      }
      
      // Send notification email (async, don't block UI)
      sendNotificationEmail(selectedBarber.id, 'approved');
      
      // Log activity (async, don't block UI)
      supabase.rpc('log_admin_activity', {
        p_action_type: 'barber_approved',
        p_target_barber_id: selectedBarber.id,
        p_details: { shop_name: selectedBarber.shop_name, city: selectedBarber.city },
      }).then(({ error }) => {
        if (error) console.error('Failed to log activity:', error);
      });
      
      toast({
        title: t('founder.barberVerification.barberApproved'),
        description: t('founder.barberVerification.barberApprovedDesc', { name: selectedBarber.shop_name }),
      });
    }

    setIsProcessing(false);
    setDialogMode(null);
    setSelectedBarber(null);
  };

  const handleReject = async () => {
    if (!selectedBarber) return;
    
    setIsProcessing(true);
    
    const { error } = await supabase
      .from('barber_profiles')
      .update({ 
        is_verified: false,
        is_active: false,
      })
      .eq('id', selectedBarber.id);

    if (error) {
      toast({
        title: t('founder.barberVerification.error'),
        description: t('founder.barberVerification.failedReject'),
        variant: 'destructive',
      });
    } else {
      // Optimistically update the UI immediately
      const updatedBarber = { ...selectedBarber, is_verified: false, is_active: false };
      
      setAllBarbers(prev => 
        prev.map(b => b.id === selectedBarber.id ? updatedBarber : b)
      );
      
      // Update filtered list based on current filter
      if (filterStatus === 'pending') {
        setBarbers(prev => prev.filter(b => b.id !== selectedBarber.id));
      } else if (filterStatus === 'rejected') {
        setBarbers(prev => [...prev, updatedBarber]);
      } else if (filterStatus === 'all') {
        setBarbers(prev => prev.map(b => b.id === selectedBarber.id ? updatedBarber : b));
      }
      
      // Send notification email with rejection reason (async, don't block UI)
      sendNotificationEmail(selectedBarber.id, 'rejected', rejectionReason || undefined);
      
      // Log activity (async, don't block UI)
      supabase.rpc('log_admin_activity', {
        p_action_type: 'barber_rejected',
        p_target_barber_id: selectedBarber.id,
        p_details: { shop_name: selectedBarber.shop_name, city: selectedBarber.city, reason: rejectionReason },
      }).then(({ error }) => {
        if (error) console.error('Failed to log activity:', error);
      });
      
      toast({
        title: t('founder.barberVerification.barberRejected'),
        description: t('founder.barberVerification.barberRejectedDesc', { name: selectedBarber.shop_name }),
      });
    }

    setIsProcessing(false);
    setDialogMode(null);
    setSelectedBarber(null);
    setRejectionReason('');
  };

  const filteredBarbers = barbers.filter(
    (barber) =>
      barber.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barber.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barber.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (barber: PendingBarber) => {
    if (!barber.is_active) {
      return <Badge variant="destructive">{t('founder.barberVerification.rejected')}</Badge>;
    }
    if (barber.is_verified) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">{t('founder.barberVerification.verified')}</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">{t('founder.barberVerification.pending')}</Badge>;
  };

  const statusFilters = ['pending', 'verified', 'rejected', 'all'] as const;
  const getStatusLabel = (status: typeof statusFilters[number]) => {
    return t(`founder.barberVerification.${status}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh} className="pt-20 md:pt-28 pb-16 min-h-screen">
        <main>
          <div className="container mx-auto px-3 md:px-4">
          <Breadcrumbs />
          
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              <p className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] text-primary font-semibold">{t('nav.admin')}</p>
            </div>
            <h1 className="font-display text-2xl md:text-5xl font-bold tracking-wider">
              {t('founder.barberVerification.title')}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2 md:mt-3">
              {t('founder.barberVerification.subtitle')}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <Input
                placeholder={t('founder.barberVerification.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 h-10 md:h-12 text-sm"
              />
            </div>
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1">
              {statusFilters.map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status)}
                  size="sm"
                  className="capitalize text-xs md:text-sm whitespace-nowrap px-2.5 md:px-4"
                >
                  {getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 md:p-4 border border-yellow-500/30 bg-yellow-500/5"
            >
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{allBarbers.filter(b => !b.is_verified && b.is_active).length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.barberVerification.pendingReview')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 md:p-4 border border-green-500/30 bg-green-500/5"
            >
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{allBarbers.filter(b => b.is_verified === true).length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.barberVerification.verified')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 md:p-4 border border-red-500/30 bg-red-500/5"
            >
              <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{allBarbers.filter(b => b.is_active === false).length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.barberVerification.rejected')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 md:p-4 border border-border bg-card"
            >
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-primary mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{allBarbers.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.barberVerification.totalBarbers')}</p>
            </motion.div>
          </div>

          {/* Barber List */}
          {isLoading ? (
            <div className="space-y-3 md:space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 md:h-24 bg-card animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredBarbers.length === 0 ? (
            <div className="text-center py-12 md:py-16 border-2 border-dashed border-border rounded-lg">
              <p className="text-lg md:text-xl font-medium mb-2">{t('founder.barberVerification.noBarbers')}</p>
              <p className="text-sm md:text-base text-muted-foreground">
                {filterStatus === 'pending' 
                  ? t('founder.barberVerification.noPending')
                  : t('founder.barberVerification.adjustFilters')}
              </p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-4">
              {filteredBarbers.map((barber) => (
                <motion.div
                  key={barber.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border bg-card overflow-hidden"
                >
                  {/* Header Row */}
                  <div 
                    className="p-3 md:p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedBarber(expandedBarber === barber.id ? null : barber.id)}
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      {barber.profile_image_url ? (
                        <img
                          src={barber.profile_image_url}
                          alt={barber.shop_name}
                          className="w-10 h-10 md:w-14 md:h-14 object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-muted flex items-center justify-center text-lg md:text-2xl flex-shrink-0">
                          💈
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm md:text-lg truncate">{barber.shop_name}</h3>
                        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">{barber.city}, {barber.country}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      {getStatusBadge(barber)}
                      <span className="text-xs md:text-sm text-muted-foreground hidden md:block">
                        {new Date(barber.created_at).toLocaleDateString()}
                      </span>
                      {expandedBarber === barber.id ? (
                        <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedBarber === barber.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 md:p-6 grid md:grid-cols-2 gap-4 md:gap-6">
                        {/* Details */}
                        <div className="space-y-3 md:space-y-4">
                          <h4 className="font-semibold text-xs md:text-sm tracking-wider text-muted-foreground">{t('founder.barberVerification.details')}</h4>
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center gap-2 md:gap-3">
                              <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm md:text-base truncate">{barber.user_email}</span>
                            </div>
                            {barber.phone && (
                              <div className="flex items-center gap-2 md:gap-3">
                                <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm md:text-base">{barber.phone}</span>
                              </div>
                            )}
                            <div className="flex items-start gap-2 md:gap-3">
                              <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <span className="text-sm md:text-base">
                                {barber.address}<br />
                                {barber.postal_code} {barber.city}, {barber.country}
                              </span>
                            </div>
                          </div>
                          {barber.description && (
                            <div>
                              <h5 className="font-medium text-xs md:text-sm mb-1 md:mb-2">{t('founder.barberVerification.description')}</h5>
                              <p className="text-muted-foreground text-xs md:text-sm">{barber.description}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3 md:space-y-4">
                          <h4 className="font-semibold text-xs md:text-sm tracking-wider text-muted-foreground">{t('founder.barberVerification.actions')}</h4>
                          <div className="flex flex-col gap-2 md:gap-3">
                            {!barber.is_verified && barber.is_active && (
                              <>
                                <Button
                                  onClick={() => {
                                    setSelectedBarber(barber);
                                    setDialogMode('approve');
                                  }}
                                  className="w-full bg-green-600 hover:bg-green-700 text-sm"
                                  size="sm"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
                                  {t('founder.barberVerification.approveBarber')}
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedBarber(barber);
                                    setDialogMode('reject');
                                  }}
                                  className="w-full text-sm"
                                  size="sm"
                                >
                                  <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
                                  {t('founder.barberVerification.rejectBarber')}
                                </Button>
                              </>
                            )}
                            {barber.is_verified && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedBarber(barber);
                                  setDialogMode('reject');
                                }}
                                className="w-full text-sm"
                                size="sm"
                              >
                                <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
                                {t('founder.barberVerification.revokeVerification')}
                              </Button>
                            )}
                            {!barber.is_active && (
                              <Button
                                onClick={() => {
                                  setSelectedBarber(barber);
                                  setDialogMode('approve');
                                }}
                                className="w-full text-sm"
                                size="sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
                                {t('founder.barberVerification.reinstateBarber')}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              asChild
                              size="sm"
                              className="text-sm"
                            >
                              <a href={`/barber/${barber.id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
                                {t('founder.barberVerification.viewProfile')}
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          </div>
        </main>
      </PullToRefresh>

      {/* Mobile Bottom Nav */}
{/* Approve Dialog */}
      <Dialog open={dialogMode === 'approve'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('founder.barberVerification.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('founder.barberVerification.approveDesc', { name: selectedBarber?.shop_name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogMode(null)} className="w-full sm:w-auto">
              {t('founder.barberVerification.cancel')}
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              {isProcessing ? t('founder.barberVerification.processing') : t('founder.barberVerification.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject/Revoke Dialog */}
      <Dialog open={dialogMode === 'reject'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedBarber?.is_verified ? t('founder.barberVerification.revokeTitle') : t('founder.barberVerification.rejectTitle')}
            </DialogTitle>
            <DialogDescription>
              {selectedBarber?.is_verified 
                ? t('founder.barberVerification.revokeDesc', { name: selectedBarber?.shop_name })
                : t('founder.barberVerification.rejectDesc', { name: selectedBarber?.shop_name })
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={selectedBarber?.is_verified 
                ? t('founder.barberVerification.reasonRequired')
                : t('founder.barberVerification.reasonOptional')
              }
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogMode(null)} className="w-full sm:w-auto">
              {t('founder.barberVerification.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject} 
              disabled={isProcessing || (selectedBarber?.is_verified && !rejectionReason.trim())}
              className="w-full sm:w-auto"
            >
              {isProcessing 
                ? t('founder.barberVerification.processing') 
                : (selectedBarber?.is_verified 
                    ? t('founder.barberVerification.revokeVerification') 
                    : t('founder.barberVerification.reject')
                  )
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminBarberVerification() {
  return (<AdminBarberVerificationContent />
);
}
