import { useState } from 'react';
import { ChevronDown, Wallet, Info } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CurrencySelectorProps {
  compact?: boolean;
  onCurrencyChange?: (currency: string) => void;
  showDisclaimer?: boolean;
}

/**
 * Currency conversion disclaimer component
 */
export function CurrencyDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-sm ${className}`}>
      <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Prices shown are approximate. Final amount will be calculated by Stripe at checkout using real-time exchange rates. 
        Your bank may apply additional conversion fees.
      </p>
    </div>
  );
}

/**
 * Inline disclaimer for compact displays
 */
export function CurrencyDisclaimerInline() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-3 h-3" />
            <span>Approx. price</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <p className="text-xs">
            Final amount calculated at checkout using real-time exchange rates. Your bank may apply additional fees.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CurrencySelector({ compact = false, onCurrencyChange, showDisclaimer = true }: CurrencySelectorProps) {
  const { currency, setCurrency, supportedCurrencies, getCurrencySymbol } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (newCurrency: string) => {
    setCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
    setIsOpen(false);
  };

  const currentCurrency = supportedCurrencies.find(c => c.code === currency);

  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <span className="font-medium">{getCurrencySymbol()}</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {supportedCurrencies.map((curr) => (
            <DropdownMenuItem
              key={curr.code}
              onClick={() => handleSelect(curr.code)}
              className={currency === curr.code ? 'bg-muted' : ''}
            >
              <span className="font-medium w-10">{curr.symbol}</span>
              <span className="text-muted-foreground text-xs">{curr.code}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="border-2 border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4" />
        <p className="text-xs text-muted-foreground tracking-wider">PAYMENT CURRENCY</p>
      </div>
      
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 border-2 border-border hover:border-foreground transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl">{currentCurrency?.symbol}</span>
              <div className="text-left">
                <p className="font-display tracking-wider text-sm">{currency}</p>
                <p className="text-xs text-muted-foreground">{currentCurrency?.name}</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {supportedCurrencies.map((curr) => (
            <DropdownMenuItem
              key={curr.code}
              onClick={() => handleSelect(curr.code)}
              className={`flex items-center gap-3 ${currency === curr.code ? 'bg-muted' : ''}`}
            >
              <span className="font-display text-lg w-8">{curr.symbol}</span>
              <div>
                <p className="font-medium">{curr.code}</p>
                <p className="text-xs text-muted-foreground">{curr.name}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {showDisclaimer && (
        <CurrencyDisclaimer className="mt-3" />
      )}
    </div>
  );
}
