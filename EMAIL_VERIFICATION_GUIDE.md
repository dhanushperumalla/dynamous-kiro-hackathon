# Email Verification Guide

## Development Mode

In development, emails are not actually sent. Instead, they are logged to the console and log files.

## How to Verify Email

### Option 1: Use Debug Script (Recommended)

Run this command in the backend directory:

```bash
npm run debug-user <email>
```

Example:
```bash
npm run debug-user dhanushperumalla2@gmail.com
```

This will:
- Verify the email
- Activate the account
- Unlock the account if locked
- Reset failed login attempts

### Option 2: Get Verification URL from Logs

After registering, check the backend logs for the verification URL:

```bash
# In backend directory
npm run dev
```

Look for log entries like:
```
Email verification sent {
  email: "user@example.com",
  firstName: "User",
  verificationUrl: "http://localhost:3000/verify-email?token=..."
}
```

Copy the `verificationUrl` and paste it in your browser (change port from 3000 to 5173 if needed).

### Option 3: Use API Directly

If you have the verification token, you can call the API directly:

```bash
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN_HERE"}'
```

### Option 4: Resend Verification Email

If you need a new verification email:

```bash
curl -X POST http://localhost:3001/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Then check the logs for the new verification URL.

## Current User Status

For user: `dhanushperumalla2@gmail.com`
- Status: Registered but email not verified
- Solution: Run `npm run debug-user dhanushperumalla2@gmail.com` in backend directory

## Troubleshooting

### "Email not verified" error when logging in
- Use Option 1 (debug script) to verify the email
- Or check logs for verification URL and visit it

### Can't find verification URL in logs
- The URL is now logged with the "Email verification sent" message
- Restart backend server to see new logs with URLs
- Or use the debug script (Option 1)

### Token expired
- Tokens expire after a certain time
- Use resend verification (Option 4) to get a new token
- Or use debug script (Option 1) to bypass verification

## Production Setup

In production, you need to configure SendGrid:

1. Get a SendGrid API key from https://sendgrid.com
2. Set environment variable in backend/.env:
   ```
   SENDGRID_API_KEY=your_actual_api_key_here
   FROM_EMAIL=noreply@yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```
3. Emails will be sent automatically to users
