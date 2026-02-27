# Fraud/Scam Reporting Setup Guide

This document outlines the different methods available for sending fraud/scam reports from the UMKM Marketplace application to the creator/admin.

## Overview

The fraud reporting system allows both buyers and sellers to report fraudulent activity. Reports are stored in the database and can also be sent via email to the creator for immediate review.

**Current Implementation:**
- Reports are saved to MongoDB (`fraud_reports` collection)
- Email notification attempts via SMTP (if configured)
- Fallback to mailto: link if SMTP fails

---

## Method 1: SMTP Email (Recommended for Production)

### Overview
Uses standard SMTP protocol to send emails directly from the backend server. Most reliable method for production use.

### Supported Providers
- Gmail (with App Password)
- Outlook/Office 365
- Yahoo Mail
- Custom SMTP servers
- Any provider supporting SMTP authentication

### Setup Steps

1. **Add environment variables to `.env`:**

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # Gmail example
SMTP_PORT=587                     # TLS port
SMTP_USER=your-email@gmail.com    # Your email address
SMTP_PASS=your-app-password       # App-specific password (not regular password)
FROM_EMAIL=noreply@yourdomain.com # Sender address

# Report Recipient
CREATOR_EMAIL=admin@yourdomain.com # Where reports are sent
```

2. **For Gmail users - Generate App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com)
   - Navigate to **Security**
   - Enable **2-Step Verification** (required)
   - Go to **App passwords**
   - Select "Mail" and your device
   - Copy the 16-character password
   - Use this as `SMTP_PASS` (not your Gmail password)

3. **Test the configuration:**
   ```bash
   cd go-backend
   go run cmd/server/main.go
   ```

### Pros
- ✅ Automatic - no user action required
- ✅ Works even if user has no email client
- ✅ Professional appearance
- ✅ Reliable delivery tracking

### Cons
- ❌ Requires SMTP credentials setup
- ❌ Gmail has sending limits (500 emails/day for free accounts)
- ❌ Some hosting providers block SMTP ports

---

## Method 2: Mailto Fallback (Zero Setup)

### Overview
Uses the browser's `mailto:` protocol to open the user's default email client with a pre-filled report. Implemented as automatic fallback when SMTP is not configured.

### How It Works
1. User clicks "Report Fraud/Issue"
2. System attempts to send via API
3. If API fails or SMTP not configured
4. Browser opens email client with pre-filled subject and body
5. User reviews and clicks "Send"

### Setup Steps
**No setup required!** This is already implemented as the fallback mechanism.

The system automatically uses mailto when:
- SMTP environment variables are not set
- SMTP server is unreachable
- API endpoint returns an error

### Pros
- ✅ Zero configuration needed
- ✅ Works immediately
- ✅ No credentials to manage
- ✅ User can review/edit before sending

### Cons
- ❌ Requires user to have email client configured
- ❌ User must manually click send
- ❌ Less reliable (depends on user's email setup)
- ❌ Cannot track if email was actually sent

---

## Method 3: Third-Party Email Services (Best for Scale)

### Overview
Use dedicated email service providers via their APIs. Best for high-volume applications.

### Recommended Providers

#### SendGrid (Recommended)
- **Free Tier:** 100 emails/day
- **Pricing:** $19.95/month for 50,000 emails
- **API:** RESTful, excellent documentation
- **Features:** Templates, analytics, webhooks

#### AWS SES (Most Cost-Effective)
- **Free Tier:** 62,000 emails/month (from EC2)
- **Pricing:** $0.10 per 1,000 emails
- **Setup:** Requires AWS account
- **Features:** High deliverability, DKIM built-in

#### Mailgun
- **Free Tier:** 5,000 emails/month (3 months), then 1,000/month
- **Pricing:** Starting at $35/month
- **Features:** Great for developers, excellent logs

### Implementation: SendGrid Example

1. **Sign up** at [SendGrid](https://sendgrid.com)
2. **Create API Key** (Full Access or Restricted to Mail Send)
3. **Add to environment variables:**

```bash
# Instead of SMTP variables
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
CREATOR_EMAIL=admin@yourdomain.com
```

4. **Update `reports.go`:**

```go
import (
    "github.com/sendgrid/sendgrid-go"
    "github.com/sendgrid/sendgrid-go/helpers/mail"
)

func sendFraudReportEmailSendGrid(toEmail string, req FraudReportRequest) bool {
    from := mail.NewEmail("UMKM Marketplace", os.Getenv("FROM_EMAIL"))
    to := mail.NewEmail("Admin", toEmail)
    subject := fmt.Sprintf("URGENT: Fraud Report - Order #%s", req.OrderID)
    
    content := fmt.Sprintf(`FRAUD REPORT NOTIFICATION
    
Order ID: %s
Reported By: %s (%s)
...`, req.OrderID, req.ReporterName, req.ReporterRole)
    
    message := mail.NewSingleEmail(from, subject, to, content, "")
    client := sendgrid.NewSendClient(os.Getenv("SENDGRID_API_KEY"))
    response, err := client.Send(message)
    
    return err == nil && response.StatusCode == 202
}
```

### Pros
- ✅ High deliverability rates
- ✅ Better spam avoidance
- ✅ Analytics and tracking
- ✅ Template support
- ✅ Handles scale well

### Cons
- ❌ Additional service dependency
- ❌ Monthly cost for high volume
- ❌ Requires account setup

---

## Method 4: Discord/Slack Webhooks (Alternative)

### Overview
Send fraud reports to a Discord channel or Slack workspace via webhooks.

### Setup

1. **Discord:**
   - Create a private channel
   - Go to Channel Settings → Integrations → Webhooks
   - Copy webhook URL

2. **Add environment variable:**
   ```bash
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

3. **Implementation example:**
   ```go
   func sendDiscordNotification(req FraudReportRequest) bool {
       webhookURL := os.Getenv("DISCORD_WEBHOOK_URL")
       message := map[string]string{
           "content": fmt.Sprintf("🚨 **FRAUD REPORT** 🚨\nOrder: %s\nReporter: %s\nDetails: %s", 
               req.OrderID, req.ReporterName, req.FraudDetails),
       }
       // POST to webhook URL
   }
   ```

### Pros
- ✅ Instant notifications
- ✅ Free
- ✅ Mobile app notifications
- ✅ Team collaboration

### Cons
- ❌ Not formal email record
- ❌ Requires Discord/Slack

---

## Comparison Summary

| Method | Setup Difficulty | Cost | Reliability | Best For |
|--------|-----------------|------|-------------|----------|
| **SMTP (Gmail)** | Medium | Free* | Good | Small-medium apps |
| **Mailto Fallback** | None | Free | Low | Testing/Development |
| **SendGrid** | Low | $20+/mo | Excellent | Production apps |
| **AWS SES** | Medium | ~$0.10/1k | Excellent | AWS users |
| **Discord/Slack** | Low | Free | Good | Team notifications |

*Gmail has sending limits

---

## Quick Start Recommendation

### For Development/Testing
Use **Method 2 (Mailto Fallback)** - no setup required.

### For Production MVP
Use **Method 1 (Gmail SMTP)** with App Password:
1. Quick to set up
2. Free
3. Good enough for moderate volume

### For Production Scale
Use **Method 3 (SendGrid/AWS SES)**:
1. Better deliverability
2. Professional appearance
3. Handles scale

---

## Environment Variables Template

```bash
# Option 1: SMTP (Choose one provider)
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OR Outlook
# SMTP_HOST=smtp.office365.com
# SMTP_PORT=587
# SMTP_USER=your-email@outlook.com
# SMTP_PASS=your-password

# Option 3: SendGrid (instead of SMTP)
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Common settings
FROM_EMAIL=noreply@yourdomain.com
CREATOR_EMAIL=admin@yourdomain.com

# Optional: Discord notifications
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Testing Your Setup

1. **Start the backend:**
   ```bash
   cd go-backend
   go run cmd/server/main.go
   ```

2. **Create a test order** and mark it as delivered

3. **Click "Report Fraud/Issue"** on the order

4. **Verify:**
   - Check database: `fraud_reports` collection
   - Check email inbox (for SMTP/SendGrid)
   - Check email client opened (for mailto fallback)

---

## Troubleshooting

### SMTP Connection Errors
- Check firewall settings (ports 25, 465, 587)
- Verify credentials
- Enable "Less secure apps" or use App Password for Gmail

### Emails Going to Spam
- Use authenticated SMTP
- Set proper `FROM_EMAIL` domain
- Configure SPF/DKIM records for your domain

### Mailto Not Working
- User must have default email client configured
- Works best on desktop browsers
- Mobile browsers may have limited support

---

## Security Considerations

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Rate limit** report submissions (implement in future)
5. **Validate** all input data before sending
6. **Log** all report attempts for audit trail

---

## Future Enhancements

- [ ] Add rate limiting to prevent spam
- [ ] Implement report templates
- [ ] Add file attachment support (screenshots)
- [ ] SMS notifications for critical reports
- [ ] Dashboard for viewing all reports
- [ ] Auto-escalation for repeat offenders
