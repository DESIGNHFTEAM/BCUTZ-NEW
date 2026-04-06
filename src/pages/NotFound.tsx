import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/ui/logo";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center space-y-8">
        {/* Flickering neon logo */}
        <Logo size="2xl" variant="loading" />
        
        {/* 404 Text with neon styling */}
        <div className="space-y-4">
          <h1 className="text-8xl md:text-9xl font-display tracking-wider text-foreground/20">
            404
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-wide">
            {t('notFound.signalLost')}
          </p>
          <p className="text-sm text-muted-foreground/60 max-w-md">
            {t('notFound.description')}
          </p>
        </div>

        {/* Return home button with neon glow */}
        <Link 
          to="/"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 border-2 border-red-500/30 text-foreground font-medium tracking-wider uppercase text-sm transition-all duration-200 hover:border-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(255,59,48,0.8),0_0_40px_rgba(255,59,48,0.5),0_0_60px_rgba(255,59,48,0.3)] hover:bg-red-500/20"
        >
          <Home className="w-4 h-4" />
          {t('notFound.returnHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
