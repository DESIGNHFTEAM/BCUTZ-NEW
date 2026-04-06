import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon,
  Check, X, AlertCircle, List, Grid3X3, Plus, Ban, Phone, Mail,
  Filter, Search, MoreVertical, Trash2
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, addDays, startOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isBefore, startOfDay } from 'date-fns';
import { PullToRefresh } from '@/components/PullToRefresh';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_price: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

interface BlockedTime {
  id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-500 border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  no_show: 'bg-muted text-muted-foreground border-muted',
};

const getStatusLabel = (status: string, t: (key: string) => string) => {
  const labels: Record<string, string> = {
    pending: t('dashboardCalendar.pending'),
    confirmed: t('dashboardCalendar.confirmed'),
    completed: t('dashboardCalendar.completed'),
    cancelled: t('dashboardCalendar.cancelled'),
    no_show: t('dashboardCalendar.noShow'),
  };
  return labels[status] || status;
};

export default function DashboardCalendar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { toast } = useToast();
  
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('week');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Block time form state
  const [blockDate, setBlockDate] = useState<Date | undefined>(new Date());
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('17:00');
  const [blockReason, setBlockReason] = useState('');

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
      fetchBookingsForWeek();
      fetchAllBookings();
      fetchBlockedTimes();
    }
  }, [barberProfileId, weekStart, currentMonth]);

  const fetchBarberProfile = async () => {
    const { data: profile } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (profile) {
      setBarberProfileId(profile.id);
    }
  };

  const fetchBookingsForWeek = async () => {
    if (!barberProfileId) return;

    setIsLoading(true);
    const weekEnd = addDays(weekStart, 6);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        service_name,
        service_price,
        currency,
        status,
        notes,
        cancellation_reason,
        created_at,
        profiles:customer_id (
          full_name,
          phone,
          email
        )
      `)
      .eq('barber_id', barberProfileId)
      .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
      .order('booking_date')
      .order('start_time');

    if (!error && data) {
      setBookings(data as unknown as Booking[]);
    }
    setIsLoading(false);
  };

  const fetchAllBookings = async () => {
    if (!barberProfileId) return;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        service_name,
        service_price,
        currency,
        status,
        notes,
        cancellation_reason,
        created_at,
        profiles:customer_id (
          full_name,
          phone,
          email
        )
      `)
      .eq('barber_id', barberProfileId)
      .gte('booking_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('booking_date', format(monthEnd, 'yyyy-MM-dd'))
      .order('booking_date', { ascending: false })
      .order('start_time');

    if (data) {
      setAllBookings(data as unknown as Booking[]);
    }
  };

  const fetchBlockedTimes = async () => {
    if (!barberProfileId) return;

    const { data } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('barber_id', barberProfileId)
      .gte('blocked_date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
      .lte('blocked_date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'));

    if (data) {
      setBlockedTimes(data);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: Booking['status'], reason?: string) => {
    const updateData: Record<string, unknown> = { status };
    if (status === 'cancelled' && reason) {
      updateData.cancellation_reason = reason;
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (error) {
      toast({
        title: t('common.error') || 'Error',
        description: t('dashboardCalendar.updateFailed') || 'Failed to update booking status',
        variant: 'destructive',
      });
    } else {
      toast({ title: `${t('dashboardCalendar.booking')} ${getStatusLabel(status, t).toLowerCase()}` });
      fetchBookingsForWeek();
      fetchAllBookings();
      setIsDialogOpen(false);
    }
  };

  const blockTime = async () => {
    if (!barberProfileId || !blockDate) return;

    const { error } = await supabase.from('blocked_times').insert({
      barber_id: barberProfileId,
      blocked_date: format(blockDate, 'yyyy-MM-dd'),
      start_time: blockStartTime,
      end_time: blockEndTime,
      reason: blockReason || null,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to block time',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Time blocked successfully' });
      fetchBlockedTimes();
      setIsBlockDialogOpen(false);
      setBlockReason('');
    }
  };

  const deleteBlockedTime = async (id: string) => {
    const { error } = await supabase.from('blocked_times').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove blocked time',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Blocked time removed' });
      fetchBlockedTimes();
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((b) => isSameDay(parseISO(b.booking_date), date));
  };

  const getMonthBookingsForDate = (date: Date) => {
    return allBookings.filter((b) => isSameDay(parseISO(b.booking_date), date));
  };

  const getBlockedTimesForDate = (date: Date) => {
    return blockedTimes.filter((bt) => isSameDay(parseISO(bt.blocked_date), date));
  };

  const filteredBookings = allBookings.filter((booking) => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      booking.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDialogOpen(true);
  };

  if (authLoading || !user || !hasRole('barber')) {
    return null;
  }

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchBookingsForWeek(), fetchAllBookings(), fetchBlockedTimes()]);
  }, [barberProfileId]);

  return (
    <div className="min-h-screen bg-background">
<PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <Breadcrumbs />
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="font-display text-4xl font-bold mb-2">{t('dashboardCalendar.title')}</h1>
              <p className="text-muted-foreground">{t('dashboardCalendar.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <Button variant="outline" onClick={() => setIsBlockDialogOpen(true)}>
                <Ban className="w-4 h-4 mr-2" />
                {t('dashboardCalendar.blockTime')}
              </Button>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-[300px]">
                <TabsTrigger value="week" className="gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  {t('dashboardCalendar.week')}
                </TabsTrigger>
                <TabsTrigger value="month" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {t('dashboardCalendar.month')}
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="w-4 h-4" />
                  {t('dashboardCalendar.list')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {viewMode === 'week' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-4 py-2 bg-card rounded-lg border border-border min-w-[200px] text-center">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                >
                  {t('dashboardCalendar.today')}
                </Button>
              </div>
            )}

            {viewMode === 'month' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-4 py-2 bg-card rounded-lg border border-border min-w-[180px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {viewMode === 'list' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('dashboardCalendar.searchBookings')}
                    className="pl-9 w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t('dashboardCalendar.allStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('dashboardCalendar.allStatus')}</SelectItem>
                    <SelectItem value="pending">{t('dashboardCalendar.pending')}</SelectItem>
                    <SelectItem value="confirmed">{t('dashboardCalendar.confirmed')}</SelectItem>
                    <SelectItem value="completed">{t('dashboardCalendar.completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('dashboardCalendar.cancelled')}</SelectItem>
                    <SelectItem value="no_show">{t('dashboardCalendar.noShow')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Week View */}
          <AnimatePresence mode="wait">
            {viewMode === 'week' && (
              <motion.div
                key="week"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Header */}
                <div className="grid grid-cols-7 border-b border-border">
                  {weekDays.map((day, index) => (
                    <div
                      key={index}
                      className={`p-4 text-center border-r last:border-r-0 border-border ${
                        isToday(day) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <p className="text-sm text-muted-foreground">{format(day, 'EEE')}</p>
                      <p className="font-display font-bold text-xl">{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="grid grid-cols-7 min-h-[500px]">
                  {weekDays.map((day, dayIndex) => {
                    const dayBookings = getBookingsForDate(day);
                    const dayBlockedTimes = getBlockedTimesForDate(day);
                    const isPast = isBefore(day, startOfDay(new Date()));
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`p-2 border-r last:border-r-0 border-border min-h-[500px] ${
                          isToday(day) ? 'bg-primary/5' : ''
                        } ${isPast ? 'opacity-60' : ''}`}
                      >
                        {/* Blocked times */}
                        {dayBlockedTimes.map((bt) => (
                          <div
                            key={bt.id}
                            className="w-full p-2 mb-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-destructive">
                                <Ban className="w-3 h-3" />
                                <span>{t('dashboardCalendar.blocked')}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => deleteBlockedTime(bt.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {bt.start_time.slice(0, 5)} - {bt.end_time.slice(0, 5)}
                            </p>
                            {bt.reason && (
                              <p className="text-[10px] text-muted-foreground truncate">{bt.reason}</p>
                            )}
                          </div>
                        ))}
                        
                        {isLoading ? (
                          <div className="h-20 bg-muted animate-pulse rounded-lg" />
                        ) : dayBookings.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {t('dashboardCalendar.noBookings')}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {dayBookings.map((booking) => (
                              <motion.button
                                key={booking.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => openBookingDetails(booking)}
                                className={`w-full text-left p-2 rounded-lg border text-xs ${
                                  statusColors[booking.status]
                                }`}
                              >
                                <p className="font-semibold truncate">
                                  {booking.start_time.slice(0, 5)}
                                </p>
                                <p className="truncate">
                                  {booking.profiles?.full_name || t('dashboardCalendar.customer')}
                                </p>
                                <p className="text-[10px] opacity-75 truncate">
                                  {booking.service_name}
                                </p>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Month View */}
            {viewMode === 'month' && (
              <motion.div
                key="month"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-border">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="p-3 text-center text-sm text-muted-foreground border-r last:border-r-0 border-border">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-28 border-r border-b border-border bg-muted/20" />
                  ))}
                  
                  {monthDays.map((day, index) => {
                    const dayBookings = getMonthBookingsForDate(day);
                    const dayBlockedTimes = getBlockedTimesForDate(day);
                    const isPast = isBefore(day, startOfDay(new Date()));
                    
                    return (
                      <div
                        key={index}
                        className={`h-28 p-2 border-r border-b border-border overflow-hidden ${
                          isToday(day) ? 'bg-primary/10' : ''
                        } ${isPast ? 'opacity-60' : ''}`}
                      >
                        <p className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </p>
                        
                        {dayBlockedTimes.length > 0 && (
                          <div className="text-[10px] text-destructive flex items-center gap-1 mb-1">
                            <Ban className="w-3 h-3" />
                            {t('dashboardCalendar.blocked')}
                          </div>
                        )}
                        
                        {dayBookings.slice(0, 2).map((booking) => (
                          <button
                            key={booking.id}
                            onClick={() => openBookingDetails(booking)}
                            className={`w-full text-left text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${
                              statusColors[booking.status]
                            }`}
                          >
                            {booking.start_time.slice(0, 5)} {booking.profiles?.full_name?.split(' ')[0] || t('dashboardCalendar.customer')}
                          </button>
                        ))}
                        
                        {dayBookings.length > 2 && (
                          <p className="text-[10px] text-muted-foreground">
                            +{dayBookings.length - 2} {t('dashboardCalendar.more')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {filteredBookings.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border p-12 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('dashboardCalendar.noBookingsFound')}</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? t('dashboardCalendar.adjustFilters')
                        : t('dashboardCalendar.bookingsWillAppear')}
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((booking) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center text-primary-foreground font-display font-bold">
                            {format(parseISO(booking.booking_date), 'd')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">
                                {booking.profiles?.full_name || t('dashboardCalendar.customer')}
                              </h3>
                              <Badge className={statusColors[booking.status]}>
                                {getStatusLabel(booking.status, t)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {booking.service_name} • {booking.currency} {booking.service_price}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {format(parseISO(booking.booking_date), 'MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {booking.profiles?.phone && (
                            <Button variant="outline" size="icon" asChild>
                              <a href={`tel:${booking.profiles.phone}`}>
                                <Phone className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" onClick={() => openBookingDetails(booking)}>
                            {t('dashboardCalendar.viewDetails')}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {booking.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'confirmed')}>
                                    <Check className="w-4 h-4 mr-2 text-green-500" />
                                    {t('dashboardCalendar.confirm')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                                    <X className="w-4 h-4 mr-2 text-destructive" />
                                    {t('dashboardCalendar.decline')}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {booking.status === 'confirmed' && (
                                <>
                                  <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'completed')}>
                                    <Check className="w-4 h-4 mr-2 text-blue-500" />
                                    {t('dashboardCalendar.markComplete')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'no_show')}>
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    {t('dashboardCalendar.noShow')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    className="text-destructive"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    {t('dashboardCalendar.cancelBooking')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6">
            {Object.keys(statusColors).map((status) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusColors[status].split(' ')[0]}`} />
                <span className="text-sm text-muted-foreground">{getStatusLabel(status, t)}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/20" />
              <span className="text-sm text-muted-foreground">{t('dashboardCalendar.blocked')}</span>
            </div>
          </div>
        </div>
      </main>
      </PullToRefresh>

      {/* Booking Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dashboardCalendar.bookingDetails')}</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedBooking.status]}>
                  {getStatusLabel(selectedBooking.status, t)}
                </Badge>
                <span className="font-display font-bold text-gradient-gold">
                  {selectedBooking.currency} {selectedBooking.service_price}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedBooking.profiles?.full_name || 'Customer'}
                    </p>
                    {selectedBooking.profiles?.phone && (
                      <a href={`tel:${selectedBooking.profiles.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedBooking.profiles.phone}
                      </a>
                    )}
                    {selectedBooking.profiles?.email && (
                      <a href={`mailto:${selectedBooking.profiles.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedBooking.profiles.email}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                  <p>{format(parseISO(selectedBooking.booking_date), 'EEEE, MMMM d, yyyy')}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <p>
                    {selectedBooking.start_time.slice(0, 5)} - {selectedBooking.end_time.slice(0, 5)}
                  </p>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('dashboardCalendar.service')}</p>
                  <p className="font-medium">{selectedBooking.service_name}</p>
                </div>

                {selectedBooking.notes && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('dashboardCalendar.notes')}</p>
                    <p>{selectedBooking.notes}</p>
                  </div>
                )}

                {selectedBooking.cancellation_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-sm text-destructive">{t('dashboardCalendar.cancellationReason')}</p>
                    <p>{selectedBooking.cancellation_reason}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {t('dashboardCalendar.bookedOn')} {format(parseISO(selectedBooking.created_at), 'MMM d, yyyy at HH:mm')}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedBooking?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => updateBookingStatus(selectedBooking.id, 'cancelled')}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('dashboardCalendar.decline')}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => updateBookingStatus(selectedBooking.id, 'confirmed')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('dashboardCalendar.confirm')}
                </Button>
                <Button
                  className="bg-gradient-gold"
                  onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('dashboardCalendar.markComplete')}
                </Button>
              </>
            )}
            {selectedBooking?.status === 'confirmed' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => updateBookingStatus(selectedBooking.id, 'no_show')}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t('dashboardCalendar.noShow')}
                </Button>
                <Button
                  className="bg-gradient-gold"
                  onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('dashboardCalendar.complete')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Time Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dashboardCalendar.blockTimeTitle')}</DialogTitle>
            <DialogDescription>
              {t('dashboardCalendar.blockTimeDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('dashboardCalendar.selectDate')}</label>
              <Calendar
                mode="single"
                selected={blockDate}
                onSelect={setBlockDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                className="rounded-md border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('dashboardCalendar.startTime')}</label>
                <Select value={blockStartTime} onValueChange={setBlockStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('dashboardCalendar.endTime')}</label>
                <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('dashboardCalendar.reason')}</label>
              <Textarea
                placeholder={t('dashboardCalendar.reasonPlaceholder')}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={blockTime} disabled={!blockDate}>
              <Ban className="w-4 h-4 mr-2" />
              {t('dashboardCalendar.block')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
