/* 
* <license header>
*/

import React from 'react'
import {
  View,
  Flex,
  Button,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { useNavigate } from 'react-router-dom'
import ChevronLeft from '@spectrum-icons/workflow/ChevronLeft'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import Document from '@spectrum-icons/workflow/Document'
import { 
  SIDE_NAV_STICKY_STYLES, 
  SCROLLABLE_CONTENT_STYLES, 
  FIXED_ACTION_BAR_STYLES,
  COLORS,
  TYPOGRAPHY
} from '../../styles/designSystem'

/** Form status for the status badge */
export type FormStatus = 'draft' | 'published' | 'archived' | string

interface SideNavItem {
  id: string
  label: string
  isActive?: boolean
}

interface SingleStepFormLayoutProps {
  /** Title displayed in the main content area */
  title: string
  /** Label shown above the title (e.g., "Create series") */
  typeLabel?: string
  /** Category label for side nav (e.g., "SERIES CREATION") */
  sideNavCategory: string
  /** Dashboard link label */
  dashboardLabel?: string
  /** Dashboard route path */
  dashboardPath?: string
  /** Side nav items */
  sideNavItems: SideNavItem[]
  /** Current status */
  status?: FormStatus
  /** Form content */
  children: React.ReactNode
  /** Called when Save button is clicked */
  onSave?: () => Promise<boolean> | boolean
  /** Called when Publish button is clicked */
  onPublish?: () => Promise<void> | void
  /** Whether the form is currently saving */
  isSaving?: boolean
  /** Whether the resource has been saved (has an ID) */
  hasSavedId?: boolean
  /** Whether the resource is published */
  isPublished?: boolean
  /** Whether the form is valid for saving */
  isValid?: boolean
  /** Publish button label */
  publishLabel?: string
  /** Optional actions to render in the header (e.g., history button) */
  headerActions?: React.ReactNode
}

export const SingleStepFormLayout: React.FC<SingleStepFormLayoutProps> = ({
  title,
  typeLabel,
  sideNavCategory,
  dashboardLabel = 'Dashboard',
  dashboardPath = '/',
  sideNavItems,
  status = 'draft',
  children,
  onSave,
  onPublish,
  isSaving = false,
  hasSavedId = false,
  isPublished = false,
  isValid = true,
  publishLabel = 'Publish',
  headerActions
}) => {
  const navigate = useNavigate()

  const handleDashboardClick = () => {
    if (isSaving) return
    navigate(dashboardPath)
  }

  const handleSave = async () => {
    if (isSaving || !onSave) return
    await onSave()
  }

  const handlePublish = async () => {
    if (isSaving || !onPublish) return
    await onPublish()
  }

  // Status badge styling
  const getStatusBadgeStyles = (statusValue: string): { dotColor: string; textColor: string } => {
    const statusStyles: Record<string, { dotColor: string; textColor: string }> = {
      draft: {
        dotColor: COLORS.STATUS_DRAFT,
        textColor: COLORS.GRAY_800,
      },
      published: {
        dotColor: COLORS.STATUS_PUBLISHED,
        textColor: COLORS.GRAY_800,
      },
      archived: {
        dotColor: COLORS.STATUS_ARCHIVED,
        textColor: COLORS.GRAY_700,
      },
    }
    return statusStyles[statusValue.toLowerCase()] || statusStyles.draft
  }

  const statusStyles = getStatusBadgeStyles(status)
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()

  const renderSideNav = () => (
    <View
      width="size-3000"
      borderEndWidth="thin"
      borderEndColor="gray-300"
      UNSAFE_style={SIDE_NAV_STICKY_STYLES}
    >
      <View padding="size-300" flex={1}>
        <Text UNSAFE_style={{ 
          fontSize: '12px',
          fontWeight: 500,
          color: COLORS.GRAY_700,
          letterSpacing: '0.5px',
          marginBottom: '16px',
          display: 'block'
        }}>
          {sideNavCategory}
        </Text>
        
        <Flex direction="column" gap="size-100">
          {/* Dashboard Link */}
          <button
            onClick={handleDashboardClick}
            disabled={isSaving}
            style={{
              border: 'none',
              background: COLORS.TRANSPARENT,
              color: COLORS.GRAY_800,
              padding: '8px 12px',
              textAlign: 'left',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 400,
              opacity: isSaving ? 0.5 : 1,
              transition: 'all 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                e.currentTarget.style.color = COLORS.ADOBE_RED
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
                e.currentTarget.style.color = COLORS.GRAY_800
              }
            }}
          >
            <Flex direction="row" gap="size-100" alignItems="center">
              <ChevronLeft size="S" />
              <Text>{dashboardLabel}</Text>
            </Flex>
          </button>

          {/* Side Nav Items */}
          <View>
            <button
              disabled
              style={{
                border: 'none',
                background: COLORS.TRANSPARENT,
                color: COLORS.GRAY_800,
                padding: '8px 12px',
                textAlign: 'left',
                cursor: 'default',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 400,
                width: '100%',
                marginBottom: '8px'
              }}
            >
              <Flex direction="row" gap="size-100" alignItems="center">
                <Document size="S" />
                <Text>Create series</Text>
              </Flex>
            </button>
            
            <Flex direction="column" gap="size-50">
              {sideNavItems.map((item) => (
                <button
                  key={item.id}
                  disabled={isSaving}
                  style={{
                    border: 'none',
                    background: item.isActive ? COLORS.ADOBE_RED : COLORS.TRANSPARENT,
                    color: item.isActive ? COLORS.WHITE : COLORS.GRAY_800,
                    padding: '8px 12px',
                    paddingLeft: '32px',
                    textAlign: 'left',
                    cursor: 'default',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: item.isActive ? 500 : 400,
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </Flex>
          </View>
        </Flex>
      </View>
    </View>
  )

  const renderActionBar = () => {
    const getSaveButtonText = () => {
      if (isSaving) return 'Saving...'
      return 'Save'
    }

    const getPublishButtonText = () => {
      if (isSaving) return 'Publishing...'
      return isPublished ? `Re-${publishLabel.toLowerCase()}` : publishLabel
    }

    const isActionDisabled = !isValid || isSaving

    return (
      <View
        UNSAFE_style={{
          ...FIXED_ACTION_BAR_STYLES,
          backgroundColor: COLORS.ADOBE_RED,
        }}
      >
        <Flex
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          height="100%"
          marginStart="size-400"
          marginEnd="size-400"
        >
          {/* Save and Publish buttons */}
          <Flex direction="row" gap="size-100" alignItems="center">
            <Button
              variant="secondary"
              style="outline"
              staticColor="white"
              onPress={handleSave}
              isDisabled={isActionDisabled || !onSave}
            >
              {getSaveButtonText()}
            </Button>
            <Button
              variant="primary"
              style="fill"
              staticColor="black"
              onPress={handlePublish}
              isDisabled={isActionDisabled}
            >
              <Flex direction="row-reverse" gap="size-50" alignItems="center">
                <Text>{getPublishButtonText()}</Text>
                <ChevronRight size="S" />
              </Flex>
            </Button>
          </Flex>
        </Flex>
      </View>
    )
  }

  return (
    <>
      <Flex direction="row" gap="size-0">
        {renderSideNav()}
        <View UNSAFE_style={SCROLLABLE_CONTENT_STYLES} flex={1} padding="size-400">
          <View>
            {/* Title section */}
            <View marginBottom="size-300">
              {typeLabel && (
                <Text 
                  UNSAFE_style={{ 
                    fontSize: '14px',
                    fontWeight: 500,
                    color: COLORS.GRAY_700,
                    marginBottom: '8px',
                    display: 'block'
                  }}
                >
                  {typeLabel}
                </Text>
              )}
              
              {/* Heading row with status badge and optional header actions */}
              <Flex direction="row" alignItems="center" gap="size-400">
                <Heading level={2} UNSAFE_style={TYPOGRAPHY.STEP_HEADING}>{title}</Heading>
                
                {/* Status badge */}
                <View
                  UNSAFE_style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 8px',
                    borderRadius: '4px',
                    backgroundColor: COLORS.WHITE,
                    flexShrink: 0
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: statusStyles.dotColor,
                      flexShrink: 0
                    }}
                  />
                  <Text
                    UNSAFE_style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: statusStyles.textColor
                    }}
                  >
                    {statusLabel}
                  </Text>
                </View>
                
                {/* Spacer to push header actions to the right */}
                {headerActions && <View flex={1} />}
                
                {/* Optional header actions (e.g., history button) */}
                {headerActions}
              </Flex>
            </View>

            {/* Form content */}
            <View marginTop="size-300" marginBottom="size-400">
              {children}
            </View>
          </View>
        </View>
      </Flex>
      {renderActionBar()}
    </>
  )
}

