import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Gift, Calendar, Loader2, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LoyaltyTransaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
  booking_id: string | null;
}

interface LoyaltyTransactionHistoryProps {
  userId: string;
  limit?: number;
}

export function LoyaltyTransactionHistory({ userId, limit = 10 }: LoyaltyTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      setTransactions(data);
    }
    setIsLoading(false);
  };

  const getTransactionIcon = (type: string, points: number) => {
    if (type === 'redemption' || points < 0) {
      return <Gift className="w-5 h-5 text-accent" />;
    }
    if (type === 'booking' || type === 'earned') {
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    }
    if (type === 'bonus') {
      return <TrendingUp className="w-5 h-5 text-yellow-500" />;
    }
    return <Calendar className="w-5 h-5 text-muted-foreground" />;
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'earned':
      case 'booking':
        return 'BOOKING REWARD';
      case 'redemption':
        return 'REWARD REDEEMED';
      case 'bonus':
        return 'BONUS POINTS';
      case 'adjustment':
        return 'ADJUSTMENT';
      default:
        return type.toUpperCase();
    }
  };

  if (isLoading) {
    return (
      <div className="border-2 border-border p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-display text-lg tracking-wider">TRANSACTION HISTORY</h3>
      </div>

      {transactions.length === 0 ? (
        <div className="border-2 border-dashed border-border p-8 text-center">
          <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground tracking-wider text-sm">NO TRANSACTIONS YET</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your points activity will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="flex items-center gap-4 p-4 bg-muted/30 border border-border hover:border-foreground/20 transition-colors"
            >
              <div className="w-10 h-10 bg-background border border-border flex items-center justify-center flex-shrink-0">
                {getTransactionIcon(transaction.transaction_type, transaction.points)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm tracking-wider">
                  {getTransactionLabel(transaction.transaction_type)}
                </p>
                {transaction.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {transaction.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
              
              <div className={`text-right flex-shrink-0 ${
                transaction.points > 0 ? 'text-green-500' : 'text-accent'
              }`}>
                <p className="font-display text-lg">
                  {transaction.points > 0 ? '+' : ''}{transaction.points}
                </p>
                <p className="text-[10px] tracking-widest text-muted-foreground">POINTS</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
