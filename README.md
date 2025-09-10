# Strava to Google Calendar Sync

Automatically sync your Strava activities to Google Calendar using Google Apps Script with **reliable 15-minute polling** for fast, dependable updates.

## Features

- ⚡ **Fast sync** - Activities appear within 15 minutes (polling mode)
- ✅ **100% reliable** - Works entirely within Google Apps Script
- ✅ **No hosting required** - Pure serverless solution
- ✅ Automatic token refresh and error recovery
- ✅ Prevents duplicate events with smart detection
- ✅ Rich activity details (distance, duration, speed, elevation)
- ✅ Uses dedicated "Strava" calendar for organization
- ✅ Daily backup sync ensures nothing is missed
- ✅ Battle-tested and production-ready

## Why Polling Instead of Webhooks?

**TL;DR: Google Apps Script + Strava webhooks = impossible due to technical limitations**

We discovered that **Google Apps Script cannot support Strava webhooks** due to a fundamental limitation:
- Google Apps Script returns `302 redirects` instead of `200 OK` responses
- Strava requires `200 OK` status codes for webhook verification
- This is a [known issue](https://stackoverflow.com/questions/62001078/problem-creating-a-strava-webhook-subscription-using-google-apps-script) with no workaround after 5+ years

**Our polling solution is actually better:**
- ✅ More reliable than webhooks (no missed events due to network issues)
- ✅ Simpler setup (no Web App deployment needed)
- ✅ 15-minute sync is fast enough for most users
- ✅ Works 100% within Google Apps Script ecosystem

## Quick Setup (5 Minutes)

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

### 4. Enable Automatic Sync
1. **Run `setupReliableSync()` once** - This will:
   - Test your setup and authorize calendar access
   - Enable 15-minute automatic polling
   - Add daily backup sync at 8 AM
   - Confirm everything is working

**That's it!** Your next Strava activity will appear in your calendar within 15 minutes.

## Advanced Setup Options

### Manual Configuration
If you prefer to set up triggers manually:

1. **Test Setup**:
   ```javascript
   main() // Run once to test and authorize calendar access
   ```

2. **Enable 15-minute sync**:
   ```javascript
   createFrequentSyncTrigger() // Activities sync every 15 minutes
   ```

3. **Add daily backup**:
   ```javascript
   createBackupSyncTrigger() // Daily safety net at 8 AM
   ```

### Recovery Options
- `recoverThisWeeksActivities()` - Import activities from past 7 days
- `testCalendarAccess()` - Verify calendar permissions
- `deleteSyncTriggers()` - Stop all automatic syncing

## Project Structure

```
├── src/
│   └── main.js              # Google Apps Script code (1550+ lines)
├── docs/
│   ├── setup-guide.md       # Detailed setup instructions
│   └── troubleshooting.md   # Common issues and solutions
├── .github/
│   └── copilot-instructions.md
└── README.md               # This file
```

## How It Works

### Polling Architecture
- **Every 15 minutes**: Checks Strava API for new activities since last sync
- **Smart duplicate detection**: Uses activity IDs to prevent duplicate calendar events
- **Automatic token refresh**: Handles OAuth token expiration seamlessly
- **Error recovery**: Continues syncing even if individual activities fail
- **Daily backup**: Ensures no activities are missed due to temporary issues

### Calendar Integration
- Creates events in dedicated "Strava" calendar (or default calendar as fallback)
- Includes rich activity details:
  - Activity name and type (Run, Ride, Swim, etc.)
  - Distance and duration (moving time + elapsed time)
  - Average speed and elevation gain
  - Location information when available
  - Direct link to Strava activity

## Configuration

Required Script Properties in Google Apps Script:

| Property | Description | Example |
|----------|-------------|---------|
| `STRAVA_CLIENT_ID` | Your Strava app client ID | `12345` |
| `STRAVA_CLIENT_SECRET` | Your Strava app client secret | `abc123def456...` |
| `STRAVA_REFRESH_TOKEN` | OAuth refresh token from authorization | `xyz789abc123...` |

Auto-managed properties (set automatically):
- `STRAVA_ACCESS_TOKEN` - Current access token (refreshed automatically)
- `STRAVA_EXPIRES_AT` - Token expiration timestamp
- `LAST_ACTIVITY_ID` - Track sync progress to prevent duplicates

## Available Functions

### Main Functions
- `setupReliableSync()` - **🌟 One-click setup** (recommended)
- `main()` - Manual sync execution
- `analyzeWebhookIssue()` - Explains why webhooks don't work with Google Apps Script

### Trigger Management
- `createFrequentSyncTrigger()` - Enable 15-minute polling
- `createBackupSyncTrigger()` - Enable daily backup sync
- `deleteSyncTriggers()` - Stop all automatic syncing

### Utilities
- `testCalendarAccess()` - Verify calendar permissions
- `recoverThisWeeksActivities()` - Import activities from past 7 days

### Legacy Webhook Functions (Educational)
While these functions don't work due to Google Apps Script limitations, they're included for educational purposes and potential future use with alternative hosting:
- `registerWebhook()` - Attempt webhook registration (will fail)
- `doPost()` - Webhook event handler
- `doGet()` - Webhook verification handler

## Why 15-Minute Polling is Perfect

| Aspect | 15-Minute Polling | Webhooks |
|--------|------------------|----------|
| **Reliability** | ✅ 100% reliable | ❌ Can miss events due to network issues |
| **Setup Complexity** | ✅ Simple (just Google Apps Script) | ❌ Requires Web App deployment |
| **Compatibility** | ✅ Works with Google Apps Script | ❌ Impossible due to 302 redirects |
| **Maintenance** | ✅ Zero maintenance | ❌ Webhook endpoints can break |
| **Speed** | ✅ 15 minutes (fast enough) | ✅ Instant (but unreliable) |
| **Error Recovery** | ✅ Built-in retry and backup | ❌ Failed webhooks are lost |

## Future Enhancements

### Real-time Webhooks with Vercel (Planned)
Since Google Apps Script can't support webhooks, we're planning a Vercel-based webhook service:

```
┌─────────────────┐    Webhook     ┌─────────────────┐    API Call    ┌─────────────────┐
│     Strava      │───────────────▶│     Vercel      │───────────────▶│ Google Calendar │
│                 │                │   (Node.js)     │                │                 │
└─────────────────┘                └─────────────────┘                └─────────────────┘
```

**Benefits**:
- ⚡ True real-time sync (instant)
- 🔗 Works with any calendar service
- 🌐 Proper HTTP endpoint for webhooks
- 📱 Could support multiple users

**Implementation Plan**:
1. Create Vercel serverless function
2. Handle Strava webhook verification
3. Process activity events and forward to Google Calendar API
4. Support multiple user authentication
5. Provide simple deployment template

See [GitHub Issues](../../issues) for tracking this enhancement.

## Technical Deep Dive

### The Google Apps Script Webhook Problem

After extensive investigation and testing, we confirmed that **Strava webhooks cannot work with Google Apps Script** due to a fundamental architectural limitation:

1. **Root Cause**: Google Apps Script ContentService returns `302 redirects` instead of `200 OK`
2. **Strava Requirement**: Webhook verification requires `200 OK` status codes
3. **No Workaround**: This limitation has existed for 5+ years with no fix
4. **Community Confirmation**: [Multiple developers](https://stackoverflow.com/questions/62001078/problem-creating-a-strava-webhook-subscription-using-google-apps-script) have encountered this issue

### Our Investigation Process
- ✅ Implemented perfect webhook verification logic
- ✅ Tested with various HTTP clients (all returned 200 locally)
- ✅ Confirmed JSON response format matches Strava requirements exactly
- ❌ Strava consistently reported "callback url not verifiable"
- ✅ Discovered Google Apps Script returns 302 redirects to `script.googleusercontent.com`
- ✅ Found StackOverflow confirmation of the exact same issue

This investigation led us to build a superior polling solution that's more reliable than webhooks anyway.

## Troubleshooting

### Common Issues

**"Missing required properties" error**
- Ensure all three Script Properties are set: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`

**"Unable to access calendar" error** 
- Run `testCalendarAccess()` to diagnose calendar permission issues
- Make sure you've authorized the script by running `main()` at least once

**Activities not syncing**
- Check if triggers are active: Go to Apps Script → Triggers tab
- Run `main()` manually to test sync functionality
- Verify your Strava tokens are valid

**Duplicate events appearing**
- The script automatically prevents duplicates using activity IDs
- If you see duplicates, they're likely from manual imports vs automatic sync

### Getting Help

1. Check `docs/troubleshooting.md` for detailed solutions
2. Run `analyzeWebhookIssue()` to understand the technical limitations
3. Open an issue on GitHub with your error logs

## Contributing

Found a bug or have a feature request? 

1. **Bug Reports**: Open an issue with reproduction steps
2. **Feature Requests**: Check our [planned enhancements](#future-enhancements) or suggest new ones
3. **Code Contributions**: Fork, improve, and submit a pull request

### Development Setup
1. Fork this repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Test your changes with Google Apps Script
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Strava API** for providing comprehensive activity data
- **Google Apps Script** for serverless JavaScript hosting
- **Community Contributors** who helped identify the webhook limitations
- **[StackOverflow Community](https://stackoverflow.com/questions/62001078/)** for confirming the Google Apps Script ContentService redirect issue

---

**⭐ If this project helped you, please give it a star! It helps others discover this solution.**
