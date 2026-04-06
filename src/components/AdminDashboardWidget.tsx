import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Flag, Users, ChevronRight, Shield, Crown, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { FounderBadge } from '@/components/FounderBadge';
import { FounderButtonLink } from '@/components/ui/founder-button';

export function AdminDashboardWidget() {
  const { user, hasRole } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && hasRole('admin')) {
      fetchAdminStats();
    }
  }, [user, hasRole]);

  const fetchAdminStats = async () => {
    try {
      // Fetch unread notifications count
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      setUnreadNotifications(notifCount || 0);

      // Fetch pending reports count
      const { count: reportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingReports(reportsCount || 0);

      // Fetch pending barber verifications
      const { count: verifyCount } = await supabase
        .from('barber_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_verified', false);

      setPendingVerifications(verifyCount || 0);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasRole('admin')) {
    return null;
  }

  const stats = [
    {
      label: 'Unread Notifications',
      value: unreadNotifications,
      icon: Bell,
      href: '#',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Pending Reports',
      value: pendingReports,
      icon: Flag,
      href: '/admin/reports',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Pending Verifications',
      value: pendingVerifications,
      icon: Users,
      href: '/admin/barber-verification',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  const isFounder = hasRole('founder');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-6 mb-6 ${
        isFounder 
          ? 'bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-500/30' 
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isFounder 
              ? 'bg-gradient-to-br from-amber-500 to-yellow-400' 
              : 'bg-primary/10'
          }`}>
            {isFounder ? (
              <Crown className="w-5 h-5 text-black" />
            ) : (
              <Shield className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold">
                {isFounder ? 'Founder Panel' : 'Admin Panel'}
              </h2>
              {isFounder && <FounderBadge showTooltip={false} />}
            </div>
            <p className="text-sm text-muted-foreground">
              {isFounder ? 'Full platform access' : 'Quick access to admin tasks'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.href}
            className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-display font-bold">
                {isLoading ? '...' : stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
            {stat.value > 0 && (
              <Badge className="bg-red-500 text-white">
                {stat.value}
              </Badge>
            )}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <Button variant="outline" size="sm" glowColor="rgba(245, 158, 11, 0.4)" asChild>
          <Link to="/admin/reports">
            View Reports
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" glowColor="rgba(245, 158, 11, 0.4)" asChild>
          <Link to="/admin/barber-verification">
            Verify Barbers
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" glowColor="rgba(245, 158, 11, 0.4)" asChild>
          <Link to="/admin/loyalty-rewards">
            <Gift className="w-4 h-4 mr-2" />
            Loyalty Rewards
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
        {isFounder && (
          <FounderButtonLink 
            to="/founder/admin-management"
            size="sm"
          >
            Manage Admins
            <ChevronRight className="w-4 h-4 ml-1" />
          </FounderButtonLink>
        )}
      </div>
    </motion.div>
  );
}
