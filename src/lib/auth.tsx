import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { detectUserCurrency } from '@/hooks/useCurrencyDetection';
import { getCurrencyForRegion } from '@/lib/feeCalculator';

export type AppRole = 'customer' | 'barber' | 'admin' | 'founder';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; session: Session | null; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (!error && data) {
      setRoles(data.map(r => r.role as AppRole));
    }
  };

  /**
   * Set default currency for new users based on browser locale detection
   */
  const setDefaultCurrencyForNewUser = async (userId: string) => {
    try {
      // Check if user already has a currency preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_currency, region')
        .eq('id', userId)
        .maybeSingle();

      // Only set if no currency is set yet
      if (profile && !profile.preferred_currency) {
        const detectedCurrency = detectUserCurrency();
        
        // Also try to detect region
        let detectedRegion = profile.region;
        if (!detectedRegion) {
          try {
            const locale = navigator.language || navigator.languages?.[0];
            if (locale) {
              const parts = locale.split('-');
              if (parts.length >= 2) {
                detectedRegion = parts[parts.length - 1].toUpperCase();
              }
            }
          } catch (e) {
            // Ignore locale detection errors
          }
        }

        await supabase
          .from('profiles')
          .update({ 
            preferred_currency: detectedCurrency,
            region: detectedRegion || profile.region,
          })
          .eq('id', userId);

        console.log(`Auto-detected currency: ${detectedCurrency}, region: ${detectedRegion}`);
      }
    } catch (err) {
      // Non-critical, fail silently
      console.log('Currency detection skipped:', err);
    }
  };

  const checkBirthdayBonus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('check-birthday-bonus', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!error && data?.success && data?.pointsAwarded) {
        console.log(`Birthday bonus awarded: ${data.pointsAwarded} points`);
      }
    } catch (err) {
      console.log('Birthday check skipped:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchRoles(session.user.id);
            
            if (event === 'SIGNED_IN') {
              checkBirthdayBonus();
              // Auto-detect currency for new users on first sign in
              setDefaultCurrencyForNewUser(session.user.id);
            }
          }, 0);
        } else {
          setRoles([]);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchRoles(session.user.id);
        checkBirthdayBonus();
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error, session: data?.session, user: data?.user };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      roles,
      isLoading,
      signUp,
      signIn,
      signOut,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
