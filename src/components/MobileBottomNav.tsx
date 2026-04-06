import { useCallback, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clapperboard, Search, Calendar, User, LayoutDashboard, MessageCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useIsMobileOrTablet } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { getPathWithLanguage, type LanguageCode } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

// Haptic feedback helper
const triggerHaptic = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    // Haptics not available
  }
};

export function MobileBottomNav() {
  const location = useLocation();
  const { user, hasRole } = useAuth();
  const isMobileOrTablet = useIsMobileOrTablet();
  const { t, i18n } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  const currentLang = (i18n.language?.substring(0, 2) || 'en') as LanguageCode;

  const handleNavClick = useCallback(() => {
    triggerHaptic();
  }, []);

  // Fetch unread message count for barbers
  useEffect(() => {
    if (!user || !hasRole('barber')) return;

    const fetchUnread = async () => {
      // Get barber profile id
      const { data: bp } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!bp) return;

      // Get conversations for this barber
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('barber_id', bp.id);

      if (!convs || convs.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Count unread messages not sent by the barber
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convs.map(c => c.id))
        .eq('is_read', false)
        .neq('sender_id', user.id);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Listen for new messages
    const channel = supabase
      .channel('nav-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, hasRole]);

  // Don't show bottom nav on auth page, if not logged in, or on desktop
  if (!user || location.pathname.includes('/auth') || !isMobileOrTablet) return null;

  // Build nav items with translations and proper language paths
  const customerNavItems = [
    { href: getPathWithLanguage('/barbers', currentLang), icon: Clapperboard, label: t('mobileNav.reels', 'Reels') },
    { href: getPathWithLanguage('/barbers?view=search', currentLang), icon: Search, label: t('mobileNav.search', 'Search') },
    { href: getPathWithLanguage('/bookings', currentLang), icon: Calendar, label: t('mobileNav.bookings', 'Bookings') },
    { href: getPathWithLanguage('/profile', currentLang), icon: User, label: t('mobileNav.profile', 'Profile') },
  ];

  const barberNavItems = [
    { href: getPathWithLanguage('/dashboard', currentLang), icon: LayoutDashboard, label: t('mobileNav.home', 'Home') },
    { href: getPathWithLanguage('/dashboard/calendar', currentLang), icon: Calendar, label: t('mobileNav.calendar', 'Calendar') },
    { href: getPathWithLanguage('/dashboard/messages', currentLang), icon: MessageCircle, label: t('mobileNav.messages', 'Messages'), badge: unreadCount },
    { href: getPathWithLanguage('/dashboard/profile', currentLang), icon: User, label: t('mobileNav.profile', 'Profile') },
  ];

  const navItems = hasRole('barber') ? barberNavItems : customerNavItems;

  // Check if path is active (accounting for language prefixes)
  const isPathActive = (href: string) => {
    const cleanHref = href.split('?')[0];
    const cleanPath = location.pathname;
    
    // Exact match or starts with (for nested routes)
    return cleanPath === cleanHref || 
      (cleanHref !== '/' && cleanHref !== getPathWithLanguage('/', currentLang) && cleanPath.startsWith(cleanHref));
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] px-4"
      style={{ backgroundColor: 'inherit' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = isPathActive(item.href);
          const badge = 'badge' in item ? (item as any).badge : 0;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all relative",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <item.icon className={cn(
                  "w-6 h-6 transition-all",
                  isActive && "scale-110"
                )} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="navDot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-foreground rounded-full"
                  />
                )}
              </motion.div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
