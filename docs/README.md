# EMC Documentation Index

Welcome to the Event Management Cloud (EMC) documentation! This index will help you find the information you need.

## 🚀 Getting Started

### New Developer? Start Here!

1. **[Project Overview](./PROJECT_OVERVIEW.md)** - Architecture, folder structure, and quick commands
2. **[Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md)** - 30-second setup for local development with real API access
3. **[Development Workflow](./DEVELOPMENT_WORKFLOW.md)** - Official Adobe development workflow

## 📚 Core Documentation

### Frontend Development
- **[Frontend Guide](./FRONTEND.md)** - React/TypeScript development guide
  - Component architecture
  - State management
  - Routing with React Router
  - Adobe Spectrum UI components

- **[Event Form Guide](./EVENT_FORM.md)** - Complete event form implementation
  - Multi-step wizard with 4 main steps
  - Modular component architecture
  - Validation and data flow
  - Create and edit modes

- **[Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)** - Component extraction patterns
  - Breaking down complex forms
  - Self-contained, reusable components
  - External API integration patterns
  - Image upload with drag & drop

### Backend Development
- **[Backend Guide](./BACKEND.md)** - Adobe I/O Runtime actions guide
  - Creating actions
  - Action structure
  - Deployment
  - State management with Adobe I/O State

### API Integration
- **[API Integration](./API_INTEGRATION.md)** - Connecting frontend to backend
  - API service layer
  - Authentication
  - Error handling
  - Mock data for development

- **[API Centralization](./API_CENTRALIZATION.md)** - Centralized API management system
  - ApiService architecture
  - Type safety
  - Mock support
  - Consistent error handling

- **[Google Places API Setup](./GOOGLE_PLACES_SETUP.md)** - Google Places integration
  - API key setup and security
  - Venue autocomplete configuration
  - Cost optimization
  - Troubleshooting guide

### Testing
- **[Testing Guide](./TESTING.md)** - Unit and E2E testing patterns
  - Jest configuration
  - Testing components
  - Testing actions
  - E2E with Puppeteer

## 🔐 Local Development Features

### Dev Token Management

The EMC application includes a powerful token management system for local development:

- **[Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md)** ⚡ - Get up and running in 30 seconds
- **[Dev Token Complete Guide](./DEV_TOKEN_GUIDE.md)** 📖 - Comprehensive guide with architecture, examples, and visual diagrams
- **[Dev Token Security Model](./DEV_TOKEN_SECURITY.md)** 🔒 - Security architecture and bootstrap paths

**What is it?**
A system that lets you use real Adobe IMS tokens from production sites in your local development environment, enabling full API access without deploying to Experience Cloud Shell.

**Quick Start:**
1. Run `npm run dev`
2. Get token from adobe.com: `window.adobeIMS?.getAccessToken()`
3. Click "Dev Token" button in app and paste
4. Start making API calls!

## 🎨 UI/UX Documentation

### Layout & Navigation
- **[Top Navigation Layout](./TOP_NAV_LAYOUT.md)** - Navigation structure and user panel design
  - Top nav bar architecture
  - User panel components
  - Authentication display

- **[User Panel Implementation](./USER_PANEL_IMPLEMENTATION.md)** - Detailed user panel guide
  - Component breakdown
  - Profile display
  - Menu implementation

## 📋 Documentation by Topic

### Architecture & Design
- [Project Overview](./PROJECT_OVERVIEW.md)
- [API Centralization](./API_CENTRALIZATION.md)
- [Top Nav Layout](./TOP_NAV_LAYOUT.md)
- [Dev Token Architecture](./DEV_TOKEN_GUIDE.md#architecture)

### Development Workflow
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
- [Frontend Guide](./FRONTEND.md)
- [Backend Guide](./BACKEND.md)
- [Testing Guide](./TESTING.md)

### Integration & APIs
- [API Integration](./API_INTEGRATION.md)
- [API Centralization](./API_CENTRALIZATION.md)
- [Dev Token Guide](./DEV_TOKEN_GUIDE.md)
- [Google Places API Setup](./GOOGLE_PLACES_SETUP.md)

### UI Components
- [Frontend Guide](./FRONTEND.md)
- [Event Form Guide](./EVENT_FORM.md)
- [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)
- [User Panel Implementation](./USER_PANEL_IMPLEMENTATION.md)
- [Top Nav Layout](./TOP_NAV_LAYOUT.md)

### Local Development
- [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) ⭐
- [Dev Token Guide](./DEV_TOKEN_GUIDE.md)
- [Dev Token Security Model](./DEV_TOKEN_SECURITY.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)

## 🔍 Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start local dev server
aio app run              # Run with remote actions
aio app run --local      # Run with local actions

# Testing
aio app test             # Run unit tests
aio app test --e2e       # Run E2E tests

# Deployment
aio app deploy           # Deploy to Adobe I/O Runtime
aio app undeploy         # Remove deployment
```

### Common Tasks

| Task | Documentation |
|------|---------------|
| Set up local dev with API access | [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) |
| Set up Google Places API | [Google Places Setup](./GOOGLE_PLACES_SETUP.md) |
| Create a new component | [Frontend Guide](./FRONTEND.md) |
| Create a new backend action | [Backend Guide](./BACKEND.md) |
| Connect frontend to backend | [API Integration](./API_INTEGRATION.md) |
| Write tests | [Testing Guide](./TESTING.md) |
| Understand the architecture | [Project Overview](./PROJECT_OVERVIEW.md) |

### File Structure

```
EMC/
├── docs/                           # 📚 This documentation
│   ├── README.md                   # This index file
│   ├── PROJECT_OVERVIEW.md         # Start here!
│   ├── DEVELOPMENT_WORKFLOW.md     # How to develop
│   ├── FRONTEND.md                 # Frontend guide
│   ├── BACKEND.md                  # Backend guide
│   ├── API_INTEGRATION.md          # API guide
│   ├── API_CENTRALIZATION.md       # API architecture
│   ├── TESTING.md                  # Testing guide
│   ├── TOP_NAV_LAYOUT.md          # Nav structure
│   ├── USER_PANEL_IMPLEMENTATION.md # User panel
│   ├── DEV_TOKEN_QUICKSTART.md    # ⚡ Quick setup
│   └── DEV_TOKEN_GUIDE.md         # 📖 Complete guide
│
├── web-src/                        # Frontend application
│   └── src/
│       ├── components/             # React components
│       ├── services/               # API services
│       │   ├── api.ts             # Main API service
│       │   ├── tokenStorage.ts    # Token management
│       │   ├── eventEnrichment.ts # Data enrichment
│       │   └── dataEnrichment.ts  # Enrichment utilities
│       ├── hooks/                  # React hooks
│       ├── config/                 # Configuration
│       └── ...
│
├── actions/                        # Backend actions
├── test/                          # Unit tests
├── e2e/                          # E2E tests
└── app.config.yaml               # App configuration
```

## 🎯 Documentation by Role

### Frontend Developer
1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) ⚡
3. [Google Places API Setup](./GOOGLE_PLACES_SETUP.md)
4. [Frontend Guide](./FRONTEND.md)
5. [Event Form Guide](./EVENT_FORM.md)
6. [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)
7. [API Integration](./API_INTEGRATION.md)

### Backend Developer
1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Backend Guide](./BACKEND.md)
3. [API Integration](./API_INTEGRATION.md)
4. [Testing Guide](./TESTING.md)

### Full-Stack Developer
1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) ⚡
3. [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
4. [Frontend Guide](./FRONTEND.md)
5. [Backend Guide](./BACKEND.md)
6. [API Integration](./API_INTEGRATION.md)
7. [Testing Guide](./TESTING.md)

### QA Engineer
1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Testing Guide](./TESTING.md)
3. [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md)

### Designer/UI Developer
1. [Frontend Guide](./FRONTEND.md)
2. [Top Nav Layout](./TOP_NAV_LAYOUT.md)
3. [User Panel Implementation](./USER_PANEL_IMPLEMENTATION.md)

## 🆕 Recent Updates

### Event Form Implementation (November 2025)
- ✨ **Production-Ready Multi-Step Form** - Complete event creation/editing
  - 4-step wizard matching v1 reference structure
  - Modular component architecture (EventFormatComponent, EventInfoComponent)
  - Full TypeScript type safety
  - Comprehensive validation
  - See [Event Form Guide](./EVENT_FORM.md)
  - See [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)

### Event Dashboard Enhancements
- ✨ **Data Enrichment System** - Intelligent caching and batching for API calls
  - Thumbnail images with shimmer loading
  - Venue information enrichment
  - Series details with descriptions
  - Creator/modifier/publish history tracking
  - Automatic caching and request deduplication

### Dev Token Management
- ✨ **Local Development Token System** - Simplified local API testing
  - Token storage and validation
  - Beautiful UI for token input
  - Automatic expiration handling
  - See [Quick Start](./DEV_TOKEN_QUICKSTART.md)

## 🤔 Need Help?

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't make API calls locally | [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) |
| Don't understand the architecture | [Project Overview](./PROJECT_OVERVIEW.md) |
| Component not rendering | [Frontend Guide](./FRONTEND.md) |
| Action not working | [Backend Guide](./BACKEND.md) |
| Tests failing | [Testing Guide](./TESTING.md) |
| Token expired | [Dev Token Guide](./DEV_TOKEN_GUIDE.md#troubleshooting) |

### Getting Support
1. Check the relevant documentation above
2. Look for console error messages
3. Review example code in the codebase
4. Contact the development team

## 📝 Contributing to Documentation

When updating documentation:
1. Keep it clear and concise
2. Include code examples
3. Add screenshots where helpful
4. Update this index if adding new docs
5. Test all code examples

---

**Last Updated:** November 18, 2025
**Version:** 1.3.0

Happy coding! 🚀

