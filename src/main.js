/**
 * Strava to Google Calendar Sync
 * 
 * Automatically syncs Strava activities to Google Calendar using webhooks for real-time sync.
 * 
 * Setup:
 * 1. Set Script Properties: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN
 * 2. Run main() once to authorize Calendar access
 * 3. Deploy as Web App (for webhook endpoint)
 * 4. Run registerWebhook() to set up real-time sync
 * 5. Optional: Add backup polling trigger (daily)
 * 
 * @author Samuel Foster
 * @version 2.0.0
 */

/**
 * Main function - entry point for the sync process
 * Run this manually once, then set up a trigger to run automatically
 */
function main() {
  try {
    var props = PropertiesService.getScriptProperties();
    var clientId = props.getProperty('STRAVA_CLIENT_ID');
    var clientSecret = props.getProperty('STRAVA_CLIENT_SECRET');
    var refreshToken = props.getProperty('STRAVA_REFRESH_TOKEN');
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing required properties. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_REFRESH_TOKEN in Script Properties.');
    }
    
    // Ensure access token is fresh
    var accessToken = refreshAccessTokenIfNeeded(clientId, clientSecret, refreshToken);
    
    // Sync activities to calendar
    syncActivitiesToCalendar(accessToken);
    
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error.toString());
    // Optionally send email notification on error
    // MailApp.sendEmail('your-email@example.com', 'Strava Sync Error', error.toString());
  }
}

/**
 * Refreshes the Strava access token if it's expired or missing
 * @param {string} clientId - Strava app client ID
 * @param {string} clientSecret - Strava app client secret  
 * @param {string} refreshToken - Strava refresh token
 * @returns {string} Valid access token
 */
function refreshAccessTokenIfNeeded(clientId, clientSecret, refreshToken) {
  var props = PropertiesService.getScriptProperties();
  var accessToken = props.getProperty('STRAVA_ACCESS_TOKEN');
  var expiresAt = Number(props.getProperty('STRAVA_EXPIRES_AT') || '0');
  var nowSec = Math.floor(Date.now() / 1000);
  
  // Refresh if token is missing or expires within 60 seconds
  if (!accessToken || nowSec >= expiresAt - 60) {
    console.log('Refreshing Strava access token...');
    
    var payload = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    };
    
    var response = UrlFetchApp.fetch('https://www.strava.com/oauth/token', {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('Failed to refresh Strava token: ' + response.getContentText());
    }
    
    var tokenData = JSON.parse(response.getContentText());
    
    // Save new tokens
    props.setProperty('STRAVA_ACCESS_TOKEN', tokenData.access_token);
    props.setProperty('STRAVA_REFRESH_TOKEN', tokenData.refresh_token);
    props.setProperty('STRAVA_EXPIRES_AT', String(tokenData.expires_at || (nowSec + 21600)));
    
    accessToken = tokenData.access_token;
    console.log('Token refreshed successfully');
  }
  
  return accessToken;
}

/**
 * Fetches new Strava activities and creates Google Calendar events
 * @param {string} accessToken - Valid Strava access token
 */
function syncActivitiesToCalendar(accessToken) {
  var props = PropertiesService.getScriptProperties();
  var lastActivityId = props.getProperty('LAST_ACTIVITY_ID') || '0';
  
  // Try to get Strava calendar first, fallback to default
  var calendar;
  try {
    var stravaCalendars = CalendarApp.getCalendarsByName('Strava');
    if (stravaCalendars && stravaCalendars.length > 0) {
      calendar = stravaCalendars[0];
      console.log('Using Strava calendar');
    } else {
      calendar = CalendarApp.getDefaultCalendar();
      console.log('Using default calendar (Strava calendar not found)');
    }
  } catch (error) {
    calendar = CalendarApp.getDefaultCalendar();
    console.log('Fallback to default calendar due to error:', error.toString());
  }
  
  if (!calendar) {
    throw new Error('Unable to access any calendar. Please check permissions.');
  }
  
  console.log('Fetching activities since ID:', lastActivityId);
  
  var page = 1;
  var perPage = 30;
  var newLastId = Number(lastActivityId);
  var activitiesProcessed = 0;
  
  while (true) {
    var url = 'https://www.strava.com/api/v3/athlete/activities?per_page=' + perPage + '&page=' + page;
    
    var response = UrlFetchApp.fetch(url, {
      headers: { 
        Authorization: 'Bearer ' + accessToken 
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('Strava API error: ' + response.getResponseCode() + ' ' + response.getContentText());
    }
    
    var activities = JSON.parse(response.getContentText() || '[]');
    
    if (!activities || activities.length === 0) {
      break; // No more activities
    }
    
    // Process activities from oldest to newest
    activities.reverse();
    
    activities.forEach(function(activity) {
      var activityId = Number(activity.id);
      
      // Skip if we've already processed this activity
      if (activityId <= Number(lastActivityId)) {
        return;
      }
      
      try {
        createCalendarEvent(calendar, activity);
        activitiesProcessed++;
        
        if (activityId > newLastId) {
          newLastId = activityId;
        }
      } catch (error) {
        console.error('Failed to create event for activity', activityId, ':', error.toString());
      }
    });
    
    page++;
    
    // Stop if we got fewer results than requested (last page)
    if (activities.length < perPage) {
      break;
    }
  }
  
  // Update the last processed activity ID
  if (newLastId > Number(lastActivityId)) {
    props.setProperty('LAST_ACTIVITY_ID', String(newLastId));
    console.log('Updated last activity ID to:', newLastId);
  }
  
  console.log('Processed', activitiesProcessed, 'new activities');
}

/**
 * Creates a Google Calendar event for a Strava activity
 * @param {Calendar} calendar - Google Calendar instance
 * @param {Object} activity - Strava activity object
 */
function createCalendarEvent(calendar, activity) {
  var activityId = activity.id;
  var startTime = new Date(activity.start_date);
  var durationMs = (activity.elapsed_time || 0) * 1000;
  var endTime = new Date(startTime.getTime() + durationMs);
  
  var title = activity.name || activity.type || 'Activity';
  
  var description = [
    'Strava ID: ' + activityId,
    'Type: ' + (activity.type || 'Unknown'),
    'Distance: ' + formatDistance(activity.distance || 0),
    'Duration: ' + formatDuration(activity.elapsed_time || 0),
    'Moving Time: ' + formatDuration(activity.moving_time || 0)
  ];
  
  if (activity.average_speed) {
    description.push('Avg Speed: ' + formatSpeed(activity.average_speed));
  }
  
  if (activity.total_elevation_gain) {
    description.push('Elevation Gain: ' + Math.round(activity.total_elevation_gain) + 'm');
  }
  
  if (activity.description) {
    description.push('');
    description.push(activity.description);
  }
  
  // Check for existing event to avoid duplicates
  var existingEvents = calendar.getEvents(startTime, endTime, {
    search: 'Strava ID: ' + activityId
  });
  
  if (existingEvents && existingEvents.length > 0) {
    console.log('Event already exists for activity', activityId);
    return;
  }
  
  // Create the calendar event
  var event = calendar.createEvent(title, startTime, endTime, {
    description: description.join('\n'),
    location: activity.location_city || activity.location_country || ''
  });
  
  console.log('Created calendar event for activity:', activityId, '-', title);
}

/**
 * Formats distance in meters to a readable string
 * @param {number} distanceMeters - Distance in meters
 * @returns {string} Formatted distance
 */
function formatDistance(distanceMeters) {
  var km = distanceMeters / 1000;
  if (km >= 1) {
    return km.toFixed(2) + ' km';
  } else {
    return Math.round(distanceMeters) + ' m';
  }
}

/**
 * Formats duration in seconds to a readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  var secs = seconds % 60;
  
  if (hours > 0) {
    return hours + 'h ' + minutes + 'm ' + secs + 's';
  } else if (minutes > 0) {
    return minutes + 'm ' + secs + 's';
  } else {
    return secs + 's';
  }
}

/**
 * Formats speed in m/s to a readable string
 * @param {number} speedMs - Speed in meters per second
 * @returns {string} Formatted speed
 */
function formatSpeed(speedMs) {
  var kmh = speedMs * 3.6;
  return kmh.toFixed(1) + ' km/h';
}

/**
 * Test function to check calendar access and permissions
 * Run this first if you're having calendar issues
 */
function testCalendarAccess() {
  try {
    console.log('Testing calendar access...');
    
    // Test default calendar
    var defaultCal = CalendarApp.getDefaultCalendar();
    console.log('Default calendar:', defaultCal ? defaultCal.getName() : 'FAILED');
    
    // Test Strava calendar
    var stravaCalendars = CalendarApp.getCalendarsByName('Strava');
    console.log('Strava calendars found:', stravaCalendars.length);
    
    if (stravaCalendars.length > 0) {
      console.log('Strava calendar name:', stravaCalendars[0].getName());
      console.log('Strava calendar ID:', stravaCalendars[0].getId());
    }
    
    // List all calendars
    var allCalendars = CalendarApp.getAllCalendars();
    console.log('All available calendars:');
    allCalendars.forEach(function(cal) {
      console.log('- ' + cal.getName() + ' (ID: ' + cal.getId() + ')');
    });
    
    console.log('Calendar access test completed successfully');
  } catch (error) {
    console.error('Calendar access test failed:', error.toString());
  }
}

// =============================================================================
// WEBHOOK FUNCTIONS - Real-time sync when activities are completed
// =============================================================================

/**
 * Handles incoming Strava webhook events (POST requests)
 * This function is called automatically when Strava sends activity updates
 */
function doPost(e) {
  try {
    console.log('Received webhook request');
    
    if (!e || !e.postData) {
      console.log('No POST data received');
      return ContentService.createTextOutput('OK');
    }
    
    var event = JSON.parse(e.postData.contents || '{}');
    console.log('Webhook event:', JSON.stringify(event));
    
    // Only process new activity creation events
    if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
      console.log('Ignoring event - not a new activity creation');
      return ContentService.createTextOutput('OK');
    }
    
    console.log('Processing new activity webhook for ID:', event.object_id);
    
    // Get credentials
    var props = PropertiesService.getScriptProperties();
    var clientId = props.getProperty('STRAVA_CLIENT_ID');
    var clientSecret = props.getProperty('STRAVA_CLIENT_SECRET');
    var refreshToken = props.getProperty('STRAVA_REFRESH_TOKEN');
    
    if (!clientId || !clientSecret || !refreshToken) {
      console.error('Missing Strava credentials');
      return ContentService.createTextOutput('ERROR: Missing credentials');
    }
    
    // Get fresh access token
    var accessToken = refreshAccessTokenIfNeeded(clientId, clientSecret, refreshToken);
    
    // Fetch the specific activity details
    var activityUrl = 'https://www.strava.com/api/v3/activities/' + event.object_id;
    var response = UrlFetchApp.fetch(activityUrl, {
      headers: { Authorization: 'Bearer ' + accessToken },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      var activity = JSON.parse(response.getContentText());
      
      // Get calendar
      var calendar = getStravaCalendar();
      
      // Create calendar event
      createCalendarEvent(calendar, activity);
      
      // Update last activity ID to prevent reprocessing in polling
      var currentLastId = props.getProperty('LAST_ACTIVITY_ID') || '0';
      if (Number(activity.id) > Number(currentLastId)) {
        props.setProperty('LAST_ACTIVITY_ID', String(activity.id));
      }
      
      console.log('Successfully processed webhook for activity:', event.object_id);
    } else {
      console.error('Failed to fetch activity details:', response.getResponseCode(), response.getContentText());
    }
    
    return ContentService.createTextOutput('OK');
    
  } catch (error) {
    console.error('Webhook processing failed:', error.toString());
    return ContentService.createTextOutput('ERROR: ' + error.toString());
  }
}

/**
 * Handles webhook verification (GET requests from Strava)
 * Called when registering the webhook subscription
 */
function doGet(e) {
  try {
    console.log('Received webhook verification request');
    
    if (!e || !e.parameter) {
      console.log('No parameters received');
      return ContentService.createTextOutput('No parameters');
    }
    
    var mode = e.parameter['hub.mode'];
    var token = e.parameter['hub.verify_token'];
    var challenge = e.parameter['hub.challenge'];
    
    console.log('Verification params - mode:', mode, 'token:', token, 'challenge:', challenge);
    
    // Get expected verify token
    var props = PropertiesService.getScriptProperties();
    var expectedToken = props.getProperty('STRAVA_VERIFY_TOKEN') || 'strava_webhook_verify';
    
    if (mode === 'subscribe' && token === expectedToken) {
      console.log('Webhook verification successful');
      return ContentService.createTextOutput(challenge);
    } else {
      console.error('Webhook verification failed - invalid token or mode');
      return ContentService.createTextOutput('Verification failed');
    }
  } catch (error) {
    console.error('Webhook verification error:', error.toString());
    return ContentService.createTextOutput('ERROR: ' + error.toString());
  }
}

/**
 * Helper function to get Strava calendar with fallback to default
 * @returns {Calendar} Google Calendar instance
 */
function getStravaCalendar() {
  try {
    var stravaCalendars = CalendarApp.getCalendarsByName('Strava');
    if (stravaCalendars && stravaCalendars.length > 0) {
      console.log('Using Strava calendar for webhook');
      return stravaCalendars[0];
    }
  } catch (error) {
    console.error('Error accessing Strava calendar:', error.toString());
  }
  
  console.log('Using default calendar for webhook (Strava calendar not found)');
  return CalendarApp.getDefaultCalendar();
}

/**
 * Registers a webhook with Strava for real-time activity updates
 * Run this once after deploying as a web app
 */
function registerWebhook() {
  try {
    console.log('Registering Strava webhook...');
    
    var props = PropertiesService.getScriptProperties();
    var clientId = props.getProperty('STRAVA_CLIENT_ID');
    var clientSecret = props.getProperty('STRAVA_CLIENT_SECRET');
    var callbackUrl = props.getProperty('WEBHOOK_CALLBACK_URL');
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET');
    }
    
    if (!callbackUrl) {
      throw new Error('Missing WEBHOOK_CALLBACK_URL - deploy as web app first and add the URL to Script Properties');
    }
    
    // Set verify token if not already set
    var verifyToken = props.getProperty('STRAVA_VERIFY_TOKEN');
    if (!verifyToken) {
      verifyToken = 'strava_webhook_verify_' + Utilities.getUuid().slice(0, 8);
      props.setProperty('STRAVA_VERIFY_TOKEN', verifyToken);
    }
    
    // Register webhook with Strava
    var payload = {
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken
    };
    
    var response = UrlFetchApp.fetch('https://www.strava.com/api/v3/push_subscriptions', {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    
    console.log('Webhook registration response:', response.getResponseCode(), response.getContentText());
    
    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      var subscriptionData = JSON.parse(response.getContentText());
      props.setProperty('WEBHOOK_SUBSCRIPTION_ID', String(subscriptionData.id));
      console.log('Webhook registered successfully! Subscription ID:', subscriptionData.id);
      console.log('Real-time sync is now active - new activities will appear immediately in your calendar');
    } else {
      throw new Error('Failed to register webhook: ' + response.getContentText());
    }
    
  } catch (error) {
    console.error('Webhook registration failed:', error.toString());
  }
}

/**
 * Lists all active webhook subscriptions
 * Use this to check if webhook is properly registered
 */
function listWebhooks() {
  try {
    var props = PropertiesService.getScriptProperties();
    var clientId = props.getProperty('STRAVA_CLIENT_ID');
    var clientSecret = props.getProperty('STRAVA_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET');
    }
    
    var url = 'https://www.strava.com/api/v3/push_subscriptions?client_id=' + clientId + '&client_secret=' + clientSecret;
    
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true
    });
    
    console.log('Webhook list response:', response.getResponseCode(), response.getContentText());
    
    if (response.getResponseCode() === 200) {
      var subscriptions = JSON.parse(response.getContentText());
      console.log('Active webhook subscriptions:', subscriptions.length);
      subscriptions.forEach(function(sub) {
        console.log('- ID:', sub.id, 'URL:', sub.callback_url, 'Created:', sub.created_at);
      });
    }
    
  } catch (error) {
    console.error('Failed to list webhooks:', error.toString());
  }
}

/**
 * Unregisters the webhook subscription
 * Use this to stop real-time sync
 */
function unregisterWebhook() {
  try {
    var props = PropertiesService.getScriptProperties();
    var clientId = props.getProperty('STRAVA_CLIENT_ID');
    var clientSecret = props.getProperty('STRAVA_CLIENT_SECRET');
    var subscriptionId = props.getProperty('WEBHOOK_SUBSCRIPTION_ID');
    
    if (!subscriptionId) {
      console.log('No webhook subscription ID found');
      return;
    }
    
    var url = 'https://www.strava.com/api/v3/push_subscriptions/' + subscriptionId + 
              '?client_id=' + clientId + '&client_secret=' + clientSecret;
    
    var response = UrlFetchApp.fetch(url, {
      method: 'delete',
      muteHttpExceptions: true
    });
    
    console.log('Webhook unregister response:', response.getResponseCode(), response.getContentText());
    
    if (response.getResponseCode() === 204 || response.getResponseCode() === 200) {
      props.deleteProperty('WEBHOOK_SUBSCRIPTION_ID');
      console.log('Webhook unregistered successfully');
    } else {
      console.error('Failed to unregister webhook:', response.getContentText());
    }
    
  } catch (error) {
    console.error('Webhook unregistration failed:', error.toString());
  }
}

/**
 * Recovers and re-adds Strava activities from the past week
 * Run this once to backfill missing activities from this week
 */
function recoverThisWeeksActivities() {
  try {
    console.log('Starting recovery of this week\'s activities...');
    
    var props = PropertiesService.getScriptProperties();
    var clientId = props.getProperty('STRAVA_CLIENT_ID');
    var clientSecret = props.getProperty('STRAVA_CLIENT_SECRET');
    var refreshToken = props.getProperty('STRAVA_REFRESH_TOKEN');
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing required properties. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_REFRESH_TOKEN in Script Properties.');
    }
    
    // Get fresh access token
    var accessToken = refreshAccessTokenIfNeeded(clientId, clientSecret, refreshToken);
    
    // Get calendar
    var calendar;
    var stravaCalendars = CalendarApp.getCalendarsByName('Strava');
    if (stravaCalendars && stravaCalendars.length > 0) {
      calendar = stravaCalendars[0];
      console.log('Using Strava calendar for recovery');
    } else {
      calendar = CalendarApp.getDefaultCalendar();
      console.log('Using default calendar for recovery (Strava calendar not found)');
    }
    
    // Calculate date range for this week (last 7 days)
    var now = new Date();
    var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var afterTimestamp = Math.floor(weekAgo.getTime() / 1000);
    
    console.log('Fetching activities after:', new Date(afterTimestamp * 1000));
    
    // Fetch activities from the past week
    var url = 'https://www.strava.com/api/v3/athlete/activities?after=' + afterTimestamp + '&per_page=100';
    
    var response = UrlFetchApp.fetch(url, {
      headers: { 
        Authorization: 'Bearer ' + accessToken 
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('Strava API error: ' + response.getResponseCode() + ' ' + response.getContentText());
    }
    
    var activities = JSON.parse(response.getContentText() || '[]');
    console.log('Found', activities.length, 'activities from the past week');
    
    var recoveredCount = 0;
    
    // Process each activity
    activities.forEach(function(activity) {
      try {
        var activityId = activity.id;
        var startTime = new Date(activity.start_date);
        var durationMs = (activity.elapsed_time || 0) * 1000;
        var endTime = new Date(startTime.getTime() + durationMs);
        
        // Check if event already exists
        var existingEvents = calendar.getEvents(startTime, endTime, {
          search: 'Strava ID: ' + activityId
        });
        
        if (existingEvents && existingEvents.length > 0) {
          console.log('Event already exists for activity', activityId, '- skipping');
          return;
        }
        
        // Create the event
        createCalendarEvent(calendar, activity);
        recoveredCount++;
        
        console.log('Recovered activity:', activityId, '-', activity.name || activity.type);
        
        // Small delay to avoid rate limiting
        Utilities.sleep(100);
        
      } catch (error) {
        console.error('Failed to recover activity', activity.id, ':', error.toString());
      }
    });
    
    console.log('Recovery completed successfully. Recovered', recoveredCount, 'activities.');
    
  } catch (error) {
    console.error('Recovery failed:', error.toString());
  }
}

/**
 * Creates a trigger to run main() daily as backup
 * Use this for backup polling in case webhooks miss any activities
 */
function createBackupSyncTrigger() {
  // Delete existing backup triggers first
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create daily backup trigger
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(8) // Run at 8 AM daily
    .create();
    
  console.log('Created daily backup sync trigger - will run at 8 AM daily as backup to webhooks');
}

/**
 * Creates a trigger to run main() every 15 minutes (legacy polling mode)
 * Use this if you want frequent polling instead of webhooks
 */
function createFrequentSyncTrigger() {
  // Delete existing triggers first
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyMinutes(15)
    .create();
    
  console.log('Created frequent sync trigger - will run every 15 minutes (legacy polling mode)');
}

/**
 * Deletes all triggers for the main() function
 * Use this to stop automatic syncing
 */
function deleteSyncTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  console.log('Deleted all sync triggers');
}
