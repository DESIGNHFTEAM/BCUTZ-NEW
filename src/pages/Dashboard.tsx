import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, Users, DollarSign, Plus, Settings,
  ChevronRight, TrendingUp, Scissors, Star, Clock3, AlertCircle,
  MessageSquare
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, startOfToday, endOfToday, parseISO } from 'date-fns';
import { AdminDashboardWidget } from '@/components/AdminDashboardWidget';
import { StripeConnectSetup } from '@/components/StripeConnectSetup';
import { useTranslation } from 'react-i18next';
import { PullToRefresh } from '@/components/PullToRefresh';

interface BarberProfile {
  id: string;
  shop_name: string;
  avg_rating: number;
  total_reviews: number;
  is_verified: boolean | null;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  service_name: string;
  service_price: number;
  status: string;
  profiles: {
    full_name: string | null;
  } | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  currency: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    totalBookings: 0,
    totalCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('barber'))) {
      navigate('/');
    }
  }, [user, authLoading, hasRole, navigate]);

  useEffect(() => {
    if (user && hasRole('barber')) {
      fetchDashboardData();
    }
  }, [user, hasRole]);

  const fetchDashboardData = async () => {
    // Fetch barber profile
    const { data: profileData } = await supabase
      .from('barber_profiles')
      .select('id, shop_name, avg_rating, total_reviews, is_verified')
      .eq('user_id', user?.id)
      .single();

    if (profileData) {
      setBarberProfile(profileData);

      // Fetch today's bookings
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          service_name,
          service_price,
          status,
          profiles:customer_id (
            full_name
          )
        `)
        .eq('barber_id', profileData.id)
        .eq('booking_date', today)
        .order('start_time');

      if (bookingsData) {
        setTodayBookings(bookingsData as unknown as Booking[]);
        setStats((prev) => ({
          ...prev,
          todayRevenue: bookingsData
            .filter((b) => b.status !== 'cancelled')
            .reduce((sum, b) => sum + Number(b.service_price), 0),
        }));
      }

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', profileData.id)
        .eq('is_active', true);

      if (servicesData) {
        setServices(servicesData);
      }

      // Fetch total stats
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', profileData.id);

      setStats((prev) => ({
        ...prev,
        totalBookings: totalBookings || 0,
      }));
    }

    setIsLoading(false);
  };

  if (authLoading || !user || !hasRole('barber')) {
    return null;
  }

  const handleRefresh = useCallback(async () => {
    await fetchDashboardData();
  }, [user, hasRole]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <Breadcrumbs />
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="font-display text-4xl font-bold mb-2">
                {t('dashboard.welcome')}{barberProfile ? `, ${barberProfile.shop_name}` : ''}
              </h1>
              <p className="text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button variant="outline" asChild>
                <Link to="/dashboard/profile">
                  <Settings className="w-4 h-4 mr-2" />
                  {t('dashboard.settings')}
                </Link>
              </Button>
              <Button className="bg-gradient-gold" asChild>
                <Link to="/dashboard/services">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dashboard.addService')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Pending Verification Banner */}
          {barberProfile && !barberProfile.is_verified && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <Clock3 className="h-5 w-5 text-amber-500" />
                <AlertTitle className="text-amber-500 font-semibold">
                  {t('dashboard.pendingVerification.title')}
                </AlertTitle>
                <AlertDescription className="text-amber-500/80">
                  {t('dashboard.pendingVerification.description')}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Admin Widget */}
          <AdminDashboardWidget />

          {/* Payment Setup */}
          <div className="mb-8">
            <StripeConnectSetup />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: t('dashboard.todaysRevenue'),
                value: `CHF ${stats.todayRevenue.toFixed(2)}`,
                icon: DollarSign,
                trend: '+12%',
                link: '/dashboard/earnings',
              },
              {
                label: t('dashboard.todaysBookings'),
                value: todayBookings.length.toString(),
                icon: Calendar,
                link: '/dashboard/calendar',
              },
              {
                label: t('dashboard.totalBookings'),
                value: stats.totalBookings.toString(),
                icon: TrendingUp,
                link: '/dashboard/analytics',
              },
              {
                label: t('dashboard.rating'),
                value: barberProfile ? barberProfile.avg_rating.toFixed(1) : '0.0',
                icon: Users,
                suffix: `(${barberProfile?.total_reviews || 0} ${t('dashboard.reviews')})`,
                link: '/dashboard/reviews',
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl border border-border p-5 cursor-pointer hover:border-primary/50 hover:bg-card/80 transition-all"
                onClick={() => stat.link && navigate(stat.link)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {stat.trend && (
                      <Badge className="bg-green-500/20 text-green-500">{stat.trend}</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                  {stat.suffix && <span className="ml-1">{stat.suffix}</span>}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold">{t('dashboard.todaysSchedule')}</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/calendar">
                    {t('dashboard.viewAll')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              {todayBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('dashboard.noBookingsToday')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="text-center min-w-[60px]">
                        <p className="font-bold">{booking.start_time.slice(0, 5)}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{booking.profiles?.full_name || t('bookings.customer')}</p>
                        <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                      </div>
                      <Badge className={
                        booking.status === 'confirmed' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-yellow-500/20 text-yellow-500'
                      }>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold">{t('dashboard.yourServices')}</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/services">
                    {t('dashboard.manage')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-8">
                  <Scissors className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">{t('dashboard.noServices')}</p>
                  <Button size="sm" asChild>
                    <Link to="/dashboard/services">{t('dashboard.addFirstService')}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.slice(0, 5).map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.duration_minutes} min
                        </p>
                      </div>
                      <p className="font-display font-bold text-gradient-gold">
                        {service.currency} {service.price}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {[
              { label: t('dashboard.calendar'), icon: Calendar, href: '/dashboard/calendar' },
              { label: t('dashboard.services'), icon: Scissors, href: '/dashboard/services' },
              { label: t('dashboard.messages', 'Messages'), icon: MessageSquare, href: '/dashboard/messages' },
              { label: t('dashboard.customers'), icon: Users, href: '/dashboard/customers' },
              { label: t('dashboard.reviews'), icon: Star, href: '/dashboard/reviews' },
              { label: t('dashboard.earnings'), icon: DollarSign, href: '/dashboard/earnings' },
            ].map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className="flex flex-col items-center gap-3 p-6 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
                  <action.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-medium">{action.label}</span>
              </Link>
            ))}
          </motion.div>
        </div>
      </main>
      </PullToRefresh>
    </div>
  );
}
