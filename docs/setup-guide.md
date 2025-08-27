# Detailed Setup Guide

This guide provides step-by-step instructions for setting up the Strava to Google Calendar sync.

## Prerequisites

- Strava account with activities
- Google account with Google Calendar
- Access to Google Apps Script (script.google.com)

## Step 1: Create Strava Application

1. **Navigate to Strava Developer Portal**
   - Go to https://www.strava.com/settings/api
   - Click "Create App" or "My API Application"

2. **Fill out the application form:**
   - **Application Name**: `Strava GCal Sync` (or any name you prefer)
   - **Category**: Choose appropriate category
   - **Club**: Leave blank unless you have a specific club
   - **Website**: `https://example.com` (or your personal website)
   - **Application Description**: "Sync Strava activities to Google Calendar"
   - **Authorization Callback Domain**: `localhost`

3. **Upload App Icon (Optional)**
   - Use the provided SVG icon or create your own
   - 512x512 pixels recommended

4. **Save and note your credentials:**
   - **Client ID**: Copy this number
   - **Client Secret**: Copy this secret (keep it secure!)

## Step 2: Authorize and Get Tokens

### 2.1 Generate Authorization URL

Replace `YOUR_CLIENT_ID` with your actual Client ID:

```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&scope=activity:read_all&approval_prompt=auto
```

### 2.2 Authorize the Application

1. Open the URL in your browser
2. Click "Authorize" to grant permissions
3. You'll be redirected to `http://localhost/?code=SOME_CODE&scope=read,activity:read_all`
4. Copy the `code` parameter from the URL

### 2.3 Exchange Code for Tokens

Use PowerShell (Windows) to exchange the code for tokens:

```powershell
curl.exe -X POST "https://www.strava.com/oauth/token" `
  -F client_id=YOUR_CLIENT_ID `
  -F client_secret=YOUR_CLIENT_SECRET `
  -F code=THE_CODE_FROM_STEP_2 `
  -F grant_type=authorization_code
```

**Alternative using Invoke-RestMethod:**

```powershell
$response = Invoke-RestMethod -Uri "https://www.strava.com/oauth/token" -Method Post -Body @{
  client_id = 'YOUR_CLIENT_ID'
  client_secret = 'YOUR_CLIENT_SECRET' 
  code = 'THE_CODE_FROM_STEP_2'
  grant_type = 'authorization_code'
} -ContentType 'application/x-www-form-urlencoded'

$response
```

### 2.4 Save the Response

The response will look like:
```json
{
  "token_type": "Bearer",
  "expires_at": 1735123456,
  "expires_in": 21600,
  "refresh_token": "abc123...",
  "access_token": "def456...",
  "athlete": { ... }
}
```

**Important**: Save the `refresh_token` - you'll need this for the Apps Script configuration.

## Step 3: Set Up Google Apps Script

### 3.1 Create New Project

1. Go to https://script.google.com
2. Click "New Project"
3. Rename the project to "Strava Calendar Sync"

### 3.2 Add the Code

1. Delete the default `myFunction()` 
2. Copy the entire contents of `src/main.js` from this repository
3. Paste it into the script editor
4. Save the project (Ctrl+S)

### 3.3 Configure Script Properties

1. Click the gear icon (Project Settings) in the left sidebar
2. Scroll down to "Script Properties"
3. Click "Add script property" and add these three properties:

   | Property | Value |
   |----------|-------|
   | `STRAVA_CLIENT_ID` | Your Strava Client ID |
   | `STRAVA_CLIENT_SECRET` | Your Strava Client Secret |
   | `STRAVA_REFRESH_TOKEN` | The refresh_token from Step 2.4 |

4. Click "Save script properties"

### 3.4 Set Up Google Cloud Project (if needed)

If you get a "RESOURCE_EXHAUSTED" error:

1. Go to https://console.cloud.google.com/projectcreate
2. Create a new project with any name
3. In Apps Script → Project Settings → Google Cloud Platform (GCP) Project
4. Click "Change project" and enter your GCP project number
5. Set up OAuth consent screen in Cloud Console:
   - Go to APIs & Services → OAuth consent screen
   - Choose "External" user type
   - Fill required fields (app name, support email)
   - Add your email as a test user

## Step 4: Test and Deploy

### 4.1 Initial Test

1. In the Apps Script editor, select the `main` function from the dropdown
2. Click "Run" (you may need to authorize permissions)
3. Grant the requested permissions:
   - Google Calendar access
   - External requests (to Strava API)
4. Check the execution log for any errors

### 4.2 Set Up Automatic Syncing

1. Click the clock icon (Triggers) in the left sidebar
2. Click "Add Trigger"
3. Configure the trigger:
   - **Choose which function to run**: `main`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Minutes timer`
   - **Select minute interval**: `Every 15 minutes` (or your preference)
4. Click "Save"

## Step 5: Verify Setup

### 5.1 Check Calendar

- Open Google Calendar
- Look for newly created events from your recent Strava activities
- Events should include activity details in the description

### 5.2 Monitor Logs

- In Apps Script, go to "Executions" to see trigger runs
- Check for any errors or warnings
- Successful runs should show "Completed"

## Customization Options

### Change Target Calendar

Replace this line in the script:
```javascript
var calendar = CalendarApp.getDefaultCalendar();
```

With:
```javascript
var calendar = CalendarApp.getCalendarById('your-calendar-id@group.calendar.google.com');
```

### Filter Activity Types

Add filtering in the `syncActivitiesToCalendar` function:
```javascript
activities.forEach(function(activity) {
  // Only sync runs and rides
  if (activity.type !== 'Run' && activity.type !== 'Ride') {
    return;
  }
  // ... rest of the code
});
```

### Adjust Sync Frequency

Change the trigger interval:
- Every 5 minutes (for faster sync)
- Every hour (for less frequent sync)
- Daily (for once-per-day sync)

## Security Notes

- Keep your Client Secret secure and never commit it to public repositories
- The refresh token allows ongoing access to your Strava data
- Apps Script properties are encrypted but consider using a dedicated Google account for this script
- Regularly review the Apps Script execution logs for any unauthorized access

## Next Steps

- Set up error notifications via email
- Add more detailed activity information to calendar events
- Implement filtering by activity duration or distance
- Add support for manual backfill of historical activities
