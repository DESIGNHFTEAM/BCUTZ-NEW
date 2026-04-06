import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Calendar, LayoutDashboard, Shield, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { FounderBadge } from '@/components/FounderBadge';
import { AdminBadge } from '@/components/AdminBadge';
import { FounderButtonLink } from '@/components/ui/founder-button';
import { getPathWithLanguage, LanguageCode } from '@/lib/i18n';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, hasRole } = useAuth();

  const currentLang = i18n.language as LanguageCode;

  const getLocalizedPath = (path: string) => getPathWithLanguage(path, currentLang);

  const navLinks = [
    { href: '/barbers', label: t('nav.findBarbers') },
    { href: '/how-it-works', label: t('nav.howItWorks') },
    { href: '/for-professionals', label: t('nav.forProfessionals') },
  ];

  // Fetch pending barber verification count for admins
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!user || !hasRole('admin')) return;
      
      const { count, error } = await supabase
        .from('barber_profiles')
        .select('*', { count: 'exact', head: true })
        .or('is_verified.is.null,is_verified.eq.false')
        .eq('is_active', true);
      
      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    fetchPendingCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user, hasRole]);

  const handleSignOut = async () => {
    await signOut();
    navigate(getLocalizedPath('/'));
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto px-4 md:px-4 px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to={getLocalizedPath('/')} className="flex items-center gap-2">
            <Logo size="sm" variant="nav" />
          </Link>

          {/* Desktop Navigation - Only show on large screens */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={getLocalizedPath(link.href)}
                className={cn(
                  'text-xs font-semibold tracking-widest transition-colors',
                  location.pathname.includes(link.href)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth - Only show on large screens */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {hasRole('founder') && (
                  <FounderButtonLink 
                    to={getLocalizedPath('/founder/admin-management')}
                    size="sm"
                  >
                    {t('nav.founder')}
                  </FounderButtonLink>
                )}
                {hasRole('admin') && !hasRole('founder') && (
                  <Button variant="ghost" size="sm" className="text-xs tracking-wider text-foreground hover:bg-secondary relative" asChild>
                    <Link to={getLocalizedPath('/admin/barber-verification')}>
                      <Shield className="w-4 h-4 mr-2" />
                      {t('nav.admin')}
                      {pendingCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
                        >
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                )}
                {hasRole('barber') && (
                  <Button variant="ghost" size="sm" className="text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                    <Link to={getLocalizedPath('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t('nav.dashboard')}
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                  <Link to={getLocalizedPath('/bookings')}>
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('nav.bookings')}
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                  <Link to={getLocalizedPath(hasRole('barber') ? '/dashboard/profile' : '/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    {t('nav.profile')}
                  </Link>
                </Button>
                <NotificationBell />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-xs tracking-wider border-2 bg-background text-foreground hover:bg-secondary"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.signOut')}
                </Button>
              </>
            ) : (
            <>
                <Button variant="ghost" size="sm" className="text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                  <Link to={getLocalizedPath('/auth')}>{t('nav.signIn')}</Link>
                </Button>
                <Button 
                  size="sm" 
                  className="bg-foreground text-background hover:bg-foreground/90 text-xs tracking-wider font-semibold" 
                  asChild
                >
                  <Link to={getLocalizedPath('/auth?mode=signup')}>{t('nav.getStarted')}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile/Tablet Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <button
              className="p-2"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background border-b border-border"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={getLocalizedPath(link.href)}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'text-sm font-semibold tracking-widest py-2 transition-colors',
                    location.pathname.includes(link.href)
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="border-t border-border pt-4 flex flex-col gap-2">
                {user ? (
                  <>
                    {hasRole('founder') && (
                      <div onClick={() => setIsOpen(false)}>
                        <FounderButtonLink 
                          to={getLocalizedPath('/founder/admin-management')}
                          size="sm"
                          className="w-full justify-start"
                        >
                          {t('nav.founder')}
                        </FounderButtonLink>
                      </div>
                    )}
                    {hasRole('admin') && !hasRole('founder') && (
                       <Button variant="ghost" className="justify-start text-xs tracking-wider text-foreground hover:bg-secondary relative" asChild>
                        <Link to={getLocalizedPath('/admin/barber-verification')} onClick={() => setIsOpen(false)}>
                          <Shield className="w-4 h-4 mr-2" />
                          {t('nav.admin')}
                          {pendingCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="ml-2 h-5 min-w-5 px-1 text-[10px]"
                            >
                              {pendingCount}
                            </Badge>
                          )}
                        </Link>
                      </Button>
                    )}
                    {hasRole('barber') && (
                      <Button variant="ghost" className="justify-start text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                        <Link to={getLocalizedPath('/dashboard')} onClick={() => setIsOpen(false)}>
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          {t('nav.dashboard')}
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" className="justify-start text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                      <Link to={getLocalizedPath('/bookings')} onClick={() => setIsOpen(false)}>
                        <Calendar className="w-4 h-4 mr-2" />
                        {t('nav.bookings')}
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                      <Link to={getLocalizedPath(hasRole('barber') ? '/dashboard/profile' : '/profile')} onClick={() => setIsOpen(false)}>
                        <User className="w-4 h-4 mr-2" />
                        {t('nav.profile')}
                      </Link>
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <NotificationBell />
                      <span className="text-xs text-muted-foreground">{t('nav.notifications')}</span>
                    </div>
                    <Button variant="outline" onClick={handleSignOut} className="text-xs tracking-wider border-2 bg-background text-foreground hover:bg-secondary">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('nav.signOut')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="text-xs tracking-wider text-foreground hover:bg-secondary" asChild>
                      <Link to={getLocalizedPath('/auth')} onClick={() => setIsOpen(false)}>{t('nav.signIn')}</Link>
                    </Button>
                    <Button className="bg-foreground text-background text-xs tracking-wider font-semibold" asChild>
                      <Link to={getLocalizedPath('/auth?mode=signup')} onClick={() => setIsOpen(false)}>{t('nav.getStarted')}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
