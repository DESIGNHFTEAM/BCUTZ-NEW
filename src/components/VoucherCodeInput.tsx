import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2, Tag, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface VoucherInfo {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
}

interface VoucherCodeInputProps {
  servicePrice: number;
  currency: string;
  onVoucherApplied: (voucher: VoucherInfo | null, discountAmount: number) => void;
}

export function VoucherCodeInput({ servicePrice, currency, onVoucherApplied }: VoucherCodeInputProps) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const calculateDiscount = (voucher: VoucherInfo): number => {
    let discount = 0;
    if (voucher.discount_type === 'percentage') {
      discount = (servicePrice * voucher.discount_value) / 100;
      if (voucher.max_discount && discount > voucher.max_discount) {
        discount = voucher.max_discount;
      }
    } else {
      discount = voucher.discount_value;
    }
    return Math.min(discount, servicePrice);
  };

  const handleApplyVoucher = async () => {
    if (!code.trim() || !user) return;

    setIsValidating(true);
    setError(null);

    try {
      const { data: voucher, error: fetchError } = await supabase
        .from('vouchers')
        .select('id, code, discount_type, discount_value, max_discount, is_used, expires_at, user_id')
        .eq('code', code.trim().toUpperCase())
        .single();

      if (fetchError || !voucher) {
        setError('Invalid voucher code');
        onVoucherApplied(null, 0);
        return;
      }

      if (voucher.user_id !== user.id) {
        setError('This voucher belongs to another account');
        onVoucherApplied(null, 0);
        return;
      }

      if (voucher.is_used) {
        setError('This voucher has already been used');
        onVoucherApplied(null, 0);
        return;
      }

      if (new Date(voucher.expires_at) < new Date()) {
        setError('This voucher has expired');
        onVoucherApplied(null, 0);
        return;
      }

      const discount = calculateDiscount(voucher);
      setAppliedVoucher(voucher);
      setDiscountAmount(discount);
      onVoucherApplied(voucher, discount);
    } catch (err) {
      setError('Failed to validate voucher');
      onVoucherApplied(null, 0);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setCode('');
    setError(null);
    onVoucherApplied(null, 0);
  };

  if (appliedVoucher) {
    return (
      <div className="p-3 border-2 border-green-500/50 bg-green-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {appliedVoucher.code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              -{currency} {discountAmount.toFixed(2)}
            </span>
            <button
              onClick={handleRemoveVoucher}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {appliedVoucher.discount_type === 'percentage' 
            ? `${appliedVoucher.discount_value}% off applied`
            : `${currency} ${appliedVoucher.discount_value} off applied`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="VOUCHER CODE"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            className="pl-10 tracking-wider text-sm rounded-none border-2"
            disabled={isValidating}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApplyVoucher}
          disabled={!code.trim() || isValidating}
          className="rounded-none border-2 tracking-wider text-xs"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'APPLY'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive tracking-wider">{error}</p>
      )}
    </div>
  );
}
