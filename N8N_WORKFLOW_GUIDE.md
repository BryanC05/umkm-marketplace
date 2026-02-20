# 🔧 n8n Workflow Automation – Complete Setup Guide

> **MSME Marketplace × n8n Integration**
> Automate order confirmations, status updates, inventory alerts, and more using n8n workflow automation connected to your MSME Marketplace backend.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Architecture Overview](#2-architecture-overview)
3. [Docker Environment Setup](#3-docker-environment-setup)
4. [Starting the Services](#4-starting-the-services)
5. [Initial n8n Configuration](#5-initial-n8n-configuration)
6. [Gmail App Password Setup](#6-gmail-app-password-setup)
7. [Custom Nodes – Deep Dive](#7-custom-nodes--deep-dive)
8. [Configuring API Credentials in n8n](#8-configuring-api-credentials-in-n8n)
9. [Workflow 1: Order Confirmation Email](#9-workflow-1-order-confirmation-email)
10. [Workflow 2: Order Status Update Email](#10-workflow-2-order-status-update-email)
11. [Workflow 3: Inventory Low Alert](#11-workflow-3-inventory-low-alert)
12. [Importing Pre-Built Workflows](#12-importing-pre-built-workflows)
13. [Connecting n8n to the Marketplace Backend](#13-connecting-n8n-to-the-marketplace-backend)
14. [Using the Automation Dashboard (Frontend)](#14-using-the-automation-dashboard-frontend)
15. [Testing & Verification](#15-testing--verification)
16. [Webhook Payload Reference](#16-webhook-payload-reference)
17. [Security Best Practices](#17-security-best-practices)
18. [Production Deployment](#18-production-deployment)
19. [Advanced Workflow Ideas](#19-advanced-workflow-ideas)
20. [Troubleshooting](#20-troubleshooting)
21. [Quick Reference Commands](#21-quick-reference-commands)

---

## 1. Prerequisites

Before you begin, ensure you have the following installed and ready:

| Requirement          | Minimum Version | Check Command              |
| -------------------- | --------------- | -------------------------- |
| **Docker**           | 20.10+          | `docker --version`         |
| **Docker Compose**   | 2.0+            | `docker compose version`   |
| **Node.js**          | 18+             | `node --version`           |
| **npm**              | 9+              | `npm --version`            |
| **MongoDB**          | Running (local or Atlas) | Check `.env`      |
| **Gmail Account**    | With 2FA enabled | For SMTP email sending    |

> [!IMPORTANT]
> Your MSME Marketplace **backend** must be running on `http://localhost:5000` before n8n can communicate with it. Start it with `go run ./cmd/server` inside the `go-backend/` folder.

### Verify Backend is Running

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"OK","message":"MSME Marketplace API is running"}
```

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   MSME Marketplace                      │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Frontend │───▶│   Backend    │───▶│  MongoDB      │  │
│  │ (React)  │    │ (Go + Gin)   │    │  (Atlas/Local)│  │
│  │ :5173    │    │ :5000        │    │               │  │
│  └──────────┘    └──────┬───────┘    └───────────────┘  │
│                         │                                │
│              Webhook    │   Callback                     │
│              (POST)     │   (POST)                       │
│                         ▼                                │
│  ┌──────────────────────────────────────────────┐       │
│  │              Docker Network                   │       │
│  │                                               │       │
│  │  ┌────────────┐         ┌──────────────┐     │       │
│  │  │   n8n      │────────▶│  PostgreSQL  │     │       │
│  │  │  :5678     │         │  (n8n data)  │     │       │
│  │  │            │         └──────────────┘     │       │
│  │  │ Custom     │                               │       │
│  │  │ Nodes:     │──── SMTP ────▶ Gmail         │       │
│  │  │ - Trigger  │                               │       │
│  │  │ - Action   │                               │       │
│  │  └────────────┘                               │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### How It Works

1. **Buyer places an order** → Backend creates the order in MongoDB
2. **Go backend** finds the seller's active workflow and sends a **webhook POST** to n8n
3. **n8n receives the webhook** via the `MSME Trigger` custom node
4. **n8n executes the workflow**: sends confirmation email via SMTP (Gmail)
5. **n8n calls back** to the backend via the `MSME Action` node to update order status
6. n8n can call back to backend endpoints for status updates and post-processing

### Key Files

| File                                        | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `docker-compose.yml`                        | Defines n8n + PostgreSQL containers  |
| `n8n-custom-nodes/nodes/MsmeTrigger/`       | Webhook trigger node for n8n         |
| `n8n-custom-nodes/nodes/MsmeAction/`        | Action node (update orders, etc.)    |
| `n8n-custom-nodes/credentials/`             | MSME API credential definition       |
| `n8n-workflows/order-confirmation.json`     | Pre-built order confirmation workflow|
| `n8n-workflows/order-status-update.json`    | Pre-built status update workflow     |
| `go-backend/internal/handlers/webhooks.go`  | Receives callbacks from n8n          |
| `go-backend/internal/handlers/workflows.go` | CRUD for seller workflow configs     |
| `go-backend/internal/models/workflow.go`    | Workflow data model                  |
| `frontend/src/pages/Automation/`            | Seller automation dashboard UI       |

---

## 3. Docker Environment Setup

### 3.1 Understanding `docker-compose.yml`

Your project's `docker-compose.yml` defines two services:

```yaml
version: '3.8'

services:
  # n8n workflow automation engine
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"             # n8n web UI
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=Asia/Jakarta
      - EXECUTIONS_MODE=regular
      - DB_TYPE=postgresdb       # Uses PostgreSQL for persistence
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n_password
### 3.2 Verify Custom Nodes Directory

Ensure your `n8n-custom-nodes` directory has the correct structure (no build step needed):

```bash
ls -R n8n-custom-nodes/
# Should show:
#   package.json
#   credentials/MsmeApi.credentials.js
#   nodes/MsmeTrigger/MsmeTrigger.node.js
#   nodes/MsmeAction/MsmeAction.node.js
```

---

## 4. Starting the Services

### 4.1 Start n8n + PostgreSQL

```bash
# From the project root
cd /Users/user/OpenCode/msme-marketplace
docker-compose up -d
```

### 4.2 Verify Services Are Running

```bash
# Check container status
docker-compose ps

# Expected output:
# NAME                 STATUS          PORTS
# msme-n8n-1           Up (healthy)    0.0.0.0:5678->5678/tcp
# msme-postgres-1      Up (healthy)    5432/tcp
```

### 4.3 Wait for Initialization

n8n needs about **30 seconds** to fully initialize on first start. Monitor the logs:

```bash
# Watch logs in real-time
docker-compose logs -f n8n

# Look for these messages:
# "n8n ready on 0.0.0.0, port 5678"
# "Custom extensions loaded from: /home/node/.n8n/custom"
```

### 4.4 Open n8n Web UI

Open your browser and navigate to:

**🔗 http://localhost:5678**

On first launch, you'll be prompted to create an owner account:
- **Email**: `admin@msme.local` (or your email)
- **First Name**: `Admin`
- **Last Name**: `MSME`
- **Password**: `msme2024` (or your preferred password)

> [!CAUTION]
> Change the default password in production! The default `msme2024` is only for development.

---

## 5. Initial n8n Configuration

### 5.1 Verify Custom Nodes Are Loaded

1. In n8n, click the **+** button to add a node
2. Search for **"MSME"** in the search box
3. You should see:
   - **MSME Trigger** (🛒 shopping cart icon)
   - **MSME Action** (⚙️ cogs icon)

If the nodes are **NOT visible**:
```bash
# Check if dist files exist
ls -la n8n-custom-nodes/dist/nodes/

# Check Docker logs for errors
docker-compose logs n8n | grep -i "custom\|error\|extension"

# Restart n8n
docker-compose restart n8n
```

### 5.2 Configure Timezone

n8n should already be set to `Asia/Jakarta` via the Docker environment. To verify:

1. Click ⚙️ **Settings** → **General**
2. Confirm timezone is `Asia/Jakarta`

---

## 6. Gmail App Password Setup

n8n uses SMTP to send emails. Gmail requires an **App Password** (not your regular password).

### 6.1 Enable 2-Factor Authentication on Gmail

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to enable it

### 6.2 Generate an App Password

1. Go to [App Passwords page](https://myaccount.google.com/apppasswords)
2. Select **App**: `Mail`
3. Select **Device**: `Other (Custom name)` → type `n8n MSME`
4. Click **Generate**
5. Copy the **16-character password** (e.g., `abcd efgh ijkl mnop`)

> [!WARNING]
> - The App Password is shown **only once** – save it immediately
> - Remove all spaces when entering it in n8n (enter as `abcdefghijklmnop`)
> - If you lose it, revoke and generate a new one

### 6.3 Create SMTP Credentials in n8n

1. Click the **+** button and add the **SMTP** node (if you haven't already)
2. In the node configuration, find **Credential for SMTP**
3. Click the dropdown and select **- Create New -**
4. A popup will appear. Fill in:
   - **Name**: `Gmail SMTP`
   - **Host**: `smtp.gmail.com`
   - **Port**: `465` (secure)
   - **User**: `your.email@gmail.com`
   - **Password**: Your 16-char App Password
   - **SSL/TLS**: Toggle **ON** (green)
5. Click **Save** in the popup
6. Close the popup to return to the node

> [!TIP]
> **Connection Error?**
> If you get "Connection closed unexpectedly" with Port 465, try these settings instead:
> - **Port**: `587`
> - **SSL/TLS**: Toggle **OFF** (this enables STARTTLS automatically)
> 
> Also double-check that you are using an **App Password** (16 characters), NOT your regular Gmail password.

---

## 7. Custom Nodes – Deep Dive

The project includes two custom n8n nodes and one credential type:

### 7.1 MSME Trigger Node

**File**: `n8n-custom-nodes/nodes/MsmeTrigger/MsmeTrigger.node.js`

This is a **webhook-based trigger** that listens for marketplace events:

| Event Type             | Value                  | Description                          |
| ---------------------- | ---------------------- | ------------------------------------ |
| Order Created          | `order.created`        | Fires when a new order is placed     |
| Order Status Changed   | `order.status_changed` | Fires when order status updates      |
| Inventory Low          | `inventory.low`        | Fires when product stock is low      |

**How it works:**
- Creates a webhook endpoint (e.g., `http://localhost:5678/webhook/<unique-id>`)
- Receives POST requests from the Go backend workflow webhook flow
- Filters events by the selected `eventType` – only matching events pass through
- Outputs the full event payload to the next node

### 7.2 MSME Action Node

**File**: `n8n-custom-nodes/nodes/MsmeAction/MsmeAction.node.js`

This node performs **actions back on the marketplace API**:

| Operation            | Description                              |
| -------------------- | ---------------------------------------- |
| Update Order Status  | Changes order status (Pending → Confirmed, etc.) |
| Get Order Details    | Fetches full order information by ID     |

**Available Status Values:**
- `Pending`, `Confirmed`, `Preparing`, `Ready`, `Delivered`, `confirmation_sent`

**How it works:**
- Uses the `msmeApi` credential (base URL + API key)
- Makes authenticated HTTP requests to the backend API
- For status updates: `PUT /api/orders/:id/status`
- For details: `GET /api/orders/:id`

### 7.3 MSME API Credential

**File**: `n8n-custom-nodes/credentials/MsmeApi.credentials.js`

| Field         | Default Value                        | Description                |
| ------------- | ------------------------------------ | -------------------------- |
| API Base URL  | `http://host.docker.internal:5000`   | Your backend server URL    |
| API Key       | (empty)                              | JWT token for auth         |

---

## 8. Configuring API Credentials in n8n

### 8.1 Get Your JWT Token

The MSME Action node needs a valid JWT token to authenticate with the backend.

**Option A – From Browser Dev Tools:**
1. Log in to the marketplace frontend as a **seller**
2. Open **Dev Tools** → **Application** → **Local Storage**
3. Find the `token` key
4. Copy its value (starts with `eyJ...`)

**Option B – From API (cURL):**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","password":"your_password"}'

# Response: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..." }
```

### 8.2 Create the MSME API Credential in n8n

1. Add the **MSME Action** node
2. In the node configuration, find **Credential for MSME API**
3. Select **- Create New -**
4. A popup will appear. Fill in:
   - **Name**: `MSME API`
   - **API Base URL**: `http://host.docker.internal:5000`
   - **API Key**: The JWT token you copied earlier
5. Click **Save**

> [!NOTE]
> Use `http://host.docker.internal:5000` (NOT `localhost`) because n8n runs inside Docker and needs to reach the host machine.

> [!WARNING]
> JWT tokens **expire**. If you get "Authentication failed" errors, generate a new token and update the credential.

---

## 9. Workflow 1: Order Confirmation Email

This is the primary workflow – sends a confirmation email when a customer places an order.

### 9.1 Create the Workflow

1. Click **Workflows** → **Add Workflow**
2. Name: `Order Confirmation Email`
3. Click **Save**

### 9.2 Add MSME Trigger Node

1. Click **+** → Search **"MSME Trigger"**
2. Configure:
   - **Event Type**: `Order Created`
3. **Copy the Webhook URL** (you'll need this later!)
4. Click **Save**

**Webhook URL format**: `http://localhost:5678/webhook/<unique-id>`

### 9.3 Add SMTP Email Node

1. Click **+** next to the trigger node
2. Search **"Send Email"**
3. Select **"Send an Email"** from the Actions list
4. Select the **Gmail SMTP** credential you created

Configure the email fields:

**To:**
```
{{ $json.data.buyer.email }}
```

**From:**
```
your.email@gmail.com
```

**Subject:**
```
Order Confirmation #{{ $json.data.orderNumber }} - MSME Marketplace
```

**Body (Text):**
```
Hi {{ $json.data.buyer.name }},

Thank you for your order!

📦 Order #: {{ $json.data.orderNumber }}
💰 Total: Rp {{ $json.data.totalAmount.toLocaleString() }}

Items:
{{ $json.data.items.map(item => `  • ${item.name} x${item.quantity} - Rp ${item.price.toLocaleString()}`).join('\n') }}

🏪 Seller: {{ $json.data.seller.name }}

We'll notify you when your order is ready!

Best regards,
{{ $json.data.seller.name }}
MSME Marketplace Team
```

4. Click **Save**

### 9.4 Add MSME Action Node (Update Status)

1. Click **+** next to the SMTP node
2. Search **"MSME Action"**
3. Select the **MSME API** credential
4. Configure:
   - **Operation**: `Update Order Status`
   - **Order ID**: `{{ $json.data.orderId }}` (pre-filled)
   - **New Status**: `Confirmation Sent`
5. Click **Save**

### 9.5 Final Workflow Chain

```
MSME Trigger (Order Created) → Send Email (SMTP) → MSME Action (Update Status)
```

### 9.6 Activate the Workflow

Toggle the **Active** switch in the top-right corner. The workflow is now listening for webhook events.

---

## 10. Workflow 2: Order Status Update Email

Notifies buyers whenever their order status changes (e.g., Confirmed → Preparing → Ready).

### 10.1 Create the Workflow

1. **Workflows** → **Add Workflow** → Name: `Order Status Update Email`

### 10.2 Configure Nodes

**Node 1 – MSME Trigger:**
- Event Type: `Order Status Changed`

**Node 2 – IF (Filter):**
Add an **IF** node to only send emails for meaningful status changes:
- Condition: `{{ $json.event }}` **equals** `order.status_changed`

**Node 3 – Send Email (SMTP):**

**Subject:**
```
Order #{{ $json.data.orderNumber }} - Status Updated to {{ $json.data.status }}
```

**Body:**
```
Hi {{ $json.data.buyer.name }},

Your order #{{ $json.data.orderNumber }} has been updated.

📋 New Status: {{ $json.data.status }}
💰 Total: Rp {{ $json.data.totalAmount }}
🏪 Seller: {{ $json.data.seller.name }}

Thank you for shopping at MSME Marketplace!

---
MSME Marketplace Team
```

### 10.3 Activate & Save

Toggle **Active** and copy the webhook URL.

---

## 11. Workflow 3: Inventory Low Alert

Alert sellers when their product stock is running low.

### 11.1 Create the Workflow

1. **Workflows** → **Add Workflow** → Name: `Inventory Low Alert`

### 11.2 Configure Nodes

**Node 1 – MSME Trigger:**
- Event Type: `Inventory Low`

**Node 2 – Send Email (SMTP):**

**To:** `{{ $json.data.seller.email }}`

**Subject:**
```
⚠️ Low Stock Alert: {{ $json.data.productName }}
```

**Body:**
```
Hi {{ $json.data.seller.name }},

Your product "{{ $json.data.productName }}" is running low on stock!

📦 Current Stock: {{ $json.data.currentStock }}
⚠️ Threshold: {{ $json.data.threshold }}

Please restock soon to avoid missing sales.

---
MSME Marketplace Inventory System
```

### 11.3 Activate

Toggle **Active** and register the webhook URL in the marketplace.

---

## 12. Importing Pre-Built Workflows

The project includes ready-to-import workflow JSON files in `n8n-workflows/`:

### 12.1 Import Order Confirmation Workflow

1. In n8n, go to **Workflows** → click **⋮ (menu)** → **Import from File**
2. Select `n8n-workflows/order-confirmation.json`
3. The workflow is imported with pre-configured nodes
4. **You must update:**
   - SMTP credential: Click the email node → select your **Gmail SMTP** credential
   - From email: Replace `your.email@gmail.com` with your actual Gmail
5. Save and activate

### 12.2 Import Order Status Update Workflow

1. Import `n8n-workflows/order-status-update.json`
2. Same credential updates as above
3. Save and activate

> [!TIP]
> After importing, click on each node to verify the credentials and email settings are correct before activating.

---

## 13. Connecting n8n to the Marketplace Backend

### 13.1 Understanding the Webhook Flow

The Go backend workflow + webhook handlers drive outbound/inbound webhook communication:

```
Order Event in app
    │
    ├── Backend reads active seller workflow from `workflows` collection
    ├── Backend sends POST to `workflow.webhookUrl` (n8n)
    ├── n8n runs automation (email/updates/alerts)
    └── n8n calls back to `/api/webhooks/n8n/callback` when needed
```

### 13.2 Enable Automation for a Seller

A seller must have `automationEnabled: true` in the database.

**Via MongoDB Shell / Compass:**
```javascript
db.users.updateOne(
  { email: "seller@example.com" },
  { $set: { automationEnabled: true } }
)
```

**Via MongoDB Atlas:**
1. Open your cluster → **Browse Collections** → `users`
2. Find the seller document
3. Add/update the field `automationEnabled: true`

### 13.3 Register the Webhook URL

**Option A – Via Frontend (Recommended):**
1. Log in as the seller
2. Navigate to `/automation`
3. Click **Create Workflow**
4. Select **workflow type** (e.g., `Order Confirmation`)
5. Paste the **webhook URL** from n8n
6. Click **Create** and toggle it **Active**

**Option B – Via API (cURL):**
```bash
# Replace TOKEN with your JWT token
# Replace WEBHOOK_URL with the n8n webhook URL

curl -X POST http://localhost:5000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Order Confirmation",
    "type": "order_confirmation",
    "webhookUrl": "http://localhost:5678/webhook/YOUR-WEBHOOK-ID",
    "config": {}
  }'
```

### 13.4 The n8n Callback Endpoint

n8n can call back to the marketplace to update order status via:

```
POST http://host.docker.internal:5000/api/webhooks/n8n/callback
```

This endpoint accepts:
```json
{
  "action": "update_order_status",
  "data": {
    "orderId": "65a1b2c3...",
    "status": "confirmed"
  }
}
```

Protected by a shared secret in the `X-Webhook-Secret` header:
- Default: `msme-webhook-secret-2024`
- Configurable via `WEBHOOK_SECRET` env variable

---

## 14. Using the Automation Dashboard (Frontend)

The marketplace frontend includes a seller **Automation Dashboard** at `/automation`:

### Features

| Feature             | Description                                   |
| ------------------- | --------------------------------------------- |
| **View Workflows**  | See all configured workflows with status      |
| **Create Workflow** | Add new automation (type + webhook URL)        |
| **Toggle Active**   | Enable/disable workflows without deleting     |
| **Delete Workflow** | Remove a workflow configuration                |
| **Execution Count** | See how many times each workflow has triggered |
| **Last Executed**   | Timestamp of the most recent execution         |

### Workflow Types Available

| Type                  | Database Value         | Purpose                              |
| --------------------- | ---------------------- | ------------------------------------ |
| Order Confirmation    | `order_confirmation`   | Email when new order placed          |
| Inventory Alert       | `inventory_alert`      | Alert when stock runs low            |
| Welcome Series        | `welcome_series`       | Welcome email for new customers      |

### How to Use

1. Log in as a **seller** (must have `isSeller: true`)
2. Navigate to **/automation** (via the sidebar or URL)
3. Click **Create Workflow**
4. Fill in:
   - **Name**: e.g., "My Order Confirmation"
   - **Type**: Select from dropdown
   - **Webhook URL**: Paste from n8n
5. Click **Create**
6. Toggle the workflow to **Active**

---

## 15. Testing & Verification

### 15.1 End-to-End Test

1. **Start all services:**
   ```bash
   # Terminal 1: Backend
   cd go-backend && go run ./cmd/server

   # Terminal 2: Frontend
   cd frontend && npm run dev

   # Terminal 3: n8n + Postgres
   docker-compose up -d
   ```

2. **Verify everything is running:**
   ```bash
   curl http://localhost:5000/api/health   # Backend
   curl http://localhost:5678/healthz      # n8n
   open http://localhost:5173              # Frontend
   ```

3. **Place a test order** as a buyer

4. **Check n8n execution:**
   - Go to http://localhost:5678 → **Executions** (left sidebar)
   - You should see a new execution
   - Click to inspect – each node shows green (✅ success) or red (❌ error)

5. **Check email:** Look in the buyer's inbox or your Gmail Sent folder

6. **Check order status:** In the marketplace, verify the order shows "Confirmation Sent"

### 15.2 Test Webhook Manually

You can test the webhook without placing an actual order:
```bash
# Replace WEBHOOK_URL with your n8n webhook URL
curl -X POST http://localhost:5678/webhook/YOUR-WEBHOOK-ID \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "orderId": "test-order-123",
      "orderNumber": "TEST001",
      "buyer": {
        "id": "buyer123",
        "name": "Test Buyer",
        "email": "your-test-email@gmail.com"
      },
      "seller": {
        "id": "seller456",
        "name": "Test Store",
        "email": "seller@test.com"
      },
      "items": [
        {
          "productId": "prod789",
          "name": "Test Product",
          "quantity": 2,
          "price": 50000
        }
      ],
      "totalAmount": 100000,
      "status": "Pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }'
```

### 15.3 Test via Backend API

Use the built-in test endpoint:
```bash
curl -X POST http://localhost:5000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"webhookUrl": "http://localhost:5678/webhook/YOUR-WEBHOOK-ID"}'
```

### 15.4 Success Checklist

| Check                    | Expected Result                             |
| ------------------------ | ------------------------------------------- |
| n8n UI accessible        | http://localhost:5678 loads                  |
| Custom nodes visible     | "MSME Trigger" & "MSME Action" in node list |
| Workflow active          | Toggle switch is ON (blue)                   |
| Webhook triggered        | New entry in n8n Executions tab              |
| Email sent               | Message in Gmail Sent folder                 |
| Order status updated     | Order shows "Confirmation Sent"              |
| Backend logs             | Shows "✅ Webhook sent successfully"         |

---

## 16. Webhook Payload Reference

### `order.created` Event

```json
{
  "event": "order.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "orderId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "orderNumber": "ABC123",
    "buyer": {
      "id": "buyer123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "seller": {
      "id": "seller456",
      "name": "Jane's Store",
      "email": "jane@store.com"
    },
    "items": [
      {
        "productId": "prod789",
        "name": "Batik Shirt",
        "quantity": 2,
        "price": 150000
      }
    ],
    "totalAmount": 300000,
    "status": "Pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### `order.status_changed` Event

```json
{
  "event": "order.status_changed",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "orderId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "orderNumber": "ABC123",
    "buyer": {
      "id": "buyer123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "seller": {
      "id": "seller456",
      "name": "Jane's Store",
      "email": "jane@store.com"
    },
    "status": "Confirmed",
    "totalAmount": 300000,
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### n8n Expressions Quick Reference

Use these in any n8n node field:

| Data Point        | Expression                               |
| ----------------- | ---------------------------------------- |
| Order ID          | `{{ $json.data.orderId }}`               |
| Order Number      | `{{ $json.data.orderNumber }}`           |
| Buyer Name        | `{{ $json.data.buyer.name }}`            |
| Buyer Email       | `{{ $json.data.buyer.email }}`           |
| Seller Name       | `{{ $json.data.seller.name }}`           |
| Seller Email      | `{{ $json.data.seller.email }}`          |
| Total Amount      | `{{ $json.data.totalAmount }}`           |
| Formatted Amount  | `{{ $json.data.totalAmount.toLocaleString() }}` |
| Number of Items   | `{{ $json.data.items.length }}`          |
| Order Status      | `{{ $json.data.status }}`                |
| Event Type        | `{{ $json.event }}`                      |
| Timestamp         | `{{ $json.timestamp }}`                  |

---

## 17. Security Best Practices

### 17.1 Webhook Security

The n8n callback endpoint uses a shared secret for authentication:

```
Header: X-Webhook-Secret: msme-webhook-secret-2024
```

**For production, change this!** Set in your `.env`:
```env
WEBHOOK_SECRET=your-strong-random-secret-here
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

### 17.2 n8n Authentication

Add basic authentication to the n8n web UI in `docker-compose.yml`:
```yaml
environment:
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=your-secure-password
```

### 17.3 Network Security

- n8n and PostgreSQL communicate over a **private Docker network** (`msme-network`)
- PostgreSQL is **not exposed** to the host (no ports mapping)
- Custom nodes are mounted as **read-only**

### 17.4 Credential Management

- Never hardcode JWT tokens – refresh them regularly
- Use n8n's built-in credential encryption
- Rotate Gmail App Passwords periodically
- Store sensitive values in environment variables

---

## 18. Production Deployment

### 18.1 Environment Variables for Production

Update `docker-compose.yml` for production:

```yaml
environment:
  - N8N_HOST=your-domain.com
  - N8N_PROTOCOL=https
  - WEBHOOK_URL=https://your-domain.com/
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
  - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
```

### 18.2 Deploy to a VPS (e.g., DigitalOcean, Render, Railway)

1. **Push your code** to a Git repository
2. **Set up the VPS** with Docker and Docker Compose installed
3. **Clone the repo** on the server
4. **Create a `.env` file** with production values
5. **Start the services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### 18.3 Using a Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name n8n.your-domain.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### 18.4 SSL/HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d n8n.your-domain.com
```

### 18.5 Backup Strategy

```bash
# Backup n8n data
docker-compose exec n8n n8n export:workflow --all --output=/home/node/backups/

# Backup PostgreSQL
docker-compose exec postgres pg_dump -U n8n n8n > backup_$(date +%Y%m%d).sql
```

---

## 19. Advanced Workflow Ideas

### 19.1 Add a Delay Before Email

Insert a **Wait** node between Trigger and SMTP:
```
MSME Trigger → Wait (5 minutes) → Send Email → MSME Action
```

### 19.2 Slack Notification

Add a **Slack** node to notify a #orders channel:
```
MSME Trigger → Send Email → Slack Message → MSME Action
```

Slack message template:
```
🆕 New Order from {{ $json.data.buyer.name }}!
💰 Total: Rp {{ $json.data.totalAmount.toLocaleString() }}
📦 Items: {{ $json.data.items.length }}
```

### 19.3 Google Sheets Logging

Add a **Google Sheets** node to log all orders to a spreadsheet:

| Column A     | Column B      | Column C        | Column D     |
| ------------ | ------------- | --------------- | ------------ |
| Order Number | Buyer Name    | Total (Rp)      | Date         |
| `{{ $json.data.orderNumber }}` | `{{ $json.data.buyer.name }}` | `{{ $json.data.totalAmount }}` | `{{ $json.timestamp }}` |

### 19.4 SMS Notifications via Twilio

Add a **Twilio** node to send SMS:
```
Your order #{{ $json.data.orderNumber }} is confirmed!
Total: Rp {{ $json.data.totalAmount.toLocaleString() }}
```

### 19.5 Conditional Logic (IF Node)

Send different emails based on the order amount:
```
MSME Trigger → IF (totalAmount > 500000)
    ├── TRUE  → Send VIP Email  → MSME Action
    └── FALSE → Send Normal Email → MSME Action
```

### 19.6 Error Handling Workflow

Add an **Error Trigger** node to catch failed executions:
```
Error Trigger → Send Alert Email to Admin → Log to Google Sheets
```

### 19.7 Scheduled Daily Reports

Use a **Schedule Trigger** (runs daily at 8 AM):
```
Schedule Trigger → HTTP Request (GET /api/orders?date=today) → Generate Report → Email to Seller
```

---

## 20. Troubleshooting

### Issue: Custom nodes not appearing

**Solution:**
```bash
# 1. Verify dist files exist
ls -la n8n-custom-nodes/dist/nodes/
ls -la n8n-custom-nodes/dist/credentials/
ls -la n8n-custom-nodes/dist/package.json

# 2. Check Docker logs for loading errors
docker-compose logs n8n | grep -i "custom\|extension\|error"

# 3. Restart n8n
docker-compose restart n8n

# 4. If still not working, rebuild dist and restart
cd n8n-custom-nodes
rm -rf dist && mkdir -p dist/nodes/MsmeTrigger dist/nodes/MsmeAction dist/credentials
cp nodes/MsmeTrigger/MsmeTrigger.node.js dist/nodes/MsmeTrigger/
cp nodes/MsmeAction/MsmeAction.node.js dist/nodes/MsmeAction/
cp credentials/MsmeApi.credentials.js dist/credentials/
cp package.json dist/
docker-compose restart n8n
```

### Issue: Webhook not triggering

**Diagnose step by step:**

1. Is the **n8n workflow active**? → Check toggle switch in n8n
2. Is the **marketplace workflow active**? → Check at `/automation`
3. Is `automationEnabled: true` on the seller? → Check MongoDB
4. Is the webhook URL correct? → Compare n8n URL with the one saved in the workflow
5. Check backend logs for `✅ Webhook sent successfully` or error messages

**Debug with manual test:**
```bash
# Test the webhook URL directly
curl -X POST http://localhost:5678/webhook/YOUR-ID \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{"message":"hello"}}'
```

### Issue: Email not sending

**Checklist:**
1. ✅ Did you use Gmail **App Password** (not regular password)?
2. ✅ Is **2FA enabled** on your Gmail account?
3. ✅ Did you remove spaces from the App Password?
4. ✅ Did you select the correct SMTP credential in the email node?
5. Check n8n execution logs → click on the failed execution → click the SMTP node → view error

**Common SMTP errors:**
| Error                                  | Solution                                |
| -------------------------------------- | --------------------------------------- |
| `Invalid login`                         | Wrong email or App Password             |
| `Username and Password not accepted`    | Regenerate App Password                 |
| `Connection timeout`                    | Check port 587 is not blocked           |
| `Self signed certificate`               | Enable TLS in SMTP credential           |

### Issue: "Connection refused" errors

The marketplace backend is not reachable from the Docker container.

```bash
# 1. Is your backend running?
curl http://localhost:5000/api/health

# 2. Can n8n reach it through Docker networking?
docker-compose exec n8n sh -c "wget -qO- http://host.docker.internal:5000/api/health"

# 3. Check extra_hosts in docker-compose.yml
# It should have: host.docker.internal:host-gateway
```

### Issue: "Authentication failed" in MSME Action

The JWT token has expired. Generate a new one:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","password":"yourpassword"}'
```
Update the MSME API credential in n8n with the new token.

### Issue: PostgreSQL not starting

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Common fix: remove the volume and restart
docker-compose down
docker volume rm msme-marketplace_postgres_data
docker-compose up -d
```

---

## 21. Quick Reference Commands

```bash
# ─── Service Management ───────────────────────────────────

# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Restart n8n only
docker-compose restart n8n

# View status
docker-compose ps

# ─── Logs ──────────────────────────────────────────────────

# Real-time n8n logs
docker-compose logs -f n8n

# Last 50 lines
docker-compose logs --tail=50 n8n

# PostgreSQL logs
docker-compose logs postgres

# ─── Database ──────────────────────────────────────────────

# Access PostgreSQL shell
docker-compose exec postgres psql -U n8n

# Backup PostgreSQL
docker-compose exec postgres pg_dump -U n8n n8n > n8n_backup.sql

# ─── n8n CLI (inside container) ───────────────────────────

# Export all workflows
docker-compose exec n8n n8n export:workflow --all

# Import a workflow
docker-compose exec n8n n8n import:workflow --input=workflow.json

# ─── Troubleshooting ──────────────────────────────────────

# Enter n8n container shell
docker-compose exec n8n sh

# Test backend connectivity from n8n
docker-compose exec n8n sh -c "wget -qO- http://host.docker.internal:5000/api/health"

# Check custom node files
docker-compose exec n8n ls -la /home/node/.n8n/custom/

# ─── Reset / Clean ────────────────────────────────────────

# Stop and remove volumes (⚠️ DELETES ALL WORKFLOWS + DATA)
docker-compose down -v

# Rebuild custom nodes
cd n8n-custom-nodes && rm -rf dist && mkdir -p dist/nodes/MsmeTrigger dist/nodes/MsmeAction dist/credentials
cp nodes/MsmeTrigger/MsmeTrigger.node.js dist/nodes/MsmeTrigger/
cp nodes/MsmeAction/MsmeAction.node.js dist/nodes/MsmeAction/
cp credentials/MsmeApi.credentials.js dist/credentials/
cp package.json dist/
```

---

## Need Help?

| Symptom                        | Likely Cause                              | Quick Fix                              |
| ------------------------------ | ----------------------------------------- | -------------------------------------- |
| "Connection refused"           | Backend not running on port 5000          | `cd go-backend && go run ./cmd/server` |
| "Authentication failed"        | JWT token expired                          | Re-login and update credential         |
| "Custom nodes not found"       | `dist/` missing or n8n not restarted       | Rebuild dist + `docker-compose restart` |
| "Email not sent"               | Wrong Gmail App Password                   | Regenerate from Google account         |
| "Workflow not triggered"       | Workflow inactive or wrong webhook URL     | Check n8n + app workflow status        |

**Debugging order of operations:**
1. Browser console → JavaScript errors
2. Backend logs → API errors (`go run ./cmd/server` output)
3. n8n execution logs → Workflow errors (http://localhost:5678)
4. Docker logs → Container issues (`docker-compose logs`)
