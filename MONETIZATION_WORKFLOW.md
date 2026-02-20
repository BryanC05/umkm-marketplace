# Monetization Workflow and Pricing Demonstration (Commerce Core, Web + Mobile)

## Summary
This plan defines a decision-complete monetization system for your marketplace using:
- Primary model: **Hybrid** (transaction commission + seller subscription + promoted listings + optional paid image enhancement).
- Market basis: **Indonesia SME** pricing in IDR.
- Fee policy: **Split by method** (seller absorbs digital MDR, buyer optional convenience fee only where legally/commercially appropriate).

This aligns with your roadmap (`MVP_ROADMAP.md`) and Midtrans payment direction.

## Glossary of Metrics and Terms
- **AOV (Average Order Value)**: Average paid value per order in a period.
  - Formula: `AOV = total paid order value / number of paid orders`
- **GMV (Gross Merchandise Value)**: Total gross value of completed/paid merchandise sales before platform deductions.
  - Formula: `GMV = sum of merchandise order values`
- **MRR (Monthly Recurring Revenue)**: Monthly recurring subscription revenue from seller plans.
- **ARPU (Average Revenue Per User)**: Average monetization revenue per seller (or buyer, depending on segment) in a period.
  - Formula (seller ARPU): `seller monetization revenue / active sellers`
- **Take Rate**: Platform monetization revenue divided by GMV.
  - Formula: `take rate = platform revenue / GMV`
- **MDR (Merchant Discount Rate)**: Payment processing fee percentage charged on digital payment amount.
- **CPC (Cost Per Click)**: Amount billed for each valid ad/promoted listing click.
- **Commission Base**: Item subtotal after seller discount, excluding shipping and taxes unless explicitly included by policy.
- **Platform Commission**: Fee charged by platform per order based on seller plan rate.
- **Seller Payout**: Net amount transferred to seller after deductions and adjustments.
- **Refund Adjustment**: Reversal amount applied to previously recognized fees/payouts for full or partial refunds.
- **Convenience Fee**: Optional buyer-facing fee added at checkout (subject to legal/commercial policy).
- **Subscription Proration**: Partial-month charge or credit when seller upgrades/downgrades mid-cycle.
- **Idempotency**: Guarantee that duplicate webhook/event processing does not create duplicate ledger effects.
- **T+1 / T+2 Payout**: Payout settlement one or two days after order/payment eligibility date.

## Monetization Workflow (End-to-End)
1. Seller onboarding and plan assignment:
   - New sellers default to `Starter` plan.
   - Seller can upgrade to `Growth` or `Pro` in-app.
2. Product listing and traffic options:
   - Seller can run promoted listing campaigns with capped daily budget.
   - Seller can use image enhancement quota; over-quota usage is billed.
3. Checkout fee calculation:
   - Compute commission based on seller plan.
   - Compute payment MDR based on payment method.
   - Exclude shipping from commission base.
4. Payment intent creation:
   - Save fee breakdown snapshot at intent creation for auditability.
5. Webhook confirmation:
   - On successful webhook, lock monetization ledger entry and order payment state.
6. Fulfillment and refund handling:
   - Full/partial refunds trigger proportional fee reversal rules.
7. Seller payout:
   - Payout generated at T+1/T+2 from net eligible balance.
8. Subscription billing cycle:
   - Monthly recurring charge with proration on upgrade/downgrade.
9. Reporting:
   - Seller sees payout statement and fee breakdown per order.
   - Platform sees GMV, take rate, MRR, ad revenue, and margin.
10. Controls and risk:
   - Idempotent webhook processing.
   - Fraud/risk flags for abnormal refund and ad-spend behavior.

## Pricing Model (IDR)
| Item | Starter | Growth | Pro |
|---|---:|---:|---:|
| Monthly fee | Rp0 | Rp79,000 | Rp199,000 |
| Commission rate | 2.5% | 2.0% | 1.5% |
| Promoted listing access | Yes | Yes | Yes |
| Image enhancement included | 20 images/mo | 200 images/mo | 1,000 images/mo |

| Payment Method | MDR (seller-paid) |
|---|---:|
| QRIS | 0.7% |
| Virtual Account | 1.5% |
| E-Wallet | 1.7% |
| COD | 0.0% |

| Add-on | Price |
|---|---:|
| Promoted listing CPC floor | Rp400/click |
| Promoted listing daily min budget | Rp20,000/day |
| Image enhancement over-quota | Rp500/image |

## Fee Formulas (Canonical)
1. `commission_base = item_subtotal_after_seller_discount`
2. `platform_commission = commission_base * plan_commission_rate`
3. `payment_fee = paid_amount * method_mdr_rate`
4. `seller_payout = commission_base - platform_commission - payment_fee - refund_adjustment`
5. `platform_order_revenue = platform_commission + buyer_convenience_fee_if_any`

## Price Demonstration
### Per-order examples
| Case | Plan | Method | Commission Base | Commission | MDR | Seller Payout |
|---|---|---|---:|---:|---:|---:|
| A | Starter | E-Wallet | Rp100,000 | Rp2,500 | Rp1,700 | Rp95,800 |
| B | Growth | VA | Rp250,000 | Rp5,000 | Rp3,750 | Rp241,250 |
| C | Pro | COD | Rp400,000 | Rp6,000 | Rp0 | Rp394,000 |

### Monthly demonstration (illustrative)
Assumptions:
- 12,000 paid orders/month.
- AOV Rp95,000.
- GMV = Rp1,140,000,000.
- GMV share by plan: Starter 65%, Growth 25%, Pro 10%.
- 250 Growth sellers and 80 Pro sellers.
- 120 sellers run promoted listings at Rp300,000/month average.
- Paid image enhancement over-quota = 20,000 images/month.

Revenue projection:
- Commission revenue:
  - Starter: Rp741,000,000 x 2.5% = Rp18,525,000
  - Growth: Rp285,000,000 x 2.0% = Rp5,700,000
  - Pro: Rp114,000,000 x 1.5% = Rp1,710,000
  - Total commission = **Rp25,935,000**
- Subscription revenue:
  - Growth: 250 x Rp79,000 = Rp19,750,000
  - Pro: 80 x Rp199,000 = Rp15,920,000
  - Total subscription = **Rp35,670,000**
- Promoted listings:
  - 120 x Rp300,000 = **Rp36,000,000**
- Image enhancement add-on:
  - 20,000 x Rp500 = **Rp10,000,000**

Total gross monetization/month:
- **Rp107,605,000**
- Effective monetization take rate on GMV:
  - `107,605,000 / 1,140,000,000 = 9.44%`

## Important Changes to Public APIs / Interfaces / Types
### New/updated APIs
- `GET /api/monetization/plans`
- `POST /api/monetization/subscribe`
- `PATCH /api/monetization/subscription`
- `GET /api/monetization/subscription/current`
- `POST /api/payments/intent` (extend with fee snapshot fields)
- `POST /api/webhooks/payments/midtrans` (idempotent monetization posting)
- `GET /api/billing/invoices`
- `GET /api/billing/summary`
- `GET /api/payouts`
- `GET /api/payouts/:id`
- `POST /api/promotions/campaigns`
- `PATCH /api/promotions/campaigns/:id`
- `GET /api/promotions/campaigns/:id/performance`
- `GET /api/ledger/orders/:orderId`

### Type additions (canonical, Go/backend DTO aligned)
```ts
type SellerPlan = 'starter' | 'growth' | 'pro';
type PaymentMethod = 'qris' | 'va' | 'ewallet' | 'cod';

interface FeeSnapshot {
  plan: SellerPlan;
  commissionRateBps: number;
  paymentMethod: PaymentMethod;
  paymentFeeBps: number;
  commissionBase: number;
  platformCommission: number;
  paymentFee: number;
  buyerConvenienceFee: number;
  currency: 'IDR';
}

interface LedgerEntry {
  id: string;
  orderId: string;
  sellerId: string;
  type: 'commission' | 'payment_fee' | 'subscription' | 'ads' | 'image_enhancement' | 'refund_adjustment' | 'payout';
  amount: number;
  status: 'pending' | 'posted' | 'reversed';
  referenceId?: string;
  createdAt: string;
}
```

### Event additions
- `payment:status-changed`
- `monetization:fee-posted`
- `monetization:fee-reversed`
- `subscription:changed`
- `payout:generated`

## Test Cases and Scenarios
1. Commission calculation correctness by plan and payment method.
2. Intent-to-webhook fee snapshot consistency.
3. Webhook idempotency for duplicate callbacks.
4. Full refund and partial refund reversal correctness.
5. Subscription upgrade proration and next-cycle invoice accuracy.
6. Failed subscription charge fallback to Starter plan policy.
7. Ad campaign budget cap enforcement and spend ledger accuracy.
8. Image enhancement quota depletion and over-quota billing.
9. Payout generation excludes unpaid/canceled/refunded orders.
10. Seller statement and platform ledger totals reconcile daily.

## Rollout and Monitoring
1. Rollout by cohort: internal sellers -> 10% -> 50% -> 100%.
2. Guardrails:
   - Hard cap on daily ad spend per seller.
   - Automatic pause on webhook error spikes.
3. Core metrics:
   - GMV, monetization take rate, MRR, ad ARPU.
   - Payment success rate, refund rate, payout delay.
   - Seller churn by plan tier.

## Assumptions and Defaults Chosen
- Primary model: **Hybrid**.
- Pricing basis: **Indonesia SME (IDR)**.
- Fee policy: **Split by method**.
- Midtrans remains payment gateway default.
- Tax handling (PPN/invoicing) is excluded from this demo math and added as a separate fiscal compliance layer.
- Shipping fee is excluded from commission base.
