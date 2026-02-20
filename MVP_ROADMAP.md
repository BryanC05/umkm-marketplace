# `MVP_ROADMAP.md` - Commerce Core Phased MVP (Web + Mobile)

## Summary
This plan defines a **phased ongoing MVP roadmap** focused on **commerce core** features for both web and mobile, with **Go backend as canonical**.

Primary outcomes:
- Increase order completion rate.
- Improve repeat purchase behavior.
- Reduce buyer/seller friction after checkout.
- Standardize feature delivery across web and mobile.

This plan should be written to the repo root as: `MVP_ROADMAP.md`.

## Delivery Model
- Cadence: 2-week sprints, rolling phases.
- Backend source of truth: `go-backend`.
- Node backend: fallback/reference only, no new feature ownership.
- Release strategy: each phase independently shippable behind feature flags.

## MVP Scope (Phased Ongoing)

## Phase 0: Platform Readiness (Sprint 0)
- Lock API contract conventions for IDs and payloads.
- Add API error envelope consistency and trace IDs.
- Add notification/event scaffolding in backend.
- Add analytics event taxonomy shared by web/mobile.
- Add feature flags for each phase.

## Phase 1: Reviews and Ratings (Sprints 1-2)
- Buyers can review products and sellers after verified purchase.
- Product detail and seller store show rating distribution and review list.
- Sellers can view review insights in dashboard.
- Add basic abuse protection: one review per delivered order item, edit window, report flow.

## Phase 2: Order Notifications (Sprints 3-4)
- In-app notification center (web + mobile).
- Mobile push notifications for order state transitions.
- Unread badge and mark-read behavior.
- Notification deep links to order details/chat.

## Phase 3: Pickup/Delivery Scheduling + Timeline (Sprints 5-6)
- Buyer chooses preferred pickup/delivery slot at checkout.
- Seller confirms/adjusts schedule.
- Order timeline UI on web/mobile with status + timestamps.
- Optional seller "ready for pickup" checkpoint before delivered.

## Phase 4: Payment Integration v1 (Sprints 7-8)
- Integrate one gateway for Indonesia (default: Midtrans).
- Support COD + gateway digital payment.
- Payment status reconciliation via webhook.
- Order state gating by payment state where applicable.

## Public APIs / Interfaces / Types

## New/Updated API Endpoints
- `POST /api/reviews`
- `GET /api/reviews/product/:productId`
- `GET /api/reviews/seller/:sellerId`
- `PATCH /api/reviews/:reviewId`
- `DELETE /api/reviews/:reviewId`
- `POST /api/reviews/:reviewId/report`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/notifications/unread-count`
- `POST /api/devices/register`
- `DELETE /api/devices/:token`
- `PATCH /api/orders/:id/schedule`
- `PATCH /api/orders/:id/schedule/confirm`
- `GET /api/orders/:id/timeline`
- `POST /api/payments/intent`
- `GET /api/payments/:orderId/status`
- `POST /api/webhooks/payments/midtrans`

## WebSocket/Event Additions
- `notification:new`
- `notification:read`
- `order:timeline-updated`
- `payment:status-changed`

## Data Model Additions
- `reviews` collection:
- fields: `_id`, `orderId`, `productId`, `sellerId`, `buyerId`, `rating`, `comment`, `images`, `createdAt`, `updatedAt`, `status`.
- `notifications` collection:
- fields: `_id`, `userId`, `type`, `title`, `body`, `entityType`, `entityId`, `isRead`, `readAt`, `meta`, `createdAt`.
- `device_tokens` collection:
- fields: `_id`, `userId`, `platform`, `token`, `appVersion`, `lastSeenAt`.
- order extensions:
- `schedule`: `type`, `requestedSlot`, `confirmedSlot`, `timezone`.
- `timeline`: array of `status`, `at`, `by`, `note`.
- `payment`: `method`, `provider`, `providerRef`, `status`, `paidAt`, `amount`.

## Backend Work Plan (`go-backend`)
- Add handlers/services/models for reviews, notifications, scheduling, payments.
- Add validation and authorization middleware checks:
- review only after delivered order and only buyer.
- seller-only schedule confirmation.
- webhook signature verification.
- Add indexes:
- reviews by `(productId, createdAt desc)` and `(sellerId, createdAt desc)`.
- notifications by `(userId, isRead, createdAt desc)`.
- Add background jobs:
- push dispatch retry.
- stale schedule reminder notifications.
- Add observability:
- structured logs with request ID.
- metrics for notification delivery and payment webhook success.

## Web Work Plan (`frontend`)
- Product detail:
- review summary, review list, submit/edit review modal.
- Seller store:
- seller-level review block.
- Orders:
- timeline UI and schedule selection/confirmation.
- Global:
- notification bell, unread badge, notification drawer.
- Checkout:
- payment method chooser and payment status handling.
- Analytics events:
- `review_submitted`, `notification_opened`, `schedule_selected`, `payment_initiated`, `payment_completed`.

## Mobile Work Plan (`mobile`)
- Product detail screen:
- review summary/list + submit flow.
- Orders screen:
- schedule and timeline cards.
- Global header:
- notification icon + unread count.
- Notifications screen:
- grouped list with deep-link navigation.
- Push integration:
- Expo push token registration and refresh flow.
- Checkout screen:
- payment initiation and status polling/refresh.
- Analytics parity with web events.

## Non-Functional Requirements
- P95 API latency for read endpoints < 300ms at expected MVP load.
- Push notification enqueue success rate > 99%.
- Payment webhook idempotency guaranteed.
- Zero data loss for order timeline writes.
- Feature flags allow immediate rollback per phase.

## Testing and Scenarios

## Backend Tests
- Unit tests:
- review eligibility, duplicate review rejection, rating aggregation.
- notification read/unread transitions.
- schedule slot validation and transition rules.
- payment webhook signature + idempotency.
- Integration tests:
- create order -> deliver -> submit review.
- order status update -> notification created -> unread count increments.
- payment success webhook -> order payment/status updates.

## Web Tests
- Component tests:
- review widgets, notification drawer, timeline components.
- E2E:
- buyer places order, receives updates, leaves review.
- seller confirms schedule and sees timeline reflect changes.
- payment flow success and failure states.

## Mobile Tests
- Screen tests:
- notification list rendering and deep links.
- order timeline and schedule forms.
- Integration:
- push token register path and in-app notification state refresh.
- Manual device matrix:
- Android + iOS push receipt and navigation behavior.

## Acceptance Criteria by Phase
- Phase 1:
- buyer can create one review per delivered order item.
- average product rating appears on web/mobile product detail.
- seller dashboard displays review count and average.
- Phase 2:
- notification center available on web/mobile.
- order status changes generate notifications within 5s.
- unread badge updates in near real time.
- Phase 3:
- buyer selects slot during checkout.
- seller can confirm/adjust slot.
- timeline visible to both parties with timestamped events.
- Phase 4:
- payment intent created and completed for gateway flow.
- webhook marks payment status correctly.
- order progression honors payment constraints.

## Rollout Plan
- Enable features per cohort:
- internal users -> 10% sellers -> 50% -> 100%.
- Monitor:
- order completion rate.
- notification CTR/open rate.
- review submission rate post-delivery.
- payment success/failure ratio.
- Rollback:
- disable feature flag.
- preserve existing order/chat core flow.

## Risks and Mitigations
- Push deliverability variance across devices:
- mitigation: in-app notification fallback + retry queue.
- Payment webhook race/duplication:
- mitigation: idempotency keys and state machine guards.
- Review abuse/spam:
- mitigation: eligibility checks, rate limits, report queue.
- Dual backend drift:
- mitigation: no net-new feature on Node track.

## File Creation Plan (Root)
- Create `MVP_ROADMAP.md` at repo root.
- Populate sections exactly as defined in this plan.
- Link `README.md` "Future Enhancements" section to `MVP_ROADMAP.md`.

## Assumptions and Defaults Chosen
- Planning horizon: **phased ongoing**.
- Launch focus: **commerce core**.
- Canonical backend: **Go backend**.
- Target roadmap filename: `MVP_ROADMAP.md`.
- Payment provider default: **Midtrans**.
- Mobile push default: **Expo push notifications**.
- Web push default: **in-app notifications first**, browser push optional later.
