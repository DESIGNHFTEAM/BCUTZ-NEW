import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Users, Calendar, 
  ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, subDays, startOfMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface BookingTrend {
  date: string;
  bookings: number;
  revenue: number;
}

interface CustomerMetric {
  name: string;
  value: number;
  color: string;
}

export default function DashboardAnalytics() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { t } = useTranslation();
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<{ name: string; count: number }[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetric[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    avgBookingValue: 0,
    repeatCustomerRate: 0,
    bookingGrowth: 0,
    revenueGrowth: 0,
  });

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('barber'))) {
      navigate('/');
    }
  }, [user, authLoading, hasRole, navigate]);

  useEffect(() => {
    if (user && hasRole('barber')) {
      fetchBarberProfile();
    }
  }, [user, hasRole]);

  useEffect(() => {
    if (barberProfileId) {
      fetchAnalytics();
    }
  }, [barberProfileId, period]);

  const fetchBarberProfile = async () => {
    const { data: profile } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (profile) {
      setBarberProfileId(profile.id);
    }
  };

  const fetchAnalytics = async () => {
    if (!barberProfileId) return;
    setIsLoading(true);

    const days = parseInt(period);
    const startDate = subDays(new Date(), days);
    const prevStartDate = subDays(startDate, days);

    // Fetch current period bookings
    const { data: currentBookings } = await supabase
      .from('bookings')
      .select('id, booking_date, service_name, service_price, customer_id, status')
      .eq('barber_id', barberProfileId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .in('status', ['completed', 'confirmed']);

    // Fetch previous period for comparison
    const { data: prevBookings } = await supabase
      .from('bookings')
      .select('id, service_price')
      .eq('barber_id', barberProfileId)
      .gte('booking_date', format(prevStartDate, 'yyyy-MM-dd'))
      .lt('booking_date', format(startDate, 'yyyy-MM-dd'))
      .in('status', ['completed', 'confirmed']);

    if (currentBookings) {
      // Calculate trends by day
      const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
      const trends = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayBookings = currentBookings.filter(b => b.booking_date === dateStr);
        return {
          date: format(date, 'MMM d'),
          bookings: dayBookings.length,
          revenue: dayBookings.reduce((sum, b) => sum + Number(b.service_price), 0),
        };
      });
      setBookingTrends(trends);

      // Calculate service breakdown
      const serviceCount: Record<string, number> = {};
      currentBookings.forEach(b => {
        serviceCount[b.service_name] = (serviceCount[b.service_name] || 0) + 1;
      });
      setServiceBreakdown(
        Object.entries(serviceCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      // Calculate customer metrics
      const uniqueCustomers = new Set(currentBookings.map(b => b.customer_id));
      const customerBookingCount: Record<string, number> = {};
      currentBookings.forEach(b => {
        if (b.customer_id) {
          customerBookingCount[b.customer_id] = (customerBookingCount[b.customer_id] || 0) + 1;
        }
      });
      const repeatCustomers = Object.values(customerBookingCount).filter(c => c > 1).length;
      const newCustomers = uniqueCustomers.size - repeatCustomers;

      setCustomerMetrics([
        { name: t('dashboardAnalytics.newCustomers'), value: newCustomers, color: 'hsl(var(--primary))' },
        { name: t('dashboardAnalytics.returning'), value: repeatCustomers, color: 'hsl(var(--accent))' },
      ]);

      // Calculate stats
      const totalRevenue = currentBookings.reduce((sum, b) => sum + Number(b.service_price), 0);
      const prevRevenue = prevBookings?.reduce((sum, b) => sum + Number(b.service_price), 0) || 0;
      const prevBookingCount = prevBookings?.length || 0;

      setStats({
        totalBookings: currentBookings.length,
        totalRevenue,
        avgBookingValue: currentBookings.length > 0 ? totalRevenue / currentBookings.length : 0,
        repeatCustomerRate: uniqueCustomers.size > 0 ? (repeatCustomers / uniqueCustomers.size) * 100 : 0,
        bookingGrowth: prevBookingCount > 0 
          ? ((currentBookings.length - prevBookingCount) / prevBookingCount) * 100 
          : 0,
        revenueGrowth: prevRevenue > 0 
          ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
          : 0,
      });
    }

    setIsLoading(false);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(45, 93%, 47%)', 'hsl(var(--muted))'];

  if (authLoading || !user || !hasRole('barber')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
<main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <p className="text-xs tracking-[0.3em] text-primary mb-2">{t('dashboardAnalytics.tagline')}</p>
              <h1 className="font-display text-4xl font-bold">{t('dashboardAnalytics.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('dashboardAnalytics.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{t('dashboardAnalytics.last7Days')}</SelectItem>
                  <SelectItem value="30">{t('dashboardAnalytics.last30Days')}</SelectItem>
                  <SelectItem value="90">{t('dashboardAnalytics.last90Days')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchAnalytics}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: t('dashboardAnalytics.totalBookings'),
                value: stats.totalBookings.toString(),
                icon: Calendar,
                change: stats.bookingGrowth,
              },
              {
                label: t('dashboardAnalytics.totalRevenue'),
                value: `CHF ${stats.totalRevenue.toFixed(0)}`,
                icon: TrendingUp,
                change: stats.revenueGrowth,
              },
              {
                label: t('dashboardAnalytics.avgBookingValue'),
                value: `CHF ${stats.avgBookingValue.toFixed(0)}`,
                icon: BarChart3,
              },
              {
                label: t('dashboardAnalytics.repeatRate'),
                value: `${stats.repeatCustomerRate.toFixed(0)}%`,
                icon: Users,
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border p-5 rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className="w-5 h-5 text-primary" />
                  {stat.change !== undefined && (
                    <div className={`flex items-center gap-1 text-sm ${
                      stat.change >= 0 ? 'text-green-500' : 'text-destructive'
                    }`}>
                      {stat.change >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {Math.abs(stat.change).toFixed(0)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Booking Trends Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border p-6 rounded-xl"
            >
              <h2 className="font-display text-xl font-semibold mb-4">{t('dashboardAnalytics.bookingTrends')}</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bookingTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border p-6 rounded-xl"
            >
              <h2 className="font-display text-xl font-semibold mb-4">{t('dashboardAnalytics.revenue')}</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`CHF ${value}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Service Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-card border border-border p-6 rounded-xl"
            >
              <h2 className="font-display text-xl font-semibold mb-4">{t('dashboardAnalytics.topServices')}</h2>
              {serviceBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('dashboardAnalytics.noDataAvailable')}</p>
              ) : (
                <div className="space-y-4">
                  {serviceBreakdown.map((service, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-muted-foreground">{service.count} {t('dashboardAnalytics.bookings')}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ 
                              width: `${(service.count / (serviceBreakdown[0]?.count || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Customer Retention */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card border border-border p-6 rounded-xl"
            >
              <h2 className="font-display text-xl font-semibold mb-4">{t('dashboardAnalytics.customerRetention')}</h2>
              {customerMetrics.every(m => m.value === 0) ? (
                <p className="text-muted-foreground text-center py-8">{t('dashboardAnalytics.noDataAvailable')}</p>
              ) : (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={customerMetrics}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {customerMetrics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    {customerMetrics.map((metric, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[i] }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {metric.name}: {metric.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
