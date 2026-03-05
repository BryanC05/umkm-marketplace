# Centralized n8n Automation Architecture

This document outlines how the MSME Marketplace integrates with [n8n](https://n8n.io/) to provide automated workflows (like email notifications) for buyers and sellers.

## Architecture Overview

Instead of requiring every seller to host and manage their own n8n instance, the platform operates a **Centralized Webhook Architecture**.

1. **Platform Operator** runs a single, centralized instance of n8n.
2. **Sellers** use the Marketplace's Frontend "Automation Dashboard" to simply turn predefined automations (like "Order Confirmations") ON or OFF.
3. **Backend** checks if a seller has opted-in. If yes, it fires a highly-detailed JSON payload to the *central* n8n webhook URL.
4. **Central n8n** receives the payload, dynamically routes the data (e.g., sending emails to both the specific `buyer.email` and `seller.email`), and handles the execution.

This ensures zero technical overhead for sellers while allowing the platform to scale powerful automations.

---

## Configuration

### 1. n8n Instance
The platform operator must deploy n8n (e.g., via Docker, Railway, Render, etc.).
Ensure you have the exact Webhook URL for your primary workflow. It should look like this:
`https://[YOUR_N8N_DOMAIN]/webhook/[UNIQUE_UUID]`

*(Do not use the `/workflow/...` editor URL)*

### 2. Backend Environment Variable
The Go backend requires a single environment variable to know where to send automation payloads.

In your `backend/.env` file (or Railway/Vercel variables), add:
```env
N8N_WEBHOOK_URL=https://[YOUR_N8N_DOMAIN]/webhook/[UNIQUE_UUID]
```

If this variable is missing or empty, the backend gracefully skips firing the webhook.

---

## Supported Workflows

### 1. Order Confirmation (Triggered on `POST /api/orders`)
When a buyer successfully places an order, the backend checks if the Seller has an active `order_confirmation` workflow in their database record.

If active, it fires a payload to `$N8N_WEBHOOK_URL`.

#### Webhook Payload Schema
```json
{
  "event": "order.created",
  "timestamp": "2026-03-05T10:15:30Z",
  "data": {
    "orderId": "69a945...",
    "buyer": {
      "id": "69b123...",
      "name": "Budi Santoso",
      "email": "buyer@example.com"
    },
    "seller": {
      "id": "69c456...",
      "name": "Dapur Masakan Bunda",
      "email": "seller@example.com",
      "businessName": "PT Dapur Bunda"
    },
    "totalAmount": 150000,
    "status": "pending_seller_review"
  }
}
```

#### n8n Node Configuration Example
In n8n, you can parse this payload using Expressions to send dynamic emails:
- **To Email (Buyer):** `{{ $json.data.buyer.email }}`
- **To Email (Seller):** `{{ $json.data.seller.email }}`
- **Email Subject:** `New Order Received! (# {{ $json.data.orderId }})`
- **Email Body:** `Hello {{ $json.data.seller.name }}, you just received an order for Rp {{ $json.data.totalAmount }}.`

---

## Database Structure

Sellers opt into automations via the `workflows` collection in MongoDB.
When a seller toggles an automation in the UI, the frontend creates/updates a document:

```json
{
  "_id": ObjectId("..."),
  "seller": ObjectId("..."),
  "type": "order_confirmation",
  "isActive": true,
  "executionCount": 12,
  "lastExecuted": ISODate("2026-03-05T...")
}
```

The backend `webhooks.go` strictly validates `isActive: true` against the `seller` ID before firing the HTTP POST request.

---

## Troubleshooting

1. **Webhooks are not firing:**
   - Check the backend console logs. Look for `[Webhook] Central webhook omitted: N8N_WEBHOOK_URL not set`.
   - Ensure the `.env` variable exactly matches the n8n Production Webhook URL.
2. **Emails sending to fake accounts:**
   - If you are simulation testing using dummy accounts (e.g., `buyer.nearby@trolitoko.test`), n8n will attempt to send real emails to `.test` domains. Use real Gmail accounts for testing.
3. **Payload missing data:**
   - Ensure the `webhooks.go` file is correctly extracting data via `usersCollection.FindOne(...)`. Note that pointers (like `seller.BusinessName`) must be safely dereferenced before appending to the payload dictionary.
