import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { languages, type LanguageCode, getPathWithLanguage, getPathWithoutLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function LanguageSwitcher({ className, variant = 'default' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLanguageChange = (langCode: LanguageCode) => {
    // Update i18n language
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    
    // Navigate to the correct language path
    const currentPathWithoutLang = getPathWithoutLanguage(location.pathname);
    const newPath = getPathWithLanguage(currentPathWithoutLang, langCode);
    
    // Only navigate if the path actually changes
    if (newPath !== location.pathname) {
      navigate(newPath + location.search + location.hash, { replace: true });
    }
  };

  const currentLang = (i18n.language?.substring(0, 2) || 'en') as LanguageCode;

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center", className)}>
        {languages.map((lang, index) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "px-2 py-1 text-xs tracking-wider transition-all cursor-pointer",
              currentLang === lang.code
                ? "bg-secondary text-foreground font-semibold"
                : "text-foreground/80 hover:text-foreground hover:bg-secondary",
              index === 0 && "rounded-l-sm",
              index === languages.length - 1 && "rounded-r-sm"
            )}
            type="button"
          >
            {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {languages.map((lang, index) => (
        <div key={lang.code} className="flex items-center">
          <button
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 text-xs tracking-wider transition-all duration-200 cursor-pointer",
              currentLang === lang.code
                ? "text-foreground font-medium"
                : "text-foreground/80 hover:text-foreground"
            )}
            type="button"
          >
            <span>{lang.flag}</span>
            <span>{lang.code.toUpperCase()}</span>
          </button>
          {index < languages.length - 1 && (
            <span className="text-foreground/40">|</span>
          )}
        </div>
      ))}
    </div>
  );
}
