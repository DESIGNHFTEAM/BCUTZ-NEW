import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Crown, Shield, Activity, Search, 
  ShieldCheck, ShieldX, CheckCircle, XCircle, Clock,
  UserPlus, UserMinus
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityLogEntry {
  id: string;
  actor_id: string;
  action_type: string;
  target_user_id: string | null;
  target_barber_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
  actor_email?: string;
  success?: boolean;
}

function FounderActivityLogContent() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const actionTypeConfig: Record<string, { icon: typeof Shield; label: string; color: string }> = {
    admin_role_granted: { icon: UserPlus, label: t('founder.activityLog.actionTypes.admin_role_granted'), color: 'text-green-500' },
    admin_role_revoked: { icon: UserMinus, label: t('founder.activityLog.actionTypes.admin_role_revoked'), color: 'text-red-500' },
    admin_role_grant_failed: { icon: XCircle, label: t('founder.activityLog.actionTypes.admin_role_grant_failed'), color: 'text-red-500' },
    admin_role_revoke_failed: { icon: XCircle, label: t('founder.activityLog.actionTypes.admin_role_revoke_failed'), color: 'text-red-500' },
    admin_role_invalid_action: { icon: XCircle, label: t('founder.activityLog.actionTypes.admin_role_invalid_action'), color: 'text-orange-500' },
    barber_approved: { icon: CheckCircle, label: t('founder.activityLog.actionTypes.barber_approved'), color: 'text-green-500' },
    barber_rejected: { icon: XCircle, label: t('founder.activityLog.actionTypes.barber_rejected'), color: 'text-red-500' },
    report_resolved: { icon: ShieldCheck, label: t('founder.activityLog.actionTypes.report_resolved'), color: 'text-blue-500' },
    report_dismissed: { icon: ShieldX, label: t('founder.activityLog.actionTypes.report_dismissed'), color: 'text-orange-500' },
  };

  useEffect(() => {
    if (user && hasRole('founder')) {
      fetchActivityLog();
    }
  }, [user, hasRole]);

  const fetchActivityLog = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching activity log:', error);
      toast({
        title: t('common.error'),
        description: t('toasts.activityLog.loadError'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const actorIds = [...new Set((data || []).map(a => a.actor_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', actorIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const activitiesWithNames: ActivityLogEntry[] = (data || []).map(activity => {
      const details = (activity.details as Record<string, any>) || {};
      return {
        ...activity,
        details,
        actor_name: profileMap.get(activity.actor_id)?.full_name || 'Unknown',
        actor_email: profileMap.get(activity.actor_id)?.email || '',
        success: details.success ?? true,
      };
    });

    setActivities(activitiesWithNames);
    setIsLoading(false);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.actor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.actor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.details?.target_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.details?.target_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterAction === 'all') return matchesSearch;
    return matchesSearch && activity.action_type === filterAction;
  });

  const actionTypes = [...new Set(activities.map(a => a.action_type))];


  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<main className="pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <Activity className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
              <p className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] text-amber-500 font-semibold">{t('founder.tagline')}</p>
            </div>
            <h1 className="font-display text-2xl md:text-5xl font-bold tracking-wider">
              {t('founder.activityLog.title')}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              {t('founder.activityLog.subtitle')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 md:p-4 border border-border bg-card"
            >
              <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{activities.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.activityLog.totalActions')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 md:p-4 border border-green-500/30 bg-green-500/5"
            >
              <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-green-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">
                {activities.filter(a => a.action_type === 'admin_role_granted').length}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.activityLog.adminsAdded')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 md:p-4 border border-green-500/30 bg-green-500/5"
            >
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">
                {activities.filter(a => a.action_type === 'barber_approved').length}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.activityLog.barbersApproved')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 md:p-4 border border-red-500/30 bg-red-500/5"
            >
              <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">
                {activities.filter(a => a.action_type === 'barber_rejected').length}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('founder.activityLog.barbersRejected')}</p>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <Input
                placeholder={t('founder.activityLog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 h-10 md:h-12 text-sm"
              />
            </div>
            <div className="flex gap-1.5 md:gap-2 flex-wrap">
              <Button
                variant={filterAction === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterAction('all')}
                size="sm"
                className="text-xs md:text-sm"
              >
                {t('common.all')}
              </Button>
              {actionTypes.map((action) => {
                const config = actionTypeConfig[action];
                return (
                  <Button
                    key={action}
                    variant={filterAction === action ? 'default' : 'outline'}
                    onClick={() => setFilterAction(action)}
                    size="sm"
                    className="text-xs md:text-sm whitespace-nowrap"
                  >
                    {config?.label || action}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Activity List */}
          {isLoading ? (
            <div className="space-y-3 md:space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 md:h-20 bg-card animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 md:py-16 border-2 border-dashed border-border rounded-lg">
              <Activity className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg md:text-xl font-medium mb-2">{t('founder.activityLog.noActivityFound')}</p>
              <p className="text-sm md:text-base text-muted-foreground">
                {searchQuery || filterAction !== 'all'
                  ? t('founder.activityLog.adjustFilters')
                  : t('founder.activityLog.actionsWillAppear')}
              </p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredActivities.map((activity, index) => {
                const config = actionTypeConfig[activity.action_type] || {
                  icon: Activity,
                  label: activity.action_type,
                  color: 'text-muted-foreground',
                };
                const Icon = config.icon;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-3 md:p-4 border border-border bg-card"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center bg-muted flex-shrink-0">
                        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${config.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                          <span className="font-medium text-sm md:text-base">{activity.actor_name}</span>
                          <span className="text-xs md:text-sm text-muted-foreground hidden md:inline">({activity.actor_email})</span>
                          <Badge variant="outline" className={`${config.color} text-[10px] md:text-xs`}>
                            {config.label}
                          </Badge>
                          {activity.success === true && (
                            <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 text-[10px] md:text-xs">
                              <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                              {t('founder.activityLog.success')}
                            </Badge>
                          )}
                          {activity.success === false && (
                            <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 text-[10px] md:text-xs">
                              <XCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                              {t('founder.activityLog.failed')}
                            </Badge>
                          )}
                        </div>
                        {activity.details?.target_name && (
                          <div className="flex items-center gap-1.5 text-xs md:text-sm mt-1">
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{activity.details.target_name}</span>
                            {activity.details?.target_email && (
                              <span className="text-muted-foreground hidden md:inline">({activity.details.target_email})</span>
                            )}
                          </div>
                        )}
                        {activity.details?.shop_name && (
                          <div className="flex items-center gap-1.5 text-xs md:text-sm mt-1">
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{activity.details.shop_name}</span>
                            {activity.details?.city && (
                              <span className="text-muted-foreground">({activity.details.city})</span>
                            )}
                          </div>
                        )}
                        {activity.details?.reason && (
                          <p className="text-xs md:text-sm text-muted-foreground mt-1 italic">
                            {t('founder.activityLog.reason')}: "{activity.details.reason}"
                          </p>
                        )}
                        {activity.details?.error && (
                          <p className="text-xs md:text-sm text-red-500 mt-1">
                            {t('founder.activityLog.error')}: {activity.details.error}
                          </p>
                        )}
                        <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-sm text-muted-foreground mt-1.5 md:mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                          <span className="hidden md:inline">
                            {format(new Date(activity.created_at), 'MMM d, yyyy • HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
</div>
  );
}

export default function FounderActivityLog() {
  return (<FounderActivityLogContent />
);
}
