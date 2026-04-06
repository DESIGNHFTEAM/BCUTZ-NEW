import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, Calendar, CreditCard, 
  ChevronDown, Download, ArrowUpRight, ArrowDownRight,
  CheckCircle2, AlertCircle, ExternalLink, Loader2, Wallet,
  FileSpreadsheet, FileText
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { exportToCSV, exportToPDF, earningsExportColumns } from '@/lib/exportUtils';
import { useTranslation } from 'react-i18next';

interface EarningsData {
  totalEarnings: number;
  platformFees: number;
  netEarnings: number;
  bookingsCount: number;
  averageBookingValue: number;
}

interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  processed_at: string | null;
}

interface Transaction {
  id: string;
  booking_date: string;
  service_name: string;
  service_price: number;
  platform_fee: number;
  status: string;
  customer_name: string | null;
}

interface ConnectStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  canReceivePayments: boolean;
}

export default function DashboardEarnings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { t } = useTranslation();
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    platformFees: 0,
    netEarnings: 0,
    bookingsCount: 0,
    averageBookingValue: 0,
  });
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAmount, setPendingAmount] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('barber'))) {
      navigate('/');
    }
  }, [user, authLoading, hasRole, navigate]);

  useEffect(() => {
    if (user && hasRole('barber')) {
      fetchBarberProfile();
      checkConnectStatus();
    }
  }, [user, hasRole]);

  useEffect(() => {
    if (barberProfileId) {
      fetchEarningsData();
      fetchPendingAmount();
    }
  }, [barberProfileId, period]);

  const checkConnectStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (!error && data) {
        setConnectStatus(data);
      }
    } catch (error) {
      console.error('Error checking connect status:', error);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleSetupConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info('Complete your payment setup in the new tab');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start payment setup');
    }
  };

  const fetchPendingAmount = async () => {
    if (!barberProfileId) return;
    
    // Get confirmed bookings that haven't been paid out yet
    const { data } = await supabase
      .from('bookings')
      .select('service_price')
      .eq('barber_id', barberProfileId)
      .eq('status', 'confirmed');
    
    if (data) {
      const pending = data.reduce((sum, b) => sum + Number(b.service_price), 0);
      setPendingAmount(pending);
    }
  };

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

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchEarningsData = async () => {
    if (!barberProfileId) return;

    setIsLoading(true);
    const { start, end } = getDateRange();

    // Fetch completed bookings
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        service_name,
        service_price,
        platform_fee,
        status,
        customer_id
      `)
      .eq('barber_id', barberProfileId)
      .gte('booking_date', format(start, 'yyyy-MM-dd'))
      .lte('booking_date', format(end, 'yyyy-MM-dd'))
      .in('status', ['completed', 'confirmed'])
      .order('booking_date', { ascending: false });

    if (bookingsData) {
      const total = bookingsData.reduce((sum, b) => sum + Number(b.service_price), 0);
      const fees = bookingsData.reduce((sum, b) => sum + Number(b.platform_fee), 0);
      
      setEarnings({
        totalEarnings: total,
        platformFees: fees,
        netEarnings: total - fees,
        bookingsCount: bookingsData.length,
        averageBookingValue: bookingsData.length > 0 ? total / bookingsData.length : 0,
      });

      setTransactions(
        bookingsData.map((b) => ({
          id: b.id,
          booking_date: b.booking_date,
          service_name: b.service_name,
          service_price: Number(b.service_price),
          platform_fee: Number(b.platform_fee),
          status: b.status,
          customer_name: null,
        }))
      );
    }

    // Fetch payouts
    const { data: payoutsData } = await supabase
      .from('payouts')
      .select('*')
      .eq('barber_id', barberProfileId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (payoutsData) {
      setPayouts(payoutsData);
    }

    setIsLoading(false);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return t('dashboardEarnings.thisWeek');
      case 'month': return t('dashboardEarnings.thisMonth');
      case 'year': return t('dashboardEarnings.thisYear');
      default: return t('dashboardEarnings.thisMonth');
    }
  };

  const prepareExportData = () => {
    return transactions.map(tx => ({
      date: tx.booking_date,
      description: tx.service_name,
      service_amount: tx.service_price,
      platform_fee: tx.platform_fee,
      net_amount: tx.service_price - tx.platform_fee,
    }));
  };

  const handleExportCSV = () => {
    const data = prepareExportData();
    if (data.length === 0) {
      toast.error('No earnings data to export');
      return;
    }
    exportToCSV(data, earningsExportColumns, `earnings_${period}`);
    toast.success('Earnings exported to CSV');
  };

  const handleExportPDF = () => {
    const data = prepareExportData();
    if (data.length === 0) {
      toast.error('No earnings data to export');
      return;
    }
    exportToPDF(data, earningsExportColumns, `Earnings Report - ${getPeriodLabel()}`, `earnings_${period}`);
    toast.success('Earnings report opened for printing');
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-500',
    processing: 'bg-blue-500/20 text-blue-500',
    completed: 'bg-green-500/20 text-green-500',
    failed: 'bg-destructive/20 text-destructive',
  };

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
              <h1 className="font-display text-4xl font-bold mb-2">{t('dashboardEarnings.title')}</h1>
              <p className="text-muted-foreground">{t('dashboardEarnings.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('dashboardEarnings.thisWeek')}</SelectItem>
                  <SelectItem value="month">{t('dashboardEarnings.thisMonth')}</SelectItem>
                  <SelectItem value="year">{t('dashboardEarnings.thisYear')}</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    {t('dashboardEarnings.export')}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stripe Connect Status Banner */}
          {!connectLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              {!connectStatus?.hasAccount ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <Wallet className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{t('dashboardEarnings.setupPayments.title')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('dashboardEarnings.setupPayments.description')}
                      </p>
                      <Button onClick={handleSetupConnect}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('dashboardEarnings.setupPayments.button')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !connectStatus?.isOnboarded ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{t('dashboardEarnings.setupPayments.completeTitle')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('dashboardEarnings.setupPayments.completeDesc')}
                      </p>
                      <Button onClick={handleSetupConnect}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t('dashboardEarnings.setupPayments.completeButton')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-green-500">{t('dashboardEarnings.setupPayments.activeTitle')}</span>
                    <span className="text-muted-foreground">– {t('dashboardEarnings.setupPayments.activeDesc')}</span>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={handleSetupConnect}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('dashboardEarnings.setupPayments.manageButton')}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              {
                label: t('dashboardEarnings.totalEarnings'),
                value: `CHF ${earnings.totalEarnings.toFixed(2)}`,
                icon: DollarSign,
                change: '+12.5%',
                positive: true,
              },
              {
                label: t('dashboardEarnings.netEarnings'),
                value: `CHF ${earnings.netEarnings.toFixed(2)}`,
                icon: TrendingUp,
                sublabel: t('dashboardEarnings.afterFees', { amount: earnings.platformFees.toFixed(2) }),
              },
              {
                label: t('dashboardEarnings.pendingPayout'),
                value: `CHF ${pendingAmount.toFixed(2)}`,
                icon: Wallet,
                sublabel: t('dashboardEarnings.fromConfirmed'),
              },
              {
                label: t('dashboardEarnings.completedBookings'),
                value: earnings.bookingsCount.toString(),
                icon: Calendar,
              },
              {
                label: t('dashboardEarnings.avgBookingValue'),
                value: `CHF ${earnings.averageBookingValue.toFixed(2)}`,
                icon: CreditCard,
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl border border-border p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  {stat.change && (
                    <div className={`flex items-center gap-1 text-sm ${
                      stat.positive ? 'text-green-500' : 'text-destructive'
                    }`}>
                      {stat.positive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {stat.change}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">
                  {stat.sublabel || stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-card rounded-xl border border-border p-6"
            >
              <h2 className="font-display text-xl font-semibold mb-4">{t('dashboardEarnings.recentTransactions')}</h2>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-shimmer rounded-lg" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('dashboardEarnings.noTransactions')}
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{tx.service_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.customer_name || t('dashboardEarnings.customer')} · {format(parseISO(tx.booking_date), 'MMM d')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-gradient-gold">
                          +CHF {tx.service_price.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          -CHF {tx.platform_fee.toFixed(2)} {t('dashboardEarnings.fee')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Payouts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h2 className="font-display text-xl font-semibold mb-4">{t('dashboardEarnings.payouts')}</h2>
              
              {payouts.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {t('dashboardEarnings.payoutsWeekly')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold">
                          {payout.currency} {payout.amount.toFixed(2)}
                        </span>
                        <Badge className={statusColors[payout.status]}>
                          {payout.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(payout.period_start), 'MMM d')} - {format(parseISO(payout.period_end), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
