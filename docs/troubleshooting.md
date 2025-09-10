# Troubleshooting Guide

Common issues and solutions for the Strava to Google Calendar sync.

## Webhook Issues

### Error: "Missing WEBHOOK_CALLBACK_URL" when running registerWebhook()

**Cause**: Web app not deployed or URL not added to Script Properties.

**Solution**:
1. Deploy as Web App: Deploy → New deployment → Web app
2. Copy the Web App URL 
3. Add Script Property: `WEBHOOK_CALLBACK_URL` = Your Web App URL
4. Run `registerWebhook()` again

### Webhook not receiving events

**Check these items**:
1. **Webhook registered**: Run `listWebhooks()` to verify subscription exists
2. **Web app permissions**: Ensure "Who has access" is set to "Anyone"
3. **Strava app active**: Check your Strava app isn't suspended
4. **Test with activity**: Complete a short activity to test

**Debug webhook**:
```javascript
// Check recent executions in Apps Script
// Look for doPost() calls in the execution log
```

### Events still taking 15 minutes to appear

**Cause**: Using polling triggers instead of webhooks.

**Solution**:
1. Verify webhook is registered: `listWebhooks()`
2. Delete polling triggers: `deleteSyncTriggers()`
3. Ensure web app is deployed with "Anyone" access
4. Test webhook with a new activity

### Duplicate events after enabling webhooks

**Cause**: Both webhooks and frequent polling running simultaneously.

**Solution**:
1. Delete frequent polling triggers: `deleteSyncTriggers()`
2. Set up daily backup only: `createBackupSyncTrigger()`
3. Webhooks handle real-time, daily backup catches any missed events

## Authentication Issues

### Error: "Access blocked: Strava GCal Sync has not completed the Google verification process"

**Cause**: Apps Script needs proper OAuth consent screen configuration.

**Solution**:
1. Create or link a Google Cloud Platform project
2. Set up OAuth consent screen in Cloud Console
3. Add yourself as a test user
4. Enable required APIs (Calendar API)

**Steps**:
1. Go to https://console.cloud.google.com/apis/credentials/consent
2. Choose "External" user type
3. Fill required fields (app name, support email, developer contact)
4. Under "Test users", add your Gmail address
5. In Apps Script, link to this GCP project (Project Settings → GCP Project)

### Error: "RESOURCE_EXHAUSTED" when running main()

**Cause**: Google account has reached the project creation limit.

**Solutions**:
1. **Use existing GCP project**: Create one at https://console.cloud.google.com/projectcreate
2. **Delete unused projects**: Check Cloud Resource Manager for old projects
3. **Use different Google account**: Create the script with an account that has available quota

### Error: "TypeError: Cannot read properties of undefined (reading 'getEvents')"

**Cause**: Calendar permissions not granted or calendar access issues.

**Solutions**:
1. **Re-grant permissions**: Run `main()` again and click "Review permissions" when prompted
2. **Test calendar access**: Run the `testCalendarAccess()` function to diagnose issues
3. **Check calendar exists**: Ensure your "Strava" calendar exists in Google Calendar
4. **Browser refresh**: Clear browser cache and refresh Apps Script editor

**Steps to re-authorize**:
1. In Apps Script, select `main` function and click "Run"
2. Click "Review permissions" in the authorization dialog
3. Select your Google account and click "Allow"
4. Grant Calendar and External requests permissions

### Error: "Failed to refresh Strava token"

**Cause**: Invalid refresh token or Strava app credentials.

**Solutions**:
1. **Check Script Properties**: Verify `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `STRAVA_REFRESH_TOKEN` are correct
2. **Re-authorize**: Go through the OAuth flow again to get a new refresh token
3. **Check Strava app**: Ensure the app is active and not suspended

**Steps to re-authorize**:
```bash
# 1. Open authorization URL (replace CLIENT_ID)
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&scope=activity:read_all

# 2. Get new tokens
curl.exe -X POST "https://www.strava.com/oauth/token" -F client_id=YOUR_CLIENT_ID -F client_secret=YOUR_CLIENT_SECRET -F code=NEW_CODE -F grant_type=authorization_code
```

## API Issues

### Error: "Strava API error: 401"

**Cause**: Expired or invalid access token.

**Solution**: The script should automatically refresh tokens. If it doesn't:
1. Delete `STRAVA_ACCESS_TOKEN` from Script Properties (will force refresh)
2. Verify refresh token is valid
3. Check Strava app permissions

### Error: "Strava API error: 403 Forbidden"

**Cause**: Rate limit exceeded or insufficient permissions.

**Solutions**:
1. **Rate limiting**: Reduce sync frequency (every 30 minutes instead of 15)
2. **Permissions**: Re-authorize with `activity:read_all` scope
3. **Check quotas**: Strava has daily API limits

### Error: "Strava API error: 429 Too Many Requests"

**Cause**: Exceeded Strava's rate limits.

**Solution**:
```javascript
// Add rate limiting to the script
function syncActivitiesToCalendar(accessToken) {
  // Add delay between requests
  Utilities.sleep(1000); // Wait 1 second between API calls
  
  // ... rest of function
}
```

## Calendar Issues

### Events not appearing in calendar

**Possible causes and solutions**:

1. **Wrong calendar**: 
   ```javascript
   // Check if using correct calendar
   var calendar = CalendarApp.getDefaultCalendar();
   console.log('Calendar name:', calendar.getName());
   ```

2. **Date/time issues**:
   ```javascript
   // Add logging to check dates
   console.log('Activity start:', activity.start_date);
   console.log('Parsed date:', new Date(activity.start_date));
   ```

3. **Permissions**: Re-run `main()` and grant Calendar permissions again

### Duplicate events created

**Cause**: Duplicate detection not working properly.

**Solution**: Clear existing events and reset:
```javascript
// Reset last activity ID to force clean sync
function resetSync() {
  PropertiesService.getScriptProperties().deleteProperty('LAST_ACTIVITY_ID');
}
```

### Events created with wrong times

**Cause**: Timezone issues with Strava data.

**Solution**: Strava provides times in UTC. The script should handle this correctly, but you can add timezone conversion:
```javascript
// Add timezone conversion if needed
var startTime = new Date(activity.start_date);
// Convert to your local timezone if required
```

## Script Execution Issues

### Trigger not running

**Check these items**:
1. **Trigger exists**: Apps Script → Triggers → verify trigger is listed
2. **Trigger configuration**: Should be "Time-driven" with correct interval
3. **Execution history**: Check "Executions" tab for errors
4. **Quota limits**: Apps Script has daily execution quotas

### Script timeout errors

**Cause**: Processing too many activities at once.

**Solution**: Add pagination and limits:
```javascript
function syncActivitiesToCalendar(accessToken) {
  var perPage = 10; // Reduce from 30 to process fewer activities
  // ... rest of function
}
```

### Memory limit exceeded

**Cause**: Large number of activities or calendar events.

**Solution**: Process in smaller batches:
```javascript
// Add memory optimization
function syncActivitiesToCalendar(accessToken) {
  var maxActivities = 50; // Limit per execution
  // ... implement batching logic
}
```

## Data Issues

### Missing activity details

**Check**:
1. **Strava permissions**: Ensure `activity:read_all` scope is granted
2. **Activity privacy**: Private activities need proper scope
3. **Activity type**: Some activities may have limited data

### Incorrect activity data

**Common issues**:
- **Distance**: Strava provides meters, script converts to km
- **Duration**: Uses `elapsed_time` (includes stops) vs `moving_time`
- **Speed**: Calculated from distance and moving time

## Performance Optimization

### Reduce API calls

```javascript
// Implement smart filtering
function syncActivitiesToCalendar(accessToken) {
  // Only check activities from last 30 days
  var since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  var url = 'https://www.strava.com/api/v3/athlete/activities?after=' + since;
  // ... rest of function
}
```

### Optimize calendar operations

```javascript
// Batch calendar operations
function createCalendarEvent(calendar, activity) {
  // Check for existing events less frequently
  // Use calendar.getEvents() with date ranges instead of searching each time
}
```

## Debugging Tips

### Enable detailed logging

```javascript
// Add to main() function
function main() {
  console.log('Starting sync at', new Date());
  // ... existing code
  console.log('Sync completed at', new Date());
}
```

### Test individual functions

```javascript
// Create test functions
function testTokenRefresh() {
  var props = PropertiesService.getScriptProperties();
  var token = refreshAccessTokenIfNeeded(
    props.getProperty('STRAVA_CLIENT_ID'),
    props.getProperty('STRAVA_CLIENT_SECRET'),
    props.getProperty('STRAVA_REFRESH_TOKEN')
  );
  console.log('Token:', token);
}
```

### Monitor execution logs

1. Apps Script → Executions
2. Click on any execution to see logs
3. Look for console.log() outputs and error messages

## Getting Help

If you're still having issues:

1. **Check execution logs** in Apps Script for specific error messages
2. **Test individual components** (token refresh, API calls, calendar creation)
3. **Verify all credentials** are correct and up-to-date
4. **Review Strava app settings** for any changes or suspensions
5. **Check Google Cloud Console** for API quotas and billing issues

## FAQ

**Q: How often should I sync?**
A: Every 15-30 minutes is reasonable for personal use. Daily syncing works for less frequent athletes.

**Q: Can I sync historical activities?**
A: Yes, delete the `LAST_ACTIVITY_ID` property to sync all activities, but be mindful of API limits.

**Q: Does this work with private activities?**
A: Yes, if you authorized with `activity:read_all` scope.

**Q: Can I customize the calendar event format?**
A: Yes, modify the `createCalendarEvent()` function to change titles and descriptions.

**Q: Is my data secure?**
A: The script runs in your Google account and only you have access to the tokens and data.
