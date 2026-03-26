/*
* <license header>
*/

import React from 'react'
import { Button, Heading, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { useNavigate } from 'react-router-dom'
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import FileText from '@react-spectrum/s2/icons/FileText'
import {
  LAYOUT_DIMENSIONS,
  FORM_WIZARD_FOOTER_STYLES,
  COLORS,
  TYPOGRAPHY
} from '../../styles/designSystem'

/** Side nav: selected / hover (Spectrum) */
const SIDE_NAV_SELECTED_BG = 'var(--spectrum-global-color-blue-100)'
const SIDE_NAV_HOVER_BG = 'var(--spectrum-global-color-gray-200)'

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
    <div
      style={{
        width: LAYOUT_DIMENSIONS.SIDE_NAV_WIDTH,
        borderRight: '1px solid var(--spectrum-global-color-gray-300)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        backgroundColor: COLORS.GRAY_100,
      }}
    >
      <div style={{ padding: 24, flex: 1, minHeight: 0, overflow: 'auto' }}>
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

        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
          <button
            type="button"
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
              transition: 'background-color 0.15s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = SIDE_NAV_HOVER_BG
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
            }}
          >
            <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <ChevronLeft />
              <Text>{dashboardLabel}</Text>
            </div>
          </button>

          <div>
            <button
              type="button"
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
              <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                <FileText />
                <Text>Create series</Text>
              </div>
            </button>

            <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
              {sideNavItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  disabled={isSaving}
                  style={{
                    border: 'none',
                    background: item.isActive ? SIDE_NAV_SELECTED_BG : COLORS.TRANSPARENT,
                    color: COLORS.GRAY_800,
                    padding: '8px 12px',
                    paddingLeft: '32px',
                    textAlign: 'left',
                    cursor: 'default',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: item.isActive ? 600 : 400,
                    transition: 'background-color 0.15s ease',
                    width: '100%',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <div style={FORM_WIZARD_FOOTER_STYLES}>
        <div
          className={style({ display: 'flex', justifyContent: 'end', alignItems: 'center', height: '[100%]', flex: 1 })}
          style={{ marginInlineStart: 'var(--spectrum-global-dimension-size-400)', marginInlineEnd: 'var(--spectrum-global-dimension-size-400)' }}
        >
          <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <Button
              variant="secondary"
              fillStyle="outline"
              staticColor="white"
              onPress={handleSave}
              isDisabled={isActionDisabled || !onSave}
            >
              {getSaveButtonText()}
            </Button>
            <Button
              variant="accent"
              fillStyle="fill"
              onPress={handlePublish}
              isDisabled={isActionDisabled}
            >
              <div className={style({ display: 'flex', gap: 4, alignItems: 'center' })} style={{ flexDirection: 'row-reverse' }}>
                <Text>{getPublishButtonText()}</Text>
                <ChevronRight />
              </div>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const shellStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    height: '100%',
    width: '100%',
    alignSelf: 'stretch',
  }

  const bodyRowStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  }

  const mainColumnStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: 32,
  }

  return (
    <div style={shellStyle}>
      <div style={bodyRowStyle}>
        {renderSideNav()}
        <div style={mainColumnStyle}>
          <div>
            <div style={{ marginBottom: 24 }}>
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

              <div className={style({ display: 'flex', alignItems: 'center', gap: 32 })}>
                <Heading level={2} UNSAFE_style={TYPOGRAPHY.STEP_HEADING}>{title}</Heading>

                <div
                  style={{
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
                </div>

                {headerActions && <div style={{ flex: 1 }} />}
                {headerActions}
              </div>
            </div>

            <div style={{ marginTop: 24, marginBottom: 32 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
      {renderActionBar()}
    </div>
  )
}
