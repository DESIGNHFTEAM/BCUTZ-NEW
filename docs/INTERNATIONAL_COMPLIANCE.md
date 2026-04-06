# BCUTZ International Compliance & Multi-Currency Guide

## Overview

This document outlines BCUTZ's approach to international operations, multi-currency support, and regulatory compliance for global launch preparation.

---

## Multi-Currency Support

### Supported Currencies

| Currency | Code | Region | Min. Booking Fee |
|----------|------|--------|------------------|
| Swiss Franc | CHF | Switzerland, Liechtenstein | CHF 1.45 |
| Euro | EUR | Eurozone countries | €1.35 |
| US Dollar | USD | United States, Canada | $1.30 |
| British Pound | GBP | United Kingdom | £1.15 |
| Polish Złoty | PLN | Poland | zł6.50 |
| Czech Koruna | CZK | Czech Republic | 38 Kč |
| Swedish Krona | SEK | Sweden | 17 kr |
| Danish Krone | DKK | Denmark | 10 kr |
| Norwegian Krone | NOK | Norway | 18 kr |

### Fee Calculation Strategy

BCUTZ uses a **dynamic fee model** that ensures a minimum net revenue of approximately **CHF 1.00** after all payment processing fees, regardless of:

- Customer's payment method (Card, PayPal, Klarna, TWINT)
- Customer's location (domestic or international)
- Currency conversion fees

**Formula:**
```
bookingFee = (minPlatformFee + fixedFee + servicePrice × feeRate) ÷ (1 - feeRate)
```

Where:
- `minPlatformFee`: Currency-equivalent of CHF 1.00
- `fixedFee`: Stripe's fixed fee per currency
- `feeRate`: 4.99% (3.49% base + 1.5% international surcharge)

---

## Payment Methods by Region

| Region | Available Methods |
|--------|-------------------|
| Switzerland | Card, TWINT, PayPal, Klarna |
| Eurozone | Card, PayPal, Klarna, SEPA |
| UK | Card, PayPal, Klarna |
| Nordics | Card, PayPal, Klarna |
| USA/Canada | Card, PayPal |
| Other | Card |

---

## Regulatory Compliance

### Data Protection (GDPR/DSG)

- **Data Minimization**: Only collect necessary personal data
- **Consent**: Explicit consent for marketing communications
- **Right to Erasure**: Users can delete their accounts
- **Data Portability**: Users can export their data
- **Breach Notification**: 72-hour notification requirement

### PCI DSS Compliance

BCUTZ is **PCI DSS compliant** through Stripe:
- No credit card data stored on BCUTZ servers
- All payment data handled by Stripe (PCI Level 1 certified)
- Tokenization for recurring customers

### Consumer Protection

#### Switzerland (OR/DSG)
- 14-day cooling-off period for distance contracts
- Clear pricing disclosure (service + booking fee)
- Cancellation policy clearly stated

#### EU (Consumer Rights Directive)
- 14-day withdrawal right
- Pre-contractual information requirements
- Clear total price including all fees

#### UK (Consumer Contracts Regulations)
- 14-day cancellation period
- Clear pricing and fee disclosure
- Digital content confirmation

---

## Tax Considerations

### VAT/MWST Requirements

| Country | VAT Rate | Threshold | Notes |
|---------|----------|-----------|-------|
| Switzerland | 8.1% | CHF 100k global | Registration required above threshold |
| Germany | 19% | €10k EU distance sales | EU OSS scheme available |
| France | 20% | €10k EU distance sales | EU OSS scheme available |
| UK | 20% | £85k UK sales | Separate post-Brexit rules |

### Platform vs. Marketplace Model

BCUTZ operates as a **marketplace/platform**:
- Barbers are independent service providers
- BCUTZ facilitates bookings and payments
- Service VAT handled by individual barbers
- Platform fees may be subject to VAT depending on barber's status

---

## Anti-Money Laundering (AML)

### KYC Requirements

Via Stripe Connect, all barbers must:
1. Verify identity (government ID)
2. Provide business information
3. Confirm bank account ownership

### Transaction Monitoring

- Stripe handles transaction monitoring
- Large/unusual transactions flagged automatically
- BCUTZ reserves right to suspend accounts

---

## Terms of Service Requirements

Each region requires specific disclosures:

### Mandatory Disclosures

1. **Company Information**: BCUTZ AG, Switzerland
2. **Contact Details**: Email, physical address
3. **Pricing**: Clear breakdown of service + booking fees
4. **Cancellation Policy**: Timeframes and refund conditions
5. **Dispute Resolution**: Platform policies, escalation to Swiss authorities
6. **Governing Law**: Swiss law, with local consumer protection rights

---

## Expansion Checklist

### Before Launching in a New Country:

- [ ] Verify Stripe availability and payment methods
- [ ] Research local consumer protection laws
- [ ] Update Terms of Service for local requirements
- [ ] Configure currency and fee structure
- [ ] Translate key legal documents
- [ ] Set up local customer support (language)
- [ ] Register for tax if threshold exceeded
- [ ] Update privacy policy for local regulations

---

## Technical Implementation

### Currency Detection

1. **User Profile**: Stored preferred currency in `profiles.region`
2. **Browser Locale**: Fallback using `navigator.language`
3. **IP Geolocation**: Optional for new users
4. **Manual Selection**: User can override in settings

### Fee Calculator Location

- Frontend: `src/lib/feeCalculator.ts`
- Backend: `supabase/functions/create-booking-checkout/index.ts`

### Stripe Configuration

- Adaptive Pricing: Enabled for automatic currency conversion
- Cross-border fees: Handled by fee calculator buffer
- Settlement: Always in CHF to BCUTZ, local currency to barbers

---

## Contact

For compliance questions:
- **Email**: compliance@bcutz.ch
- **Legal**: legal@bcutz.ch
