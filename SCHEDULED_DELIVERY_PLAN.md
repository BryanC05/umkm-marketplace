# Scheduled Delivery Orders - Implementation Plan

## Overview

This document outlines the implementation plan for a new feature that allows buyers to schedule product deliveries for a specific date and time. The seller must accept/decline the request, and the buyer must confirm before payment is processed.

## Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SCHEDULED DELIVERY ORDER FLOW                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   BUYER                         SELLER                         SYSTEM               │
│   ─────                         ──────                         ──────               │
│                                                                                      │
│   1. Select products                                                               │
│   2. Choose delivery date                                                          │
│   3. Choose delivery time                                                          │
│   4. Add notes                                                                     │
│   5. Submit request ──────────────►  ORDER CREATED                                 │
│                                    (status: pending_seller_review)                  │
│                                    (deadline: +24 hours)                            │
│                                                                          │           │
│   WAITING                     6. Review request                            │           │
│   FOR SELLER                  7. Choose action:                            │           │
│   RESPONSE                        • Accept                                  │           │
│                                    • Decline                                 │           │
│                                    • Request changes                         │           │
│                                    ◄─────────────────── 8. Submit response           │
│                                                                                      │
│                                                                          │           │
│   9. See seller response      ◄──────────────────── 10. Response submitted         │
│       • Accepted:                                                               │           │
│         Show "Confirm & Pay"                                                   │           │
│       • Declined:                                                              │           │
│         Show "Order Declined"                                                  │           │
│       • Request changes:                                                       │           │
│         Show new terms, confirm or cancel                                     │           │
│                                                                          │           │
│   11. Confirm & Pay ─────────────────────────────────────────────────► 12. Process  │
│       (Payment only available after both parties agree)                          │
│                                                                          │           │
│   13. Order confirmed         ◄──────────────────── 14. Order confirmed           │
│        → normal order flow                                                        │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Order Status & Request Status

### Order Status (existing)
| Status | Description |
|--------|-------------|
| `pending` | Initial status for normal orders |
| `confirmed` | Order confirmed, preparing |
| `preparing` | Seller preparing order |
| `ready` | Order ready for pickup/delivery |
| `delivered` | Order delivered |
| `cancelled` | Order cancelled |

### Request Status (new)
| Status | Description | Who Actions |
|--------|-------------|-------------|
| `""` (empty) | Normal order (no scheduling) | - |
| `pending_seller_review` | Awaiting seller decision | Seller |
| `seller_accepted` | Seller accepted, waiting buyer confirm | Buyer |
| `seller_declined` | Seller declined the request | Buyer |
| `awaiting_buyer_confirm` | Seller requested changes, waiting buyer | Buyer |

### Seller Actions
| Action | New Request Status | Notes |
|--------|-------------------|-------|
| `accept` | `seller_accepted` | - |
| `decline` | `seller_declined` | Optional reason |
| `request_changes` | `awaiting_buyer_confirm` | Required reason |

---

## Data Models

### Order Model Changes (Go Backend)

```go
// go-backend/internal/models/order.go

// Existing fields to repurpose
IsPreorder   bool   `bson:"isPreorder" json:"isPreorder"`   // repurposed: is scheduled delivery
PreorderTime string `bson:"preorderTime" json:"preorderTime"` // repurposed: delivery time "19:00"

// New fields to add
DeliveryDate        string    `bson:"deliveryDate" json:"deliveryDate"`         // "2026-02-25"
DeliveryNotes       string    `bson:"deliveryNotes" json:"deliveryNotes"`       // buyer notes
RequestStatus       string    `bson:"requestStatus" json:"requestStatus"`        // see RequestStatus table
RequestDeadline     time.Time `bson:"requestDeadline" json:"requestDeadline"`   // 24h from creation
SellerResponseNotes string    `bson:"sellerResponseNotes" json:"sellerResponseNotes"` // seller reason
BuyerConfirmed      bool      `bson:"buyerConfirmed" json:"buyerConfirmed"`     // buyer confirmed terms
```

### API Request/Response Schemas

#### Create Order Request (additions)
```json
{
  "products": [...],
  "deliveryAddress": {...},
  "deliveryType": "delivery",
  "paymentMethod": "qris",
  "notes": "Gift wrap please",
  // NEW FIELDS
  "deliveryDate": "2026-02-25",
  "deliveryTime": "19:00",
  "deliveryNotes": "Leave at door"
}
```

#### Seller Response Request
```json
{
  "action": "accept|decline|request_changes",
  "notes": "Sorry, we close at 6pm on that day. Can you do 5pm?"
}
```

#### Buyer Confirm Request
```json
{
  "confirm": true
}
```

---

## Backend Implementation

### 1. Update Order Model

**File**: `go-backend/internal/models/order.go`

Add these fields to the Order struct:
- `DeliveryDate` (string)
- `DeliveryNotes` (string)  
- `RequestStatus` (string)
- `RequestDeadline` (time.Time)
- `SellerResponseNotes` (string)
- `BuyerConfirmed` (bool)

Repurpose existing fields:
- `IsPreorder` → used for scheduled delivery flag
- `PreorderTime` → used for delivery time

### 2. Update CreateOrder Handler

**File**: `go-backend/internal/handlers/orders.go`

**Function**: `CreateOrder`

**Changes**:
1. Accept new fields in request: `deliveryDate`, `deliveryTime`, `deliveryNotes`
2. Validate:
   - `deliveryDate` must be within 30 days from now
   - `deliveryTime` must be valid time format "HH:MM"
   - If any scheduling field provided, require all (date + time)
3. If scheduling provided:
   - Set `IsPreorder = true`
   - Set `PreorderTime = deliveryTime`
   - Set `DeliveryDate = deliveryDate`
   - Set `DeliveryNotes = deliveryNotes`
   - Set `RequestStatus = "pending_seller_review"`
   - Set `RequestDeadline = time.Now().Add(24 * time.Hour)`
   - Set `Status = "pending_seller_review"`
4. If no scheduling:
   - Keep existing behavior (`Status = "pending"`, `RequestStatus = ""`)

### 3. Add Seller Response Endpoint

**File**: `go-backend/internal/handlers/orders.go`

**New Endpoint**: `PUT /api/orders/:id/seller-response`

**Handler**: `SellerResponse`

```go
func (h *OrderHandler) SellerResponse(c *gin.Context) {
    // Validate user is seller of this order
    // Validate order.RequestStatus == "pending_seller_review"
    // Validate action is valid (accept|decline|request_changes)
    // If action == request_changes, notes are required
    
    // Update order:
    // - RequestStatus based on action
    // - SellerResponseNotes = notes
    // - If accept: Status = "seller_accepted" (special status for UI)
    // - If decline: Status = "cancelled", RequestStatus = "seller_declined"
    
    // Create notification for buyer
    
    // Return updated order
}
```

### 4. Add Buyer Confirm Endpoint

**File**: `go-backend/internal/handlers/orders.go`

**New Endpoint**: `PUT /api/orders/:id/buyer-confirm`

**Handler**: `BuyerConfirm`

```go
func (h *OrderHandler) BuyerConfirm(c *gin.Context) {
    // Validate user is buyer of this order
    // Validate order.RequestStatus == "seller_accepted" or "awaiting_buyer_confirm"
    
    // Update order:
    // - BuyerConfirmed = true
    // - RequestStatus = "" (normal order flow)
    // - Status = "pending" (proceed to payment)
    
    // Create notification for seller
    
    // Return updated order
}
```

### 5. Add Get Orders Filter

**File**: `go-backend/internal/handlers/orders.go`

**Endpoint**: `GET /api/orders`

Add query parameter `requestStatus` to filter:
- `pending_seller_review` → seller's pending requests
- `seller_accepted` → buyer's accepted requests waiting confirmation
- `seller_declined` → buyer's declined requests

### 6. Update Order Status Update

**File**: `go-backend/internal/handlers/orders.go`

**Function**: `UpdateOrderStatus`

Prevent seller from updating status while `RequestStatus == "pending_seller_review"` (must use seller-response endpoint first).

### 7. Update Payment Flow

**File**: `go-backend/internal/handlers/orders.go`

**Function**: `UpdatePayment`

Validate before processing payment:
- If `RequestStatus` is not empty, require `BuyerConfirmed == true`
- Only allow payment when buyer has confirmed (or no scheduling)

### 8. Background Task - Auto-Decline Expired Requests

**File**: `go-backend/internal/handlers/orders.go`

**New Function**: `CleanupExpiredRequests` (call via cron)

```go
func (h *OrderHandler) CleanupExpiredRequests() {
    // Find orders where:
    // - RequestStatus == "pending_seller_review"
    // - RequestDeadline < now()
    
    // For each:
    // - RequestStatus = "seller_declined"
    // - Status = "cancelled"
    // - DeliveryNotes = "Auto-declined: seller did not respond in time"
    // - Notify buyer
}
```

### 9. Notification Reminders

**File**: `go-backend/internal/handlers/notifications.go` (or existing notification handler)

**Function**: `SendDeadlineReminders`

- Run every hour via cron
- Find orders where `RequestDeadline - 6 hours < now()` and `RequestStatus == "pending_seller_review"`
- Send push notification to seller: "You have a delivery request pending. X hours left to respond."

---

## Mobile App Implementation (React Native / Expo)

### 1. CartScreen Updates

**File**: `mobile/src/screens/cart/CartScreen.js`

**New Components**:
- `DateTimePickerSection` - collapsed by default
  - Toggle to enable scheduled delivery
  - Date picker (min: tomorrow, max: +30 days)
  - Time picker (24h or 12h format based on locale)
  - Notes textarea for delivery instructions

**UI Flow**:
```
[ ] Schedule for later
    ▼
┌─────────────────────────────┐
│ Delivery Date    [📅 Pick] │
│ Delivery Time    [🕐 Pick] │
│ Notes (optional)            │
│ [                        ] │
└─────────────────────────────┘
```

**Validation**:
- All 3 fields required if schedule enabled
- Show warning if date is today (rush order)

**Submission**:
- If scheduled: button shows "Send Request" instead of "Place Order"
- Show confirmation modal explaining seller must approve

### 2. Order Success/Status Screen

**File**: `mobile/src/screens/orders/OrderSuccessScreen.js` (or new screen)

**New States**:
- `pending_seller_review`: "Request sent! Waiting for seller to approve"
- `seller_accepted`: "Seller approved! Please confirm and pay to complete order"
- `seller_declined`: "Seller declined. Contact seller for details"
- `awaiting_buyer_confirm`: "Seller requested changes. Review and confirm"

### 3. Buyer Orders Screen

**File**: `mobile/src/screens/orders/OrdersScreen.js`

**New Tabs/Filter**:
- Add "Pending Requests" tab for orders with `RequestStatus == "pending_seller_review"`
- Add "Awaiting Confirmation" tab for `RequestStatus == "seller_accepted"`

**Order Card Updates**:
- Show scheduled delivery info: 📅 Feb 25 at 19:00
- Show countdown if pending: "Seller has X hours to respond"
- Show status badge: "Waiting for Approval" / "Awaiting Your Confirmation"

### 4. Buyer Order Detail

**File**: `mobile/src/screens/orders/OrderDetailScreen.js`

**New Sections**:

```
┌────────────────────────────────────────┐
│  SCHEDULED DELIVERY                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  📅 Date: Thursday, Feb 25, 2026       │
│  🕐 Time: 7:00 PM                      │
│  📝 Notes: Leave at door please        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  REQUEST STATUS                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  ⏳ Pending Seller Review               │
│     Seller has 18 hours to respond     │
│                                         │
│  [ 💬 Chat with Seller ]               │
└────────────────────────────────────────┘
```

**Actions based on RequestStatus**:
- `pending_seller_review`: Show "Cancel Request" button
- `seller_accepted`: Show "Confirm & Pay" button (PRIMARY)
- `seller_declined`: Show "Contact Seller" button
- `awaiting_buyer_confirm`: Show "Accept New Terms" / "Decline" buttons

### 5. Seller Orders Screen

**File**: `mobile/src/screens/seller/SellerOrdersScreen.js`

**New Tabs**:
- "Pending Requests" → `RequestStatus == "pending_seller_review"`
- "Awaiting Buyer" → `RequestStatus == "seller_accepted"`

**Order Card**:
```
┌────────────────────────────────────────┐
│ 🔔 NEW REQUEST                         │
│ ───────────────────────────────────    │
│ 📦 2 items • Rp 150.000               │
│ 📅 Feb 25, 2026 at 7:00 PM            │
│ 📝 Leave at door                       │
│                                         │
│ ⏰ Respond within: 18:32               │
│                                         │
│ [Accept] [Decline] [ 💬 Chat ]        │
└────────────────────────────────────────┘
```

### 6. Seller Order Detail

**File**: `mobile/src/screens/seller/SellerOrderDetailScreen.js`

**New Section**:
```
┌────────────────────────────────────────┐
│  DELIVERY SCHEDULE                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  📅 Thursday, Feb 25, 2026             │
│  🕐 7:00 PM                            │
│  📝 Notes: Leave at door please        │
│                                         │
│  ⏰ You have 18 hours to respond       │
└────────────────────────────────────────┘
```

**Actions** (if `RequestStatus == "pending_seller_review"`):
- [ ✅ Accept ] [ ❌ Decline ] [ 💬 Request Changes ]

**Request Changes Modal**:
```
┌────────────────────────────────────────┐
│  REQUEST CHANGES                       │
│  ──────────────────────────────────    │
│  Reason for changes (required):        │
│  [                                ]    │
│                                         │
│  [Cancel]              [Send Request]  │
└────────────────────────────────────────┘
```

### 7. Chat Integration

**File**: `mobile/src/screens/chat/ChatScreen.js`

**Behavior**:
- Chat room automatically created when order created (existing)
- Chat always accessible from order detail
- Messages preserved even after order completed/cancelled
- Add "negotiation" tag to differentiate from regular order chat

**Notification Badge**:
- Show unread count on order cards during negotiation phase

### 8. Notifications

**File**: `mobile/src/services/NotificationService.js`

**Push Notification Types**:
- `SCHEDULED_ORDER_REQUEST`: New scheduled order from buyer
- `SELLER_RESPONSE`: Seller accepted/declined/request changes
- `BUYER_CONFIRMATION`: Buyer confirmed after seller accepted
- `REQUEST_DEADLINE_REMINDER`: 6 hours before deadline

**In-App Notifications**:
- Bell icon in header
- List view with all notifications

---

## Web Implementation (Frontend)

### 1. Cart/Checkout Page

**File**: `frontend/src/pages/CheckoutPage.js` (or similar)

**New Component**: `<ScheduledDeliveryForm />`

- Toggle switch for scheduled delivery
- Date picker with constraints (tomorrow to +30 days)
- Time picker with 30-minute intervals
- Notes textarea
- Validation messages

### 2. Order Pages

**File**: `frontend/src/pages/OrdersPage.js`

**Tabs**:
- All Orders
- Pending Requests (new)
- Awaiting Confirmation (new)

### 3. Order Detail Page

**File**: `frontend/src/pages/OrderDetailPage.js`

**Buyer View**:
- Scheduled delivery card with all details
- Request status badge
- Action buttons based on status
- Chat button

**Seller View**:
- Delivery schedule card
- Countdown timer
- Accept/Decline/Request Changes buttons
- Response notes input

### 4. Seller Dashboard

**File**: `frontend/src/pages/SellerDashboard.js`

**New Section**: "Pending Delivery Requests"
- List of orders with `RequestStatus == "pending_seller_review"`
- Quick action buttons
- Deadline countdown

### 5. Web Chat

**File**: `frontend/src/components/Chat/ChatBox.js`

- Persistent chat panel on order detail
- Message history always accessible
- Typing indicators
- Read receipts

---

## Database Changes

### MongoDB Indexes

**File**: `go-backend/internal/database/indexes.go`

```go
// Add index for efficient queries
ordersCollection.Indexes().CreateOne(
    context.Background(),
    mongo.IndexModel{
        Keys: bson.D{
            {"seller", 1},
            {"requestStatus", 1},
        },
    },
)

ordersCollection.Indexes().CreateOne(
    context.Background(),
    mongo.IndexModel{
        Keys: bson.D{
            {"buyer", 1},
            {"requestStatus", 1},
        },
    },
)

// Compound index for deadline cleanup
ordersCollection.Indexes().CreateOne(
    context.Background(),
    mongo.IndexModel{
        Keys: bson.D{
            {"requestStatus", 1},
            {"requestDeadline", 1},
        },
    },
)
```

---

## Testing Checklist

### Backend
- [ ] Create scheduled order with valid date/time
- [ ] Create scheduled order with past date (should fail)
- [ ] Create scheduled order > 30 days (should fail)
- [ ] Seller accepts request
- [ ] Seller declines request
- [ ] Seller requests changes
- [ ] Buyer confirms after accept
- [ ] Buyer declines after request changes
- [ ] Payment fails if buyer not confirmed
- [ ] Auto-decline after 24 hours
- [ ] Get orders filtered by requestStatus

### Mobile
- [ ] Date picker shows correct range
- [ ] Time picker format correct
- [ ] Submit request shows confirmation
- [ ] Seller sees pending request
- [ ] Countdown timer works
- [ ] Accept/decline updates UI
- [ ] Chat accessible during negotiation
- [ ] Push notifications received

### Web
- [ ] Same flows as mobile
- [ ] Responsive design
- [ ] Real-time updates

---

## Edge Cases

1. **Seller accepts, buyer doesn't confirm**: Order stays in "seller_accepted" until buyer confirms or 24h passes (could auto-cancel or keep as pending)
2. **Seller requests changes, buyer doesn't respond**: Auto-cancel after 24h from request_changes status
3. **Multiple scheduled orders to same seller**: Show all in pending, seller can accept/decline individually
4. **Product out of stock after scheduling**: Seller can decline with reason, stock check happens on accept
5. **Chat during decline**: Allow chat even after decline for customer service

---

## Rollout Plan

### Phase 1: Backend Only
- [ ] Update models
- [ ] Implement API endpoints
- [ ] Add background jobs
- [ ] Test with Postman

### Phase 2: Mobile Beta
- [ ] Update CartScreen
- [ ] Add order status screens
- [ ] Seller order screens
- [ ] Test with internal team

### Phase 3: Web Beta
- [ ] Checkout page updates
- [ ] Order management pages
- [ ] Seller dashboard updates

### Phase 4: Full Release
- [ ] Enable feature flag
- [ ] Monitor metrics
- [ ] Collect feedback
- [ ] Fix issues

---

## Related Files

### Backend
- `go-backend/internal/models/order.go`
- `go-backend/internal/handlers/orders.go`
- `go-backend/internal/database/indexes.go`

### Mobile
- `mobile/src/screens/cart/CartScreen.js`
- `mobile/src/screens/orders/OrdersScreen.js`
- `mobile/src/screens/orders/OrderDetailScreen.js`
- `mobile/src/screens/seller/SellerOrdersScreen.js`
- `mobile/src/screens/seller/SellerOrderDetailScreen.js`
- `mobile/src/screens/chat/ChatScreen.js`
- `mobile/src/services/NotificationService.js`

### Web (Frontend)
- `frontend/src/pages/CheckoutPage.js`
- `frontend/src/pages/OrdersPage.js`
- `frontend/src/pages/OrderDetailPage.js`
- `frontend/src/pages/SellerDashboard.js`
- `frontend/src/components/Chat/ChatBox.js`
