import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { PageTransition } from '@/components/animations/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarButtons } from '@/components/CalendarButtons';
import { EventSchema } from '@/components/seo/EventSchema';
import { CheckCircle2, Clock, MapPin, Calendar, Scissors, User, CreditCard, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BookingDetails {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_price: number;
  platform_fee: number;
  total_amount: number;
  currency: string;
  status: string;
  barber: {
    id: string;
    shop_name: string;
    city: string;
    address: string;
    phone: string | null;
    profile_image_url: string | null;
  };
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdated, setStatusUpdated] = useState(false);

  const bookingId = searchParams.get('booking');

  useEffect(() => {
    if (!bookingId) {
      navigate('/bookings');
      return;
    }

    fetchBookingDetails();

    // Poll for booking status updates every 5 seconds
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();
      if (data?.status === 'confirmed' && !statusUpdated) {
        setStatusUpdated(true);
        setBooking((prev) =>
          prev ? { ...prev, status: 'confirmed' } : prev
        );
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [bookingId, navigate]);

  const fetchBookingDetails = async () => {
    if (!bookingId) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          service_name,
          service_price,
          platform_fee,
          total_amount,
          currency,
          status,
          barber_id
        `)
        .eq('id', bookingId)
        .single();

      if (error || !data) {
        console.error('Error fetching booking:', error);
        navigate('/bookings');
        return;
      }

      // Fetch barber public info from the secure view (excludes sensitive data like full address)
      const { data: barberPublic, error: barberPublicError } = await supabase
        .from('barber_profiles_public')
        .select('id, shop_name, city, profile_image_url')
        .eq('id', data.barber_id)
        .single();

      if (barberPublicError || !barberPublic) {
        console.error('Error fetching barber public info:', barberPublicError);
        navigate('/bookings');
        return;
      }

      // Fetch contact info using the secure RPC function (includes full address for confirmed bookings)
      const { data: contactData, error: contactError } = await supabase
        .rpc('get_barber_contact_for_booking', { p_barber_id: data.barber_id });

      // Contact info includes full address for customers with bookings
      const phone = contactData && contactData.length > 0 ? contactData[0].phone : null;
      const address = contactData && contactData.length > 0 ? contactData[0].address : '';

      setBooking({
        ...data,
        barber: {
          ...barberPublic,
          address,
          phone,
        },
      });
    } catch (err) {
      console.error('Error:', err);
      navigate('/bookings');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
<main className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading your booking details...</p>
            </div>
          </main>
</div>
      </PageTransition>
    );
  }

  if (!booking) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
<main className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Booking not found</p>
              <Button asChild>
                <Link to="/bookings">View All Bookings</Link>
              </Button>
            </div>
          </main>
</div>
      </PageTransition>
    );
  }

  const isConfirmed = booking.status === 'confirmed';
  const bookingDate = parseISO(booking.booking_date);

  return (
    <PageTransition>
      <EventSchema
        eventName={`${booking.service_name} at ${booking.barber.shop_name}`}
        description={`Haircut appointment at ${booking.barber.shop_name}. Booking reference: ${booking.id}`}
        startDate={booking.booking_date}
        startTime={booking.start_time}
        endTime={booking.end_time}
        locationName={booking.barber.shop_name}
        locationAddress={booking.barber.address}
        locationCity={booking.barber.city}
        locationCountry="Switzerland"
        organizerName={booking.barber.shop_name}
        organizerUrl={`https://bcutz.lovable.app/barber/${booking.barber.id}`}
        eventUrl={`https://bcutz.lovable.app/bookings`}
        eventStatus={booking.status === 'cancelled' ? 'EventCancelled' : 'EventScheduled'}
      />
      <div className="min-h-screen flex flex-col bg-background">
<main className="flex-1 py-12 px-4">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Success Header */}
            <div className="text-center space-y-4">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isConfirmed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                {isConfirmed ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400 animate-pulse" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-wider">
                  {isConfirmed ? 'Thank You!' : 'Payment Received'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isConfirmed
                    ? 'Your booking has been confirmed. See you soon!'
                    : 'Your payment was successful. Confirming your booking...'}
                </p>
              </div>

              {!isConfirmed && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Waiting for confirmation...</span>
                </div>
              )}

              {statusUpdated && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-300 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Booking confirmed!</span>
                </div>
              )}
            </div>

            {/* Booking Details Card */}
            <Card className="border-2">
              <CardContent className="p-6 space-y-6">
                {/* Barber Info */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {booking.barber.profile_image_url ? (
                      <img
                        src={booking.barber.profile_image_url}
                        alt={booking.barber.shop_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Scissors className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{booking.barber.shop_name}</h2>
                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{booking.barber.address}, {booking.barber.city}</span>
                    </div>
                    {booking.barber.phone && (
                      <p className="text-sm text-muted-foreground mt-1">
                        📞 {booking.barber.phone}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Appointment Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Date</span>
                    </div>
                    <p className="font-medium">
                      {format(bookingDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Time</span>
                    </div>
                    <p className="font-medium">
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Service Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Scissors className="h-4 w-4" />
                    <span>Service</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{booking.service_name}</span>
                    <span>{formatCurrency(booking.service_price, booking.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Platform fee</span>
                    <span>{formatCurrency(booking.platform_fee, booking.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span>Total Paid</span>
                    <span className="text-primary">{formatCurrency(booking.total_amount, booking.currency)}</span>
                  </div>
                </div>

                <Separator />

                {/* Payment Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Paid
                  </span>
                </div>

                {/* Booking Reference */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Booking Reference</p>
                  <p className="font-mono text-sm">{booking.id}</p>
                </div>
                {/* Calendar Integration */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Add to your calendar</p>
                  <CalendarButtons
                    title={`${booking.service_name} at ${booking.barber.shop_name}`}
                    description={`Haircut appointment at ${booking.barber.shop_name}. Booking reference: ${booking.id}`}
                    location={`${booking.barber.address}, ${booking.barber.city}`}
                    startDate={booking.booking_date}
                    startTime={booking.start_time}
                    endTime={booking.end_time}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link to="/bookings">View All Bookings</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to={`/barber/${booking.barber.id}`}>Book Again</Link>
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>A confirmation email has been sent to your email address.</p>
              <p>
                Questions? <Link to="/contact" className="underline hover:text-foreground">Contact Support</Link>
              </p>
            </div>
          </div>
        </main>
</div>
    </PageTransition>
  );
}
