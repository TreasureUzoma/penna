# Email Service Documentation

This directory contains email services for Penna, powered by AWS SES (Simple Email Service).

## Overview

The email service allows you to send newsletters from dynamic email addresses based on project slugs:
- Format: `newsletter@{projectSlug}.penna.dev`
- Example: `newsletter@my-newsletter.penna.dev`

## Files

- **ses.ts** - AWS SES integration and low-level email sending functions
- **external.ts** - High-level newsletter sending API
- **internal.ts** - Internal transactional emails (welcome, password reset, etc.)
- **sns-verify.ts** - Verifies incoming SNS messages are genuinely from AWS
- **ses-events.ts** - Handles bounce/complaint notifications (see below)

## Setup

### 1. AWS SES Configuration

#### Prerequisites
- AWS Account
- AWS Access Key ID and Secret Access Key

#### Steps

1. **Verify your domain in AWS SES**
   - Go to AWS SES Console → Verified identities
   - Click "Create identity" → Select "Domain"
   - Enter `penna.dev`
   - Add the DNS records provided by AWS to your domain registrar
   - Wait for verification (usually 24 hours)

2. **Request production access** (if in sandbox mode)
   - AWS SES starts in sandbox mode (limited to verified emails)
   - Submit a request to move to production access
   - This allows sending to any email address

3. **Add credentials to .env**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   NEWSLETTER_DOMAIN=newsletter.penna.dev
   ```

### 2. Environment Variables

```env
# AWS Configuration
AWS_REGION=us-east-1                          # AWS region (default: us-east-1)
AWS_ACCESS_KEY_ID=xxx                         # Your AWS access key
AWS_SECRET_ACCESS_KEY=xxx                     # Your AWS secret key
NEWSLETTER_DOMAIN=newsletter.penna.dev      # Domain for newsletter emails
```

## API Endpoints

### Send Newsletter

**POST** `/api/v1/emails/:projectId/send`

Send a newsletter to multiple subscribers.

**Request Body:**
```json
{
  "subject": "My Newsletter",
  "html": "<h1>Hello!</h1><p>This is my newsletter</p>",
  "recipientEmails": ["user1@example.com", "user2@example.com"],
  "replyTo": "support@example.com" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Newsletter sent successfully",
  "data": {
    "sent": 2,
    "failed": 0,
    "errors": []
  }
}
```

### Send Test Email

**POST** `/api/v1/emails/:projectId/test`

Send a test email to verify content before sending to all subscribers.

**Request Body:**
```json
{
  "testEmail": "your-email@example.com",
  "subject": "Test Newsletter",
  "html": "<h1>Test</h1>"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "data": {
    "success": true,
    "messageId": "0000014a-1234-5678-abcd-ef1234567890"
  }
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
import api from "@workspace/axios";

// Send newsletter
const response = await api.post(`/emails/${projectId}/send`, {
  subject: "My Newsletter",
  html: "<h1>Hello Subscribers!</h1>",
  recipientEmails: ["user1@example.com", "user2@example.com"],
});

// Send test email
const testResponse = await api.post(`/emails/${projectId}/test`, {
  testEmail: "your-email@example.com",
  subject: "Test Newsletter",
  html: "<h1>Test</h1>",
});
```

## Rate Limiting

- Newsletter endpoints: 100 requests per hour
- Rate limit applies per user/project

## AWS SES Limits & Pricing

### Pricing
- **$0.10 per 1,000 emails** (very cheap!)
- No setup fees
- Pay only for what you send

### Limits (Production)
- **Send rate**: 14 emails per second (can be increased)
- **Daily quota**: 50,000 emails per day (can be increased)
- **Bounce rate**: Keep below 5%
- **Complaint rate**: Keep below 0.1%

### Sandbox Mode Limits
- Can only send to verified email addresses
- Limited to 200 emails per 24 hours
- Request production access to remove limits

## Bounce & Complaint Handling

Required for AWS production access ("a process in place for handling
bounce and complaint notifications") and for actually keeping your bounce/
complaint rate under the thresholds above — sending to dead or complaining
addresses forever will get your account throttled or suspended.

The `/api/v1/webhooks/ses` route receives bounce/complaint events from SES
via SNS and automatically marks the affected subscriber `bounced` (on a
permanent bounce) or `unsubscribed` (on a complaint) so they're excluded
from future sends. One-time setup:

1. **Create an SNS topic** (same AWS region as your SES identity), e.g.
   `penna-ses-notifications`. Note its ARN.
2. **Set `SES_NOTIFICATIONS_TOPIC_ARN`** in your environment to that ARN,
   and deploy — the webhook fails closed until this is set.
3. **Subscribe your webhook to the topic**: SNS topic → Create subscription
   → Protocol: HTTPS → Endpoint: `https://<your-api-domain>/api/v1/webhooks/ses`.
   SNS will POST a `SubscriptionConfirmation` message, which the route
   auto-confirms (it visits the `SubscribeURL` for you) as long as step 2
   is already deployed.
4. **Point SES at the topic**: Verified identities → `penna.dev` →
   Notifications tab → set both "Bounce feedback" and "Complaint feedback"
   to "Amazon SNS topic" → select the topic from step 1.

Transient bounces (mailbox full, greylisting, etc.) are left alone —
only `Permanent` bounces and complaints suppress the subscriber.

## Best Practices

1. **Always send test emails first**
   - Use the `/test` endpoint before sending to all subscribers

2. **Include unsubscribe links**
   - Required by law (CAN-SPAM, GDPR)
   - Use the unsubscribe endpoint

3. **Use proper HTML**
   - Test emails in different clients
   - Keep file size under 10MB

4. **Respect rate limits**
   - AWS SES has sending rate limits
   - The service adds delays between bulk sends

## Troubleshooting

### "Email address not verified"
- You're in sandbox mode
- Verify the recipient email in AWS SES or request production access

### "Configuration set does not exist"
- Make sure AWS credentials are correct
- Check AWS region is set correctly

### "Rate exceeded"
- You've hit the sending rate limit
- Wait a moment and retry
- Consider increasing AWS SES limits

### "Invalid email address"
- Check email format
- Ensure no special characters

## Internal Emails (TODO)

The following internal email functions are planned:
- `sendWelcomeEmail()` - Welcome new users
- `sendForgottenPasswordEmail()` - Password reset
- `sendProjectInviteEmail()` - Project invitations
- `sendUnsubscribeCofirmationEmail()` - Unsubscribe confirmations

These will use the same AWS SES infrastructure.

## Support

For AWS SES issues, see:
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [AWS SES FAQ](https://aws.amazon.com/ses/faqs/)
