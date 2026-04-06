import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/logo';
import { Instagram, Twitter, Facebook, Youtube } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ReportButton } from '@/components/ReportButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/lib/auth';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';

export function Footer() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const currentLang = getLanguageFromPath(location.pathname);

  // Helper to get localized path
  const getLocalizedPath = (path: string) => getPathWithLanguage(path, currentLang);

  const footerLinks = {
    product: [
      { label: t('footer.findProfessionals'), href: '/barbers' },
      { label: t('footer.forProfessionals'), href: '/for-professionals' },
      { label: t('footer.howItWorks'), href: '/how-it-works' },
    ],
    company: [
      { label: t('footer.aboutUs'), href: '/about' },
      { label: t('footer.careers'), href: '/careers' },
      { label: t('footer.press'), href: '/press' },
      { label: t('footer.contact'), href: '/contact' },
    ],
    legal: [
      { label: t('footer.terms'), href: '/terms' },
      { label: t('footer.privacy'), href: '/privacy' },
      { label: t('footer.cookies'), href: '/cookies' },
    ],
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p className="mt-6 text-foreground/80 max-w-sm">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-3 mt-8">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-foreground/75 hover:text-foreground hover:border-foreground transition-all duration-200 hover:scale-110 hover:-translate-y-1"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-foreground/75 hover:text-foreground hover:border-foreground transition-all duration-200 hover:scale-110 hover:-translate-y-1"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-foreground/75 hover:text-foreground hover:border-foreground transition-all duration-200 hover:scale-110 hover:-translate-y-1"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-foreground/75 hover:text-foreground hover:border-foreground transition-all duration-200 hover:scale-110 hover:-translate-y-1"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-foreground/75 hover:text-foreground hover:border-foreground transition-all duration-200 hover:scale-110 hover:-translate-y-1"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display text-sm tracking-widest mb-6">{t('footer.product')}</h4>
            <ul className="space-y-4">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    to={getLocalizedPath(link.href)}
                    className="text-xs tracking-wider text-foreground/75 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display text-sm tracking-widest mb-6">{t('footer.company')}</h4>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={getLocalizedPath(link.href)}
                    className="text-xs tracking-wider text-foreground/75 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display text-sm tracking-widest mb-6">{t('footer.legal')}</h4>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={getLocalizedPath(link.href)}
                    className="text-xs tracking-wider text-foreground/75 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs tracking-wider text-foreground/70">
            © {new Date().getFullYear()} BCUTZ. {t('common.madeInSwitzerland')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center border border-border rounded-sm px-2 py-1 bg-background hover:bg-secondary transition-colors">
              <LanguageSwitcher variant="compact" />
            </div>
            
            {/* Separator */}
            <span className="hidden sm:block w-px h-5 bg-border/50" />
            
            {/* Theme Toggle */}
            <ThemeToggle className="rounded-sm" />
            
            {/* Report Button - only show when logged in */}
            {user && (
              <>
                <span className="hidden sm:block w-px h-5 bg-border/50" />
                <ReportButton variant="icon" className="rounded-sm" />
              </>
            )}
            
            {/* Separator */}
            <span className="hidden sm:block w-px h-5 bg-border/50" />
            
            {/* Made in Switzerland badge */}
            <div className="flex items-center gap-1.5 text-xs tracking-wider text-foreground/70 px-2 py-1">
              <span>🇨🇭</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
