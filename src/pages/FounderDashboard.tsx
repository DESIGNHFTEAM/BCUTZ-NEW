import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Crown, Users, DollarSign, Calendar, Star, Activity, 
  TrendingUp, AlertTriangle, CheckCircle, Clock, Shield,
  Search, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FounderButtonLink } from '@/components/ui/founder-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { EmailPreviewSheet } from '@/components/EmailPreviewSheet';
import { PullToRefresh } from '@/components/PullToRefresh';

interface PlatformStats {
  totalUsers: number;
  totalBarbers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingVerifications: number;
  openReports: number;
  activeSubscriptions: number;
  avgRating: number;
}

interface MentionEntry {
  id: string;
  source: string;
  content: string;
  created_at: string;
  type: 'review' | 'report' | 'notification';
}

function FounderDashboardContent() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [mentions, setMentions] = useState<MentionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user && hasRole('founder')) {
      fetchPlatformStats();
      fetchRecentActivity();
      fetchMentions();
    }
  }, [user, hasRole]);

  const fetchPlatformStats = async () => {
    try {
      const [
        { count: userCount },
        { count: barberCount },
        { count: bookingCount },
        { data: bookingsData },
        { count: pendingVerifications },
        { count: openReports },
        { data: ratingsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('barber_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('total_amount').eq('status', 'completed'),
        supabase.from('barber_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('barber_profiles').select('avg_rating').gt('avg_rating', 0)
      ]);

      const totalRevenue = bookingsData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const avgRating = ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, b) => sum + (b.avg_rating || 0), 0) / ratingsData.length
        : 0;

      setStats({
        totalUsers: userCount || 0,
        totalBarbers: barberCount || 0,
        totalBookings: bookingCount || 0,
        totalRevenue,
        pendingVerifications: pendingVerifications || 0,
        openReports: openReports || 0,
        activeSubscriptions: 0,
        avgRating
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    const { data } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    setRecentActivity(data || []);
    setIsLoading(false);
  };

  const fetchMentions = async () => {
    const [{ data: reviews }, { data: reports }] = await Promise.all([
      supabase.from('reviews').select('id, comment, created_at').not('comment', 'is', null).order('created_at', { ascending: false }).limit(20),
      supabase.from('reports').select('id, description, created_at').order('created_at', { ascending: false }).limit(20)
    ]);

    const allMentions: MentionEntry[] = [
      ...(reviews || []).map(r => ({
        id: r.id,
        source: 'Review',
        content: r.comment || '',
        created_at: r.created_at,
        type: 'review' as const
      })),
      ...(reports || []).map(r => ({
        id: r.id,
        source: 'Report',
        content: r.description,
        created_at: r.created_at,
        type: 'report' as const
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setMentions(allMentions);
  };

  const filteredMentions = mentions.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchPlatformStats(), fetchRecentActivity(), fetchMentions()]);
  }, [user, hasRole]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-20 md:pt-24 pb-16">
          <div className="container mx-auto px-4">
            <Breadcrumbs />
          
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 md:mb-8">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl md:text-4xl font-bold">{t('founder.dashboard.title')}</h1>
                <p className="text-xs md:text-base text-muted-foreground">{t('founder.dashboard.subtitle')}</p>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <EmailPreviewSheet 
                trigger={
                  <Button variant="outline" size="sm" className="text-xs md:text-sm">
                    <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                    {t('founder.dashboard.emailPreview')}
                  </Button>
                }
              />
              <FounderButtonLink 
                to="/founder/activity-log"
                size="sm"
                showIcon={false}
                className="text-xs md:text-sm"
              >
                <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                {t('founder.dashboard.activityLog')}
              </FounderButtonLink>
              <FounderButtonLink 
                to="/founder/admin-management"
                size="sm"
                showIcon={false}
                className="text-xs md:text-sm"
              >
                <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                {t('founder.dashboard.manageAdmins')}
              </FounderButtonLink>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl md:text-3xl font-bold">{stats?.totalUsers || 0}</p>
                      <p className="text-[10px] md:text-sm text-muted-foreground truncate">{t('founder.dashboard.totalUsers')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-2">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg md:text-3xl font-bold">CHF {(stats?.totalRevenue || 0).toFixed(0)}</p>
                      <p className="text-[10px] md:text-sm text-muted-foreground truncate">{t('founder.dashboard.totalRevenue')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-2">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl md:text-3xl font-bold">{stats?.totalBookings || 0}</p>
                      <p className="text-[10px] md:text-sm text-muted-foreground truncate">{t('founder.dashboard.totalBookings')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-2">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Star className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl md:text-3xl font-bold">{(stats?.avgRating || 0).toFixed(1)}</p>
                      <p className="text-[10px] md:text-sm text-muted-foreground truncate">{t('founder.dashboard.avgRating')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Action Items */}
          <div className="grid md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className={stats?.pendingVerifications ? 'border-amber-500/50 bg-amber-500/5' : ''}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm md:text-base">{stats?.pendingVerifications || 0} {t('founder.dashboard.pending')}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{t('founder.dashboard.barberVerifications')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild className="flex-shrink-0 text-xs">
                    <Link to="/admin/barber-verification">{t('founder.dashboard.review')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={stats?.openReports ? 'border-red-500/50 bg-red-500/5' : ''}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm md:text-base">{stats?.openReports || 0} {t('founder.dashboard.open')}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{t('founder.dashboard.reportsToReview')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild className="flex-shrink-0 text-xs">
                    <Link to="/admin/reports">{t('founder.dashboard.review')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm md:text-base">{stats?.totalBarbers || 0} {t('founder.dashboard.barbers')}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{t('founder.dashboard.activeOnPlatform')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild className="flex-shrink-0 text-xs">
                    <Link to="/barbers">{t('founder.dashboard.viewAll')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="mentions" className="space-y-4">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="mentions" className="flex-1 md:flex-none text-xs md:text-sm">{t('founder.dashboard.mentionsTracker')}</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 md:flex-none text-xs md:text-sm">{t('founder.dashboard.recentActivity')}</TabsTrigger>
            </TabsList>

            <TabsContent value="mentions">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <CardTitle className="text-base md:text-lg">{t('founder.dashboard.platformMentions')}</CardTitle>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('founder.dashboard.searchMentions')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                  {filteredMentions.length === 0 ? (
                    <div className="text-center py-8 md:py-12 text-muted-foreground text-sm">
                      {t('founder.dashboard.noMentions')}
                    </div>
                  ) : (
                    <div className="space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
                      {filteredMentions.map((mention) => (
                        <div key={mention.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={mention.type === 'report' ? 'destructive' : 'secondary'} className="text-[10px] md:text-xs">
                              {mention.source}
                            </Badge>
                            <span className="text-[10px] md:text-xs text-muted-foreground">
                              {format(new Date(mention.created_at), 'MMM d, HH:mm')}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm line-clamp-2">{mention.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-base md:text-lg">{t('founder.dashboard.recentAdminActivity')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 md:py-12 text-muted-foreground text-sm">
                      {t('founder.dashboard.noActivity')}
                    </div>
                  ) : (
                    <div className="space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="p-3 border rounded-lg flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs md:text-sm truncate">{activity.action_type.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </main>
      </PullToRefresh>
</div>
  );
}

// RouteGuard in App.tsx enforces founder role — no page-level wrapper needed.
export default function FounderDashboard() {
  return <FounderDashboardContent />;
}
