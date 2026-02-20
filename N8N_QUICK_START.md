# Quick Start: 10-Minute n8n Setup

## 🎯 Goal
Send automatic order confirmation emails when customers place orders.

## Step-by-Step Visual Guide

### Step 1: Start n8n (1 minute)
```bash
cd /Users/user/OpenCode/msme-marketplace
docker-compose up -d
```
Wait 30 seconds, then open **http://localhost:5678**

---

### Step 2: Create Your First Workflow (2 minutes)

1. Click **"Add Workflow"**
2. Name: `Order Confirmation`
3. Click **Save**

---

### Step 3: Add Trigger Node (2 minutes)

1. Click **+** button
2. Search: **MSME Trigger**
3. Select **"Order Created"**
4. Copy the webhook URL shown
5. Click **Save**

**Webhook URL looks like:**
```
http://localhost:5678/webhook/msme-trigger
```

---

### Step 4: Add Email Node (3 minutes)

1. Click **+** next to the trigger node
2. Search: **Send Email**
3. Select **"Send an Email"** (from Actions list)
4. Configure **Credential for SMTP**:
   - Select **- Create New -**
   - Host: `smtp.gmail.com`
   - Port: `465` (Secure)
   - User: `your.email@gmail.com`
   - Password: `xxxx xxxx xxxx xxxx` (Gmail App Password)
   - SSL/TLS: **ON**

5. Configure **Email Settings**:
   - To: `{{ $json.data.buyer.email }}`
   - From: `your.email@gmail.com`
   - Subject: `Order Confirmation #{{ $json.data.orderNumber }}`
   - Text:
   ```
   Hi {{ $json.data.buyer.name }},
   
   Thanks for your order #{{ $json.data.orderNumber }}!
   
   Total: Rp {{ $json.data.totalAmount.toLocaleString() }}
   
   We'll notify you when it's ready.
   
   Best,
   {{ $json.data.seller.name }}
   ```
6. Click **Save**

---

### Step 5: Add Status Update Node (2 minutes)

1. Click **+** next to the Email node
2. Search: **MSME Action**
3. Configure **Credential for MSME API**:
   - Select **- Create New -**
   - API Base URL: `http://host.docker.internal:5000`
   - API Key: (Paste your JWT Token from the backend login)
4. Operation: `Update Order Status`
5. Order ID: `{{ $json.data.orderId }}`
6. New Status: `Confirmation Sent`
7. Click **Save**

---

### Step 6: Activate Workflow (1 minute)

1. Toggle the **Active** switch (top right)
2. You should see: "Workflow activated"

---

### Step 7: Connect to Your App (1 minute)

1. In your marketplace app, go to **/automation**
2. Click **"Create Workflow"**
3. Select **"Order Confirmation"**
4. Paste the webhook URL from Step 3
5. Click **Create**
6. Toggle it to **Active**

---

### Step 8: Test! (1 minute)

1. Place an order in your marketplace
2. Check your Gmail sent folder
3. Check n8n **Executions** tab
4. Check order status updated to "Confirmation Sent"

---

## ✅ Success Indicators

| Check | What to See |
|-------|-------------|
| n8n Running | Green dot on http://localhost:5678 |
| Custom Nodes | "MSME Trigger" and "MSME Action" in node list |
| Workflow Active | Toggle switch is ON (blue) |
| Webhook Triggered | New entry in n8n Executions tab |
| Email Sent | Message in Gmail Sent folder |
| Status Updated | Order shows "Confirmation Sent" in marketplace |

---

## 🔧 Common Quick Fixes

**Problem:** Can't see MSME nodes
```bash
docker-compose restart n8n
```

**Problem:** Webhook not triggering
- Check: Is workflow Active in n8n?
- Check: Is workflow Active in your app?
- Check: Is seller's automationEnabled = true?

**Problem:** Email not sending
- Did you use Gmail App Password (not regular password)?
- Enable 2FA on Gmail first, then generate App Password

**Problem:** "Connection refused"
- Is your marketplace backend running on port 5000?
- Run: `cd go-backend && go run ./cmd/server`

---

## 🎨 Customization Ideas

Once basic flow works, enhance it:

**Add delay before email:**
1. Add "Wait" node between Trigger and SMTP
2. Set: 5 minutes

**Add Slack notification:**
1. Add "Slack" node after SMTP
2. Send message to #orders channel

**Log to Google Sheets:**
1. Add "Google Sheets" node
2. Append row with order details

**Send SMS:**
1. Add "Twilio" node
2. Send SMS to buyer

---

## 📊 Monitoring

**View recent executions:**
1. In n8n, click **Executions** (left sidebar)
2. See all workflow runs
3. Click any execution to see details
4. Green = Success, Red = Error

**View execution logs:**
```bash
# Real-time logs
docker-compose logs -f n8n

# Last 50 lines
docker-compose logs --tail=50 n8n
```

---

## 🚨 Emergency Stop

If something goes wrong:

```bash
# Stop all containers
docker-compose down

# Reset everything (deletes all workflows)
docker-compose down -v
```

---

## 💡 Pro Tips

1. **Always test with small amounts first**
2. **Check executions tab regularly** when starting out
3. **Use expressions** ({{ $json.data... }}) to personalize emails
4. **Save workflow** after every change
5. **Test webhook** using the "Listen" button in MSME Trigger node

---

## 🎯 Next Steps

After this works:
1. Create inventory alert workflow
2. Add more email templates
3. Connect Slack/Teams for notifications
4. Add SMS notifications
5. Deploy to production (Render/Railway)

**Questions?** Check the full guide: N8N_WORKFLOW_GUIDE.md
