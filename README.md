# Strava to Google Calendar Sync

Automatically sync your Strava activities to Google Calendar using Google Apps Script.

## Features

- ✅ Syncs Strava activities to Google Calendar
- ✅ Automatic token refresh 
- ✅ Prevents duplicate events
- ✅ Configurable sync intervals
- ✅ Includes activity details (distance, duration, type)

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
5. Run `main()` once to authorize Calendar access
6. Add a time-driven trigger (every 15 minutes) for the `main()` function

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

Once set up, the script will:
1. Run every 15 minutes (or your chosen interval)
2. Fetch new Strava activities
3. Create corresponding Google Calendar events
4. Automatically refresh tokens as needed

## Troubleshooting

### Permission Issues
If you get calendar access errors:
1. Run the `testCalendarAccess()` function to diagnose issues
2. Re-run `main()` and grant permissions when prompted
3. Check that your "Strava" calendar exists in Google Calendar

### Missing Activities
If you accidentally deleted or missed some activities:
1. Run `recoverThisWeeksActivities()` to backfill the past 7 days
2. Or delete `LAST_ACTIVITY_ID` from Script Properties to re-sync all activities

### Functions Available
- `main()` - Main sync function (set this on a trigger)
- `testCalendarAccess()` - Test calendar permissions and list available calendars
- `recoverThisWeeksActivities()` - Recover missing activities from past 7 days
- `createSyncTrigger()` - Create the automatic 15-minute sync trigger
- `deleteSyncTriggers()` - Stop automatic syncing

## Customization

- **Calendar**: Modify `CalendarApp.getDefaultCalendar()` to use a specific calendar
- **Activity Filter**: Add filters by activity type or minimum distance
- **Event Format**: Customize event titles and descriptions
- **Sync Frequency**: Adjust the trigger interval

## Troubleshooting

See `docs/troubleshooting.md` for common issues and solutions.

## License

MIT License - see LICENSE file for details.
