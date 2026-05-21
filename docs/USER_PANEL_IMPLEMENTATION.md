# User Panel Implementation

## Overview

A persistent **UserPanel** component shows the current IMS (Identity Management System) user in the **top navigation** (right side), so authentication status and profile actions stay visible without a sidebar.

## Implementation Details

### Component: `UserPanel.tsx`

**Location:** `web-src/src/components/user/UserPanel.tsx`

**Features:**
- ✅ Displays IMS user information (name, email, user ID)
- ✅ Avatar with user initials
- ✅ Clickable dropdown menu with profile actions
- ✅ Organization ID display
- ✅ Graceful handling when IMS profile is unavailable
- ✅ Click to navigate to full profile page
- ✅ Hover effects for better UX

### Integration Points

#### 1. Top navigation (`TopNav.tsx`)

`TopNav` renders the Adobe logo, primary `NavLink`s, dev token UI (localhost), and **`UserPanel ims={ims} compact`** on the right when the user is signed in (standalone mode shows **Sign In** until authenticated).

#### 2. Styling (`index.css`)
Added custom styles for hover effects and borders.

## User Experience

### When IMS Profile is Available
```
┌─────────────────────────────────┐
│  [JD]  John Doe                 │ ← Avatar with initials
│        john.doe@adobe.com       │ ← Email
│  ─────────────────────────────  │
│  ORG: org123456789              │ ← Organization ID
└─────────────────────────────────┘
```

**On Click:**
- Opens dropdown menu
- "View Profile" → navigates to `/profile`
- "User Info" → shows truncated user ID

### When IMS Profile is Not Available
```
┌─────────────────────────────────┐
│  [👤]  Not Connected             │
│        No IMS profile            │
└─────────────────────────────────┘
```

## Props

```typescript
interface UserPanelProps {
  ims: IMS  // IMS object from Adobe ExC Shell
}

interface IMS {
  profile?: IMSProfile
  org?: string
  token?: string
}

interface IMSProfile {
  userId?: string
  name?: string
  email?: string
  [key: string]: any
}
```

## Features Breakdown

### 1. Avatar Generation
- Extracts initials from user's name
- Blue background with white text
- Fallback to first 2 characters if single name

### 2. Information Display
- **Primary**: User's full name (bold)
- **Secondary**: Email address (smaller, gray)
- **Tertiary**: Organization ID (at bottom)

### 3. Interactive Menu
- Click avatar/name to open dropdown
- "View Profile" action navigates to full profile page
- "User Info" displays truncated user ID

### 4. Responsive Design
- Text overflow handling with ellipsis
- Fixed width avatar
- Flexible text area

### 5. Visual Feedback
- Hover effect with shadow
- Border on normal state
- Smooth transitions

## Usage in Components

All components that need user context now receive the `ims` prop:

```typescript
// In any component
interface MyComponentProps {
  ims: IMS
}

export const MyComponent: React.FC<MyComponentProps> = ({ ims }) => {
  const userName = ims.profile?.name || 'Guest'
  const userEmail = ims.profile?.email || ''
  const orgId = ims.org || ''
  
  // Use user info...
}
```

## Testing

### Manual Testing Steps

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Check UserPanel appears:**
   - Look at the **top right** of the window (inside `TopNav`)
   - Should show your IMS user name (compact mode may hide email in the bar; open the menu to verify)

3. **Test interactions:**
   - Click on the user panel
   - Select "View Profile" → should navigate to `/profile`
   - Hover over panel → should see shadow effect

4. **Test without IMS (fallback mode):**
   - Run outside ExC Shell
   - Should show "Not Connected" state

### Unit Test Template

```typescript
// Example: colocate as web-src/src/components/user/UserPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { UserPanel } from './UserPanel'
import { BrowserRouter } from 'react-router-dom'

const mockIms = {
  profile: {
    userId: 'user123',
    name: 'John Doe',
    email: 'john.doe@adobe.com'
  },
  org: 'org123456',
  token: 'fake-token'
}

test('displays user name and email', () => {
  render(
    <BrowserRouter>
      <UserPanel ims={mockIms} />
    </BrowserRouter>
  )
  
  expect(screen.getByText('John Doe')).toBeInTheDocument()
  expect(screen.getByText('john.doe@adobe.com')).toBeInTheDocument()
})

test('shows not connected when no profile', () => {
  render(
    <BrowserRouter>
      <UserPanel ims={{}} />
    </BrowserRouter>
  )
  
  expect(screen.getByText('Not Connected')).toBeInTheDocument()
})
```

## Future Enhancements

### Possible Additions:
1. **Logout functionality** - Add logout action to menu
2. **Profile picture** - Use actual avatar image if available from IMS
3. **Status indicator** - Show online/offline status
4. **Notifications badge** - Show count of notifications
5. **Quick settings** - Add quick access to user preferences
6. **Theme toggle** - Switch between light/dark mode
7. **Language selector** - Change application language

### Example Enhancement: Logout

```typescript
// In UserPanel.tsx
const handleLogout = () => {
  // Clear IMS session
  // Redirect to login
  window.location.href = '/logout'
}

<Menu>
  <Item key="profile">View Profile</Item>
  <Item key="logout" onAction={handleLogout}>
    <LogOutIcon />
    <Text>Logout</Text>
  </Item>
</Menu>
```

## Code Structure

```
web-src/src/components/
├── user/
│   └── UserPanel.tsx      # IMS user menu (compact in TopNav)
├── layout/
│   └── TopNav.tsx         # Renders UserPanel on the right
└── App.tsx                # Grid shell; TopNav in header area
```

## Accessibility

- ✅ Proper ARIA labels for avatar
- ✅ Keyboard navigation support (via Spectrum Menu)
- ✅ Screen reader friendly text
- ✅ High contrast colors
- ✅ Focus indicators

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari

## Security Considerations

1. **Token Display**: Token is never shown in UI (only presence indicated)
2. **User ID**: Truncated in menu for privacy
3. **Email**: Shown only to authenticated user
4. **Organization ID**: Shown but not sensitive (already in headers)

## Troubleshooting

### UserPanel not showing
- Check that `ims` prop is passed correctly
- Verify ExC Shell is providing IMS data
- Check console for errors

### "Not Connected" showing incorrectly
- Verify `ims.profile` is populated
- Check ExC Shell integration in `index.tsx`
- Ensure `ready` event is firing

### Styling issues
- Clear browser cache
- Check `index.css` is loaded
- Verify Spectrum CSS variables are available

## Related Documentation

- [Frontend Guide](./FRONTEND.md) - Component development patterns
- [API Centralization](./API_CENTRALIZATION.md) - Using IMS in API calls
- [Dev Token Guide](./DEV_TOKEN_GUIDE.md) - Local development with IMS tokens
- [Project Overview](./PROJECT_OVERVIEW.md) - IMS authentication flow

## Summary

The UserPanel component successfully integrates IMS user information into the application UI, providing:
- **Persistent user context** — Visible in the top navigation
- **Quick profile access** - One click to full profile
- **Organization awareness** - Shows current org context
- **Professional appearance** - Follows Adobe design system
- **Graceful degradation** - Handles missing IMS data

This enhances the user experience by making authentication status and user identity immediately visible throughout the application.

