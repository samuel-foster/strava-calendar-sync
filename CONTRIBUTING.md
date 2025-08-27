# Contributing to Strava Calendar Sync

Thank you for your interest in contributing to this project! Here are some ways you can help improve the Strava to Google Calendar sync tool.

## How to Contribute

### Reporting Issues
- Use the GitHub Issues tab to report bugs or request features
- Include details about your setup (Strava activities, Google Calendar, etc.)
- Provide error messages and logs when possible

### Suggesting Enhancements
- Open an issue with the "enhancement" label
- Describe the feature and its benefits
- Consider implementation complexity and user impact

### Code Contributions
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes to the Apps Script code
4. Test thoroughly with your own Strava/Calendar data
5. Update documentation if needed
6. Submit a pull request

## Development Guidelines

### Code Style
- Use clear, descriptive function names
- Add JSDoc comments for all functions
- Include error handling for API calls
- Log important events with `console.log()`

### Testing
- Test with various activity types (Run, Ride, Swim, etc.)
- Verify token refresh functionality
- Check calendar event creation and duplicate prevention
- Test error handling scenarios

### Documentation
- Update README.md for new features
- Add troubleshooting steps for new issues
- Include setup instructions for configuration changes

## Areas for Improvement

### High Priority
- Better error handling and recovery
- Webhook support for real-time sync
- Support for multiple calendars
- Activity filtering options

### Medium Priority
- Enhanced event formatting options
- Historical activity backfill
- Email notifications for sync status
- Performance optimizations

### Low Priority
- Support for other fitness platforms
- Advanced scheduling options
- Custom event templates
- Analytics and reporting

## Code of Conduct

- Be respectful and constructive in discussions
- Focus on improving the project for all users
- Help newcomers with setup and troubleshooting
- Acknowledge contributions from others

## Questions?

Open an issue or start a discussion if you have questions about contributing or need help getting started.
