import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';
import { calculateBookingFee, formatPrice } from '@/lib/feeCalculator';

interface PaymentButtonProps {
  bookingId: string;
  serviceId: string;
  barberId: string;
  serviceName: string;
  servicePrice: number;
  currency?: string;
  disabled?: boolean;
  onError?: (error: string, details?: string) => void;
}

export function PaymentButton({ 
  bookingId, 
  serviceId, 
  barberId, 
  serviceName,
  servicePrice,
  currency = 'CHF',
  disabled,
  onError
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-booking-checkout', {
        body: { bookingId, serviceId, barberId, currency }
      });

      if (error) {
        const errorMsg = error.message || 'Failed to start payment';
        onError?.(errorMsg, JSON.stringify(error));
        throw error;
      }

      if (data?.url) {
        // Redirect in same tab to avoid popup blockers
        window.location.href = data.url;
      } else if (data?.error) {
        onError?.(data.error, JSON.stringify(data));
        throw new Error(data.error);
      } else {
        const errorMsg = 'No checkout URL received';
        onError?.(errorMsg, JSON.stringify(data));
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to start payment');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dynamic booking fee using multi-currency calculator
  const bookingFee = calculateBookingFee(servicePrice, currency);
  const totalAmount = servicePrice + bookingFee;

  return (
    <Button 
      onClick={handlePayment} 
      disabled={disabled || loading}
      className="w-full"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay {formatPrice(totalAmount, currency)}
        </>
      )}
    </Button>
  );
}
