import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Star, CreditCard, CheckCircle2, AlertTriangle, User, Phone, Mail, Eye, Bug, RefreshCw, X } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, isPast, parseISO, isToday, isBefore, addHours } from 'date-fns';
import { WriteReviewDialog } from '@/components/WriteReviewDialog';
import { PaymentButton } from '@/components/PaymentButton';
import { BookingDetailModal } from '@/components/BookingDetailModal';
import { toast } from 'sonner';
import { BarberBadge } from '@/components/BarberBadge';
import { useTranslation } from 'react-i18next';
import { PullToRefresh } from '@/components/PullToRefresh';

// Debug panel state interface
interface PaymentDebugInfo {
  timestamp: string;
  error: string;
  details?: string;
  bookingId?: string;
}

// Customer booking interface
interface CustomerBooking {
  id: string;
  booking_date: string;
  start_time: string;
  service_name: string;
  service_id: string | null;
  service_price: number;
  platform_fee: number;
  total_amount: number;
  currency: string;
  status: string;
  barber_id: string;
  barber_profiles: {
    shop_name: string;
    address: string;
    city: string;
    stripe_onboarding_complete: boolean | null;
  };
  reviews?: { id: string }[];
  payments?: { id: string; status: string }[];
}

// Barber booking interface (shows customer info)
interface BarberBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_price: number;
  total_amount: number;
  currency: string;
  status: string;
  customer_id: string | null;
  notes: string | null;
  customer_profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  payments?: { id: string; status: string }[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  confirmed: 'bg-green-500/20 text-green-500',
  completed: 'bg-blue-500/20 text-blue-500',
  cancelled: 'bg-destructive/20 text-destructive',
  no_show: 'bg-muted text-muted-foreground',
};

export default function Bookings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { formatPrice, currency } = useCurrency();
  const isBarber = hasRole('barber');
  
  // Customer state
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);
  
  // Barber state
  const [barberBookings, setBarberBookings] = useState<BarberBooking[]>([]);
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    bookingId: string;
    barberId: string;
    shopName: string;
  }>({ open: false, bookingId: '', barberId: '', shopName: '' });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: CustomerBooking | BarberBooking | null }>({
    open: false,
    booking: null,
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [detailModal, setDetailModal] = useState<{ open: boolean; booking: any | null; isBarber: boolean }>({
    open: false,
    booking: null,
    isBarber: false,
  });
  
  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState<PaymentDebugInfo[]>([]);
  
  // Add payment error to debug log
  const handlePaymentError = useCallback((error: string, details?: string, bookingId?: string) => {
    const logEntry: PaymentDebugInfo = {
      timestamp: new Date().toISOString(),
      error,
      details,
      bookingId,
    };
    setDebugLogs(prev => [logEntry, ...prev].slice(0, 20)); // Keep last 20 logs
    setShowDebugPanel(true);
  }, []);

  // Check if booking can be cancelled (at least 1 hour before service)
  const canCancelBooking = (booking: CustomerBooking | BarberBooking) => {
    if (booking.status === 'cancelled' || booking.status === 'completed') return false;
    
    // Combine date and time to create full datetime
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const oneHourBefore = addHours(new Date(), 1);
    
    // Can only cancel if booking is more than 1 hour away
    return isBefore(oneHourBefore, bookingDateTime);
  };

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!cancelDialog.booking) return;
    
    // Double-check cancellation is allowed
    if (!canCancelBooking(cancelDialog.booking)) {
      toast.error('Cannot cancel bookings less than 1 hour before the appointment.');
      setCancelDialog({ open: false, booking: null });
      return;
    }
    
    setIsCancelling(true);
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: isBarber ? 'Cancelled by barber' : 'Cancelled by customer'
      })
      .eq('id', cancelDialog.booking.id);

    if (error) {
      toast.error('Failed to cancel booking. Please try again.');
      console.error('Cancel error:', error);
    } else {
      toast.success('Booking cancelled successfully.');
      if (isBarber) {
        fetchBarberBookings();
      } else {
        fetchCustomerBookings();
      }
    }
    
    setIsCancelling(false);
    setCancelDialog({ open: false, booking: null });
  };

  // Handle reschedule - navigate to barber profile to rebook
  const handleReschedule = (booking: CustomerBooking) => {
    toast.info('Please select a new time slot for your appointment.');
    navigate(`/barber/${booking.barber_id}`);
  };

  // Mark booking as completed (barber only)
  const handleMarkComplete = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to mark as complete.');
    } else {
      toast.success('Booking marked as completed!');
      fetchBarberBookings();
    }
  };

  // Mark as no-show (barber only)
  const handleMarkNoShow = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'no_show' })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to mark as no-show.');
    } else {
      toast.success('Booking marked as no-show.');
      fetchBarberBookings();
    }
  };

  // Handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (isBarber) {
      await fetchBarberBookings();
    } else {
      await fetchCustomerBookings();
    }
    setIsRefreshing(false);
    toast.success('Bookings refreshed');
  };

  // Handle payment redirect and auto-refresh
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const bookingId = searchParams.get('booking');
    
    if (paymentStatus === 'success' && bookingId) {
      toast.success('Payment successful! Your booking is confirmed.');
      window.history.replaceState({}, '', '/bookings');
      // Auto-refresh bookings after successful payment
      if (isBarber) {
        fetchBarberBookings();
      } else {
        fetchCustomerBookings();
      }
    } else if (paymentStatus === 'cancelled') {
      toast.info('Payment was cancelled. You can try again anytime.');
      window.history.replaceState({}, '', '/bookings');
    }
  }, [searchParams, isBarber]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      if (isBarber) {
        fetchBarberProfile();
      } else {
        fetchCustomerBookings();
      }
    }
  }, [user, isBarber]);

  const fetchBarberProfile = async () => {
    const { data } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();
    
    if (data) {
      setBarberProfileId(data.id);
      fetchBarberBookings(data.id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchBarberBookings = async (profileId?: string) => {
    const barberId = profileId || barberProfileId;
    if (!barberId) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        service_name,
        service_price,
        total_amount,
        currency,
        status,
        customer_id,
        notes,
        payments (id, status)
      `)
      .eq('barber_id', barberId)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && data) {
      // Fetch customer profiles for each booking
      const bookingsWithCustomers = await Promise.all(
        data.map(async (booking) => {
          if (booking.customer_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email, phone')
              .eq('id', booking.customer_id)
              .single();
            return { ...booking, customer_profile: profile };
          }
          return { ...booking, customer_profile: null };
        })
      );
      setBarberBookings(bookingsWithCustomers as BarberBooking[]);
    }
    setIsLoading(false);
  };

  const fetchCustomerBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        service_name,
        service_id,
        service_price,
        platform_fee,
        total_amount,
        currency,
        status,
        barber_id,
        barber_profiles (
          shop_name,
          address,
          city,
          stripe_onboarding_complete
        ),
        reviews (id),
        payments (id, status)
      `)
      .eq('customer_id', user?.id)
      .order('booking_date', { ascending: false });

    if (!error && data) {
      setCustomerBookings(data as unknown as CustomerBooking[]);
    }
    setIsLoading(false);
  };

  const handleRefresh = useCallback(async () => {
    if (isBarber) {
      await fetchBarberBookings();
    } else {
      await fetchCustomerBookings();
    }
  }, [isBarber, barberProfileId, user]);

  // Barber view filtering
  const todayBarberBookings = barberBookings.filter(
    (b) => isToday(parseISO(b.booking_date)) && b.status !== 'cancelled'
  );
  const upcomingBarberBookings = barberBookings.filter(
    (b) => !isPast(parseISO(b.booking_date)) && !isToday(parseISO(b.booking_date)) && b.status !== 'cancelled'
  );
  const pastBarberBookings = barberBookings.filter(
    (b) => isPast(parseISO(b.booking_date)) || b.status === 'cancelled'
  );

  // Customer view filtering
  const upcomingCustomerBookings = customerBookings.filter(
    (b) => !isPast(parseISO(b.booking_date)) && b.status !== 'cancelled'
  );
  const pastCustomerBookings = customerBookings.filter(
    (b) => isPast(parseISO(b.booking_date)) || b.status === 'cancelled'
  );

  const hasReview = (booking: CustomerBooking) => booking.reviews && booking.reviews.length > 0;
  const hasPaidPayment = (booking: CustomerBooking | BarberBooking) => 
    booking.payments && booking.payments.some(p => p.status === 'paid');
  const canPay = (booking: CustomerBooking) => 
    booking.status === 'pending' && 
    booking.service_id && 
    booking.barber_profiles.stripe_onboarding_complete &&
    !hasPaidPayment(booking);

  // Barber Booking Card Component
  const BarberBookingCard = ({ booking }: { booking: BarberBooking }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-lg">
              {booking.customer_profile?.full_name || t('bookings.guestCustomer')}
            </h3>
          </div>
          {booking.customer_profile?.email && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {booking.customer_profile.email}
            </p>
          )}
          {booking.customer_profile?.phone && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {booking.customer_profile.phone}
            </p>
          )}
        </div>
        <Badge className={statusColors[booking.status]}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{t('bookings.service')}</p>
          <p className="font-medium">{booking.service_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t('bookings.total')}</p>
          <p className="font-medium text-gradient-gold">
            {booking.currency} {booking.total_amount.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {t('bookings.date')}
          </p>
          <p className="font-medium">{format(parseISO(booking.booking_date), 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {t('bookings.time')}
          </p>
          <p className="font-medium">{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</p>
        </div>
      </div>

      {booking.notes && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">{t('bookings.notes')}:</p>
          <p className="text-sm">{booking.notes}</p>
        </div>
      )}

      {/* Payment status */}
      {hasPaidPayment(booking) && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">{t('bookings.paymentReceived')}</span>
        </div>
      )}

      <div className="flex gap-2">
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <>
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 bg-gradient-gold"
              onClick={() => handleMarkComplete(booking.id)}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t('bookings.complete')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => handleMarkNoShow(booking.id)}
            >
              {t('bookings.noShow')}
            </Button>
            {canCancelBooking(booking) ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelDialog({ open: true, booking })}
              >
                {t('bookings.cancel')}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="opacity-50 cursor-not-allowed"
                disabled
                title="Cannot cancel less than 1 hour before"
              >
                Cancel
              </Button>
            )}
          </>
        )}
        {/* View Details button for all bookings */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setDetailModal({ 
            open: true, 
            booking: {
              ...booking,
              platform_fee: 1.00,
            }, 
            isBarber: true 
          })}
        >
          <Eye className="w-4 h-4 mr-1" />
          Details
        </Button>
      </div>
    </motion.div>
  );

  // Customer Booking Card Component
  const CustomerBookingCard = ({ booking }: { booking: CustomerBooking }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">
            {booking.barber_profiles.shop_name}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {booking.barber_profiles.address}, {booking.barber_profiles.city}
          </p>
        </div>
        <Badge className={statusColors[booking.status]}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Service</p>
          <p className="font-medium">{booking.service_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-medium text-gradient-gold">
            {formatPrice(booking.total_amount, booking.currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Date
          </p>
          <p className="font-medium">{format(parseISO(booking.booking_date), 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Time
          </p>
          <p className="font-medium">{booking.start_time.slice(0, 5)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Payment Button for pending bookings */}
        {canPay(booking) && booking.service_id && (
          <PaymentButton
            bookingId={booking.id}
            serviceId={booking.service_id}
            barberId={booking.barber_id}
            serviceName={booking.service_name}
            servicePrice={Number(booking.service_price)}
            currency={currency}
            onError={(error, details) => handlePaymentError(error, details, booking.id)}
          />
        )}

        {/* Show paid status */}
        {hasPaidPayment(booking) && booking.status !== 'completed' && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">Payment Complete</span>
          </div>
        )}

        {/* Barber not set up for payments */}
        {booking.status === 'pending' && !booking.barber_profiles.stripe_onboarding_complete && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <CreditCard className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-500">Payment setup pending - contact barber</span>
          </div>
        )}

        <div className="flex gap-2">
          {booking.status === 'pending' && !hasPaidPayment(booking) && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleReschedule(booking)}
              >
                Reschedule
              </Button>
              {canCancelBooking(booking) ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setCancelDialog({ open: true, booking })}
                >
                  Cancel
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 opacity-50 cursor-not-allowed"
                  disabled
                  title="Cannot cancel less than 1 hour before appointment"
                >
                  Cancel
                </Button>
              )}
            </>
          )}
          
          {booking.status === 'completed' && !hasReview(booking) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setReviewDialog({
                open: true,
                bookingId: booking.id,
                barberId: booking.barber_id,
                shopName: booking.barber_profiles.shop_name,
              })}
            >
              <Star className="w-4 h-4 mr-2" />
              Write Review
            </Button>
          )}
          
          {booking.status === 'completed' && hasReview(booking) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 fill-accent text-accent" />
              Review submitted
            </div>
          )}

          {/* View Details Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setDetailModal({ 
              open: true, 
              booking: {
                ...booking,
                end_time: booking.start_time, // Customer bookings don't have end_time
                barber_id: booking.barber_id,
              }, 
              isBarber: false 
            })}
          >
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
        </div>
      </div>
    </motion.div>
  );

  if (authLoading || !user) {
    return null;
  }

  // Barber View
  if (isBarber) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
          <main className="pt-20 pb-16">
            <div className="container mx-auto px-4">
              <Breadcrumbs />
            
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-4xl font-bold">My Appointments</h1>
              <BarberBadge />
            </div>
            <p className="text-muted-foreground mb-8">Manage your customer appointments</p>

            <Tabs defaultValue="today" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="today">
                  Today ({todayBarberBookings.length})
                </TabsTrigger>
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingBarberBookings.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past ({pastBarberBookings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="today">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-48 rounded-xl bg-card animate-shimmer" />
                    ))}
                  </div>
                ) : todayBarberBookings.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl font-semibold mb-2">No appointments today</h3>
                    <p className="text-muted-foreground">
                      Enjoy your free time or check upcoming appointments.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {todayBarberBookings.map((booking) => (
                      <BarberBookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upcoming">
                {upcomingBarberBookings.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl font-semibold mb-2">No upcoming appointments</h3>
                    <p className="text-muted-foreground">
                      New bookings will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {upcomingBarberBookings.map((booking) => (
                      <BarberBookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past">
                {pastBarberBookings.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">No past appointments yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pastBarberBookings.map((booking) => (
                      <BarberBookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        </PullToRefresh>
{/* Cancel Booking Confirmation Dialog */}
        <AlertDialog open={cancelDialog.open} onOpenChange={(open) => !open && setCancelDialog({ open: false, booking: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Cancel Appointment
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this appointment on{' '}
                <span className="font-semibold">
                  {cancelDialog.booking && format(parseISO(cancelDialog.booking.booking_date), 'MMM d, yyyy')}
                </span>{' '}
                at <span className="font-semibold">{cancelDialog.booking?.start_time.slice(0, 5)}</span>?
                <br /><br />
                The customer will be notified of this cancellation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>Keep Appointment</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Booking Detail Modal */}
        {detailModal.booking && (
          <BookingDetailModal
            open={detailModal.open}
            onOpenChange={(open) => setDetailModal(prev => ({ ...prev, open }))}
            booking={detailModal.booking}
            isBarber={detailModal.isBarber}
          />
        )}
      </div>
    );
  }

  // Debug Panel Component
  const DebugPanel = () => (
    <AnimatePresence>
      {showDebugPanel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 z-50 w-96 max-h-80 bg-card border border-destructive/50 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 bg-destructive/10 border-b border-destructive/30">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-destructive" />
              <span className="font-semibold text-sm">Payment Debug Panel</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setDebugLogs([])}
                title="Clear logs"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowDebugPanel(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-64 p-3 space-y-2">
            {debugLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No payment errors logged yet.
              </p>
            ) : (
              debugLogs.map((log, idx) => (
                <div key={idx} className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-destructive font-medium">{log.error}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.bookingId && (
                    <p className="text-muted-foreground">Booking: {log.bookingId.slice(0, 8)}...</p>
                  )}
                  {log.details && (
                    <details className="cursor-pointer">
                      <summary className="text-muted-foreground hover:text-foreground">
                        View details
                      </summary>
                      <pre className="mt-1 p-2 bg-background rounded text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
                        {log.details}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Customer View
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <Breadcrumbs />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-4xl font-bold mb-2">My Bookings</h1>
                <p className="text-muted-foreground">Manage your appointments</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant={showDebugPanel ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="gap-2"
                >
                  <Bug className="w-4 h-4" />
                  Debug
                </Button>
              </div>
            </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingCustomerBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastCustomerBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-48 rounded-xl bg-card animate-shimmer" />
                  ))}
                </div>
              ) : upcomingCustomerBookings.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">No upcoming bookings</h3>
                  <p className="text-muted-foreground mb-6">
                    Time for a fresh cut? Book your next appointment now.
                  </p>
                  <Button asChild className="bg-gradient-gold">
                    <Link to="/barbers">Find a Barber</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingCustomerBookings.map((booking) => (
                    <CustomerBookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {pastCustomerBookings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No past bookings yet</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pastCustomerBookings.map((booking) => (
                    <CustomerBookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      </PullToRefresh>
<WriteReviewDialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog((prev) => ({ ...prev, open }))}
        bookingId={reviewDialog.bookingId}
        barberId={reviewDialog.barberId}
        shopName={reviewDialog.shopName}
        onReviewSubmitted={fetchCustomerBookings}
      />

      {/* Cancel Booking Confirmation Dialog */}
      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => !open && setCancelDialog({ open: false, booking: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancel Booking
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your booking at{' '}
              <span className="font-semibold">{(cancelDialog.booking as CustomerBooking)?.barber_profiles?.shop_name}</span> on{' '}
              <span className="font-semibold">
                {cancelDialog.booking && format(parseISO(cancelDialog.booking.booking_date), 'MMM d, yyyy')}
              </span>{' '}
              at <span className="font-semibold">{cancelDialog.booking?.start_time.slice(0, 5)}</span>?
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Booking Detail Modal */}
      {detailModal.booking && (
        <BookingDetailModal
          open={detailModal.open}
          onOpenChange={(open) => setDetailModal(prev => ({ ...prev, open }))}
          booking={detailModal.booking}
          isBarber={detailModal.isBarber}
        />
      )}

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
}
