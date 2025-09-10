# Strava to Google Calendar Sync

Automatically sync your Strava activities to Google Calendar using Google Apps Script with **real-time webhooks** for instant updates.

## Features

- ⚡ **Real-time sync** via Strava webhooks (activities appear instantly)
- ✅ Automatic token refresh 
- ✅ Prevents duplicate events
- ✅ Backup polling for reliability
- ✅ Includes activity details (distance, duration, type)
- ✅ Uses dedicated "Strava" calendar

## Quick Setup

### 1. Create Strava App
1. Go to https://www.strava.com/settings/api
2. Create a new app:
   - **Application Name**: Strava GCal Sync
   - **Website**: https://example.com (or your site)
   - **Authorization Callback Domain**: localhost
3. Note your `Client ID` and `Client Secret`

### 2. Get Strava Tokens
1. Replace `YOUR_CLIENT_ID` in this URL and open in browser:
   ```
   https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&scope=activity:read_all&approval_prompt=auto
   ```
2. Authorize the app and copy the `code` from the redirected URL
3. Exchange for tokens using PowerShell:
   ```powershell
   curl.exe -X POST "https://www.strava.com/oauth/token" -F client_id=YOUR_CLIENT_ID -F client_secret=YOUR_CLIENT_SECRET -F code=THE_CODE -F grant_type=authorization_code
   ```
4. Save the `refresh_token` from the response

### 3. Deploy Google Apps Script
1. Go to https://script.google.com
2. Create a new project
3. Copy the code from `src/main.js` into the script editor
4. Go to Project Settings → Script Properties and add:
   - `STRAVA_CLIENT_ID`: Your Strava client ID
   - `STRAVA_CLIENT_SECRET`: Your Strava client secret  
   - `STRAVA_REFRESH_TOKEN`: The refresh token from step 2

### 4. Set Up Real-time Webhooks (Recommended)

1. **Deploy as Web App**:
   - Click Deploy → New deployment → Web app
   - Description: "Strava Webhook Endpoint"
   - Execute as: Me
   - Who has access: Anyone
   - Click "Deploy" and copy the Web App URL

2. **Configure Webhook**:
   - Add Script Property: `WEBHOOK_CALLBACK_URL` = Your Web App URL
   - Run `main()` once to authorize Calendar access
   - Run `registerWebhook()` to enable real-time sync

3. **Set up backup polling**:
   - Run `createBackupSyncTrigger()` for daily backup sync

### 5. Alternative: Polling Mode
If you prefer polling instead of webhooks:
- Run `main()` once to authorize permissions
- Run `createFrequentSyncTrigger()` for 15-minute polling

## Project Structure

```
├── src/
│   └── main.js              # Google Apps Script code
├── docs/
│   ├── setup-guide.md       # Detailed setup instructions
│   └── troubleshooting.md   # Common issues and solutions
├── .github/
│   └── copilot-instructions.md
└── README.md               # This file
```

## Configuration

Edit these values in Google Apps Script's Script Properties:

| Property | Description |
|----------|-------------|
| `STRAVA_CLIENT_ID` | Your Strava app client ID |
| `STRAVA_CLIENT_SECRET` | Your Strava app client secret |
| `STRAVA_REFRESH_TOKEN` | OAuth refresh token from authorization |

## Usage

### Real-time Mode (Recommended)
With webhooks enabled, activities appear in your calendar **instantly** when you finish them on Strava!

### Backup Polling
Daily backup sync runs at 8 AM to catch any missed webhook events.

### Available Functions
- `main()` - Main sync function (polling mode or backup)
- `doPost()` - Webhook handler (called automatically by Strava)
- `doGet()` - Webhook verification (called automatically by Strava)
- `registerWebhook()` - Set up real-time sync
- `listWebhooks()` - Check active webhook subscriptions
- `unregisterWebhook()` - Disable real-time sync
- `testCalendarAccess()` - Test calendar permissions
- `recoverThisWeeksActivities()` - Recover missing activities from past 7 days
- `createBackupSyncTrigger()` - Daily backup polling
- `createFrequentSyncTrigger()` - 15-minute polling (legacy mode)
- `deleteSyncTriggers()` - Stop all automatic syncing

## Configuration

Edit these values in Google Apps Script's Script Properties:

| Property | Description | Required |
|----------|-------------|----------|
| `STRAVA_CLIENT_ID` | Your Strava app client ID | ✅ |
| `STRAVA_CLIENT_SECRET` | Your Strava app client secret | ✅ |
| `STRAVA_REFRESH_TOKEN` | OAuth refresh token from authorization | ✅ |
| `WEBHOOK_CALLBACK_URL` | Your deployed Web App URL | For webhooks |
| `STRAVA_VERIFY_TOKEN` | Webhook verification token | Auto-generated |
| `WEBHOOK_SUBSCRIPTION_ID` | Active webhook subscription ID | Auto-saved |

## Troubleshooting

See `docs/troubleshooting.md` for common issues and solutions.

## License

MIT License - see LICENSE file for details.
