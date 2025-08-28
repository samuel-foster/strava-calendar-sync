/**
 * Strava to Google Calendar Sync
 * 
 * Automatically syncs Strava activities to Google Calendar.
 * 
 * Setup:
 * 1. Set Script Properties: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN
 * 2. Run main() once to authorize Calendar access
 * 3. Add a time-driven trigger to run main() every 15 minutes
 * 
 * @author Your Name
 * @version 1.0.0
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
 * Creates a trigger to run main() every 15 minutes
 * Run this function once to set up automatic syncing
 */
function createSyncTrigger() {
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
    
  console.log('Created sync trigger - will run every 15 minutes');
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
