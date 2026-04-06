import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Search, Download, Mail, Phone, Calendar, DollarSign, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportToCSV, exportToPDF, clientExportColumns } from '@/lib/exportUtils';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  total_bookings: number;
  total_spent: number;
  last_visit: string | null;
  avg_rating: number | null;
}

export default function DashboardCustomers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('barber'))) {
      navigate('/');
    }
  }, [user, hasRole, authLoading, navigate]);

  useEffect(() => {
    if (user && hasRole('barber')) {
      fetchBarberProfile();
    }
  }, [user, hasRole]);

  const fetchBarberProfile = async () => {
    const { data } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setBarberProfileId(data.id);
      fetchCustomers(data.id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async (barberId: string) => {
    // Get all completed bookings for this barber with customer info
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        customer_id,
        total_amount,
        booking_date,
        status
      `)
      .eq('barber_id', barberId)
      .not('customer_id', 'is', null);

    if (error) {
      console.error('Error fetching customers:', error);
      setIsLoading(false);
      return;
    }

    // Get unique customer IDs
    const customerIds = [...new Set(bookings?.map(b => b.customer_id).filter(Boolean))];

    if (customerIds.length === 0) {
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    // Fetch customer profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url')
      .in('id', customerIds);

    // Fetch reviews for avg rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('customer_id, rating')
      .eq('barber_id', barberId);

    // Aggregate customer data
    const customerMap = new Map<string, Customer>();

    profiles?.forEach(profile => {
      const customerBookings = bookings?.filter(b => b.customer_id === profile.id) || [];
      const customerReviews = reviews?.filter(r => r.customer_id === profile.id) || [];
      
      customerMap.set(profile.id, {
        id: profile.id,
        full_name: profile.full_name || 'Unknown',
        email: profile.email || '',
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        total_bookings: customerBookings.length,
        total_spent: customerBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        last_visit: customerBookings.length > 0 
          ? customerBookings.sort((a, b) => b.booking_date.localeCompare(a.booking_date))[0].booking_date 
          : null,
        avg_rating: customerReviews.length > 0 
          ? customerReviews.reduce((sum, r) => sum + r.rating, 0) / customerReviews.length 
          : null,
      });
    });

    setCustomers(Array.from(customerMap.values()).sort((a, b) => b.total_bookings - a.total_bookings));
    setIsLoading(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const handleExportCSV = () => {
    exportToCSV(filteredCustomers, clientExportColumns, 'customers');
    toast.success('Customers exported to CSV');
  };

  const handleExportPDF = () => {
    exportToPDF(filteredCustomers, clientExportColumns, 'Customer List', 'customers');
    toast.success('Generating PDF...');
  };

  if (authLoading || !user || !hasRole('barber')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t('dashboardCustomers.title')}</h1>
              <p className="text-muted-foreground">{t('dashboardCustomers.subtitle')}</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                {t('dashboardCustomers.exportCSV')}
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                {t('dashboardCustomers.exportPDF')}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customers.length}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboardCustomers.totalClients')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      CHF {customers.reduce((sum, c) => sum + c.total_spent, 0).toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('dashboardCustomers.totalRevenue')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {customers.reduce((sum, c) => sum + c.total_bookings, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('dashboardCustomers.totalBookings')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {customers.filter(c => c.avg_rating).length > 0 
                        ? (customers.filter(c => c.avg_rating).reduce((sum, c) => sum + (c.avg_rating || 0), 0) / customers.filter(c => c.avg_rating).length).toFixed(1)
                        : '-'}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('dashboardCustomers.avgRating')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('dashboardCustomers.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Customer List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-card animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">{t('dashboardCustomers.noCustomersYet')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboardCustomers.noCustomersDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-display text-xl">
                          {customer.avatar_url ? (
                            <img src={customer.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            customer.full_name[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{customer.full_name}</h3>
                            {customer.avg_rating && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {customer.avg_rating.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {customer.email}
                              </span>
                            )}
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right hidden md:block">
                          <p className="font-semibold">CHF {customer.total_spent.toFixed(0)}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.total_bookings} {customer.total_bookings !== 1 ? t('dashboardCustomers.bookings') : t('dashboardCustomers.booking')}
                          </p>
                        </div>
                        
                        <div className="text-right hidden lg:block">
                          <p className="text-sm text-muted-foreground">{t('dashboardCustomers.lastVisit')}</p>
                          <p className="text-sm font-medium">
                            {customer.last_visit 
                              ? format(new Date(customer.last_visit), 'MMM d, yyyy')
                              : t('dashboardCustomers.never')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
</div>
  );
}
