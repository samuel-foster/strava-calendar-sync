# Enhancement: Real-time Webhook Support via Vercel

## Summary
Implement true real-time Strava activity sync using Vercel serverless functions to overcome Google Apps Script webhook limitations.

## Background
We've confirmed that **Google Apps Script cannot support Strava webhooks** due to ContentService returning 302 redirects instead of 200 OK responses. This is a fundamental limitation that has existed for 5+ years with no workaround.

Our current polling solution (15-minute intervals) is reliable and fast enough for most users, but some users may want instant sync for:
- Immediate social sharing
- Real-time coaching/training feedback
- Integration with other real-time fitness apps

## Proposed Solution

### Architecture
```
┌─────────────────┐    Webhook     ┌─────────────────┐    API Call    ┌─────────────────┐
│     Strava      │───────────────▶│     Vercel      │───────────────▶│ Google Calendar │
│   Activities    │                │   (Node.js)     │                │   + Others      │
└─────────────────┘                └─────────────────┘                └─────────────────┘
```

### Implementation Plan

#### Phase 1: Basic Webhook Service
- [ ] Create Vercel serverless function (`/api/webhook`)
- [ ] Implement Strava webhook verification (`GET /api/webhook`)
- [ ] Handle activity creation events (`POST /api/webhook`)
- [ ] Forward to Google Calendar API using service account
- [ ] Deploy with one-click Vercel template

#### Phase 2: Multi-user Support
- [ ] Add user authentication (OAuth)
- [ ] Support multiple calendar integrations per user
- [ ] User dashboard for webhook management
- [ ] Secure credential storage

#### Phase 3: Enhanced Features
- [ ] Support additional calendar services (Outlook, Apple Calendar)
- [ ] Real-time activity notifications
- [ ] Custom webhook filters (activity types, privacy settings)
- [ ] Analytics and sync history

### Technical Considerations

#### Advantages over Google Apps Script
- ✅ Proper HTTP status codes (200 OK)
- ✅ Standard Node.js environment
- ✅ Better error handling and logging
- ✅ Scalable for multiple users
- ✅ Can integrate with any calendar API

#### Challenges
- ❌ Requires separate hosting (though Vercel is free for personal use)
- ❌ More complex setup than pure Google Apps Script
- ❌ Need to handle user authentication securely

#### Migration Path
- Keep Google Apps Script polling as fallback/backup
- Provide easy migration instructions
- Support both deployment options

### Development Approach

1. **MVP (Minimum Viable Product)**:
   - Single-user webhook service
   - Google Calendar integration only
   - Simple Vercel deployment

2. **Template Repository**:
   - One-click deploy button
   - Environment variable configuration
   - Clear setup documentation

3. **Backwards Compatibility**:
   - Maintain Google Apps Script version
   - Provide migration guide
   - Support both architectures

### User Benefits

#### For Current Users
- Optional upgrade path to real-time sync
- Keep existing reliable polling as backup
- No forced migration

#### For New Users
- Choose between simple (polling) or advanced (webhooks) setup
- Best-in-class performance for their use case
- Future-proof architecture

### Success Metrics
- [ ] < 5 second activity-to-calendar latency
- [ ] 99.9% webhook delivery success rate
- [ ] Simple one-click deployment process
- [ ] Positive user feedback on real-time experience

## Implementation Timeline

### Week 1-2: Research & Design
- [ ] Research Vercel serverless functions
- [ ] Design user authentication flow
- [ ] Create technical specification

### Week 3-4: MVP Development
- [ ] Basic webhook endpoint
- [ ] Google Calendar integration
- [ ] Strava webhook verification
- [ ] Local testing framework

### Week 5-6: Deployment & Testing
- [ ] Vercel deployment configuration
- [ ] End-to-end testing with real Strava webhooks
- [ ] Documentation and setup guide
- [ ] Template repository creation

### Week 7-8: User Testing & Polish
- [ ] Beta testing with volunteers
- [ ] Bug fixes and improvements
- [ ] Performance optimization
- [ ] Launch preparation

## Community Input Wanted

We'd love feedback on:
1. **Priority**: How important is real-time sync vs 15-minute polling?
2. **Complexity**: Would you prefer simple polling or are you willing to use Vercel for real-time?
3. **Features**: What additional webhook features would be valuable?
4. **Calendar Services**: Besides Google Calendar, what other services should we support?

## Related Issues
- #[webhook-investigation] - Initial webhook research
- #[google-apps-script-limitations] - Documentation of technical limitations

## References
- [Strava Webhook Documentation](https://developers.strava.com/docs/webhooks/)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [StackOverflow: Google Apps Script Webhook Issue](https://stackoverflow.com/questions/62001078/problem-creating-a-strava-webhook-subscription-using-google-apps-script)
