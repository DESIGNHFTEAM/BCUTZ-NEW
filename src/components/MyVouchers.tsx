import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Tag, Clock, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, parseISO, isPast } from 'date-fns';
import { toast } from 'sonner';

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

export function MyVouchers() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchVouchers();
    }
  }, [user]);

  const fetchVouchers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVouchers(data);
    }
    setIsLoading(false);
  };

  const handleCopyCode = async (voucher: Voucher) => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopiedId(voucher.id);
      toast.success('Voucher code copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const getVoucherStatus = (voucher: Voucher) => {
    if (voucher.is_used) return 'used';
    if (isPast(parseISO(voucher.expires_at))) return 'expired';
    return 'active';
  };

  const activeVouchers = vouchers.filter(v => getVoucherStatus(v) === 'active');
  const usedOrExpiredVouchers = vouchers.filter(v => getVoucherStatus(v) !== 'active');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-border text-center">
        <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No vouchers yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Redeem rewards to get discount vouchers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Vouchers */}
      {activeVouchers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground tracking-wider">
            ACTIVE VOUCHERS ({activeVouchers.length})
          </h3>
          {activeVouchers.map((voucher, index) => (
            <motion.div
              key={voucher.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-display font-bold tracking-wider">
                    {voucher.discount_type === 'percentage' 
                      ? `${voucher.discount_value}% OFF`
                      : `CHF ${voucher.discount_value} OFF`
                    }
                  </span>
                </div>
                <Badge variant="default" className="text-xs">
                  ACTIVE
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <code className="px-3 py-2 bg-muted font-mono text-sm tracking-widest">
                    {voucher.code}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyCode(voucher)}
                    className="h-8 px-2"
                  >
                    {copiedId === voucher.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Expires {format(parseISO(voucher.expires_at), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {voucher.max_discount && voucher.discount_type === 'percentage' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Max discount: CHF {voucher.max_discount}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Used/Expired Vouchers */}
      {usedOrExpiredVouchers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground tracking-wider">
            PAST VOUCHERS ({usedOrExpiredVouchers.length})
          </h3>
          {usedOrExpiredVouchers.map((voucher, index) => {
            const status = getVoucherStatus(voucher);
            return (
              <motion.div
                key={voucher.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border border-border bg-muted/30 opacity-60"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="font-display font-bold tracking-wider line-through">
                      {voucher.discount_type === 'percentage' 
                        ? `${voucher.discount_value}% OFF`
                        : `CHF ${voucher.discount_value} OFF`
                      }
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {status === 'used' ? 'USED' : 'EXPIRED'}
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground font-mono">
                  {voucher.code}
                </code>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
