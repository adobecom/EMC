/*
* <license header>
*/

import React from 'react'
import {
  Heading,
  Text,
  Content,
  IllustratedMessage,
  Divider
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import User from '@react-spectrum/s2/icons/User'
import Building from '@react-spectrum/s2/icons/Building'
import Key from '@react-spectrum/s2/icons/Key'
import UserIcon from '@react-spectrum/s2/icons/User'
import { IMS } from '../types'
import { COLORS, TYPOGRAPHY } from '../styles/designSystem'
import { useProfileAvatar } from '../hooks/useProfileAvatar'

interface UserProfileProps {
  ims: IMS
}

/**
 * Profile info item component for consistent key-value display
 */
interface InfoItemProps {
  label: string
  value: string | React.ReactNode
  isMonospace?: boolean
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, isMonospace = false }) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-global-color-gray-75)',
      padding: '12px',
      borderRadius: '4px'
    }}
  >
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
      <Text
        UNSAFE_style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--spectrum-global-color-gray-600)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {label}
      </Text>
      <Text
        UNSAFE_style={{
          fontWeight: 500,
          fontSize: '14px',
          fontFamily: isMonospace ? 'monospace' : 'inherit',
          wordBreak: 'break-all'
        }}
      >
        {value}
      </Text>
    </div>
  </div>
)

/**
 * Section card component for grouping related profile information
 */
interface SectionCardProps {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, description, children }) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-global-color-gray-75)',
      border: '1px solid var(--spectrum-global-color-gray-200)',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px'
    }}
  >
    <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 })}
      style={{ marginBottom: '16px' }}
    >
      <div style={{ color: COLORS.GRAY_700 }}>
        {icon}
      </div>
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 0 })}>
        <Heading level={3}>
          {title}
        </Heading>
        {description && (
          <Text UNSAFE_style={{ ...TYPOGRAPHY.HELPER_TEXT }}>
            {description}
          </Text>
        )}
      </div>
    </div>
    <Divider />
    <div style={{ marginBottom: '16px' }} />
    {children}
  </div>
)

/**
 * Role item component for displaying IMS roles
 */
interface RoleData {
  principal?: string
  organization?: string
  named_role?: string
  target?: string
  target_type?: string
  target_data?: {
    gid?: string
    group_name?: string
  }
}

const RoleItem: React.FC<{ role: RoleData; index: number }> = ({ role, index }) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-global-color-gray-75)',
      borderRadius: '4px',
      padding: '16px',
      borderLeft: '3px solid var(--spectrum-global-color-blue-400)'
    }}
  >
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
      <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })}
        style={{ flexWrap: 'wrap', gap: '8px' }}
      >
        <Text UNSAFE_style={{ fontWeight: 600 }}>
          {role.named_role || `Role ${index + 1}`}
        </Text>
        {role.target_type && (
          <Text
            UNSAFE_style={{
              fontSize: '11px',
              color: 'var(--spectrum-global-color-blue-600)',
              fontFamily: 'monospace',
              backgroundColor: 'var(--spectrum-global-color-blue-100)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}
          >
            {role.target_type}
          </Text>
        )}
      </div>
      {role.target_data?.group_name && (
        <Text
          UNSAFE_style={{
            fontSize: '13px',
            color: 'var(--spectrum-global-color-gray-700)',
            lineHeight: '1.5'
          }}
        >
          Group: {role.target_data.group_name}
        </Text>
      )}
    </div>
  </div>
)

/**
 * Product context item component for displaying projected product context
 */
interface ProductContext {
  prodCtx?: {
    serviceCode?: string
    label?: string
    statusCode?: string
    tenant_id?: string
    geo?: string
    serviceLevel?: string
    owningEntity?: string
  }
}

const ProductContextItem: React.FC<{ context: ProductContext; index: number }> = ({ context, index }) => {
  const ctx = context.prodCtx
  if (!ctx) return null

  return (
    <div
      style={{
        backgroundColor: 'var(--spectrum-global-color-gray-75)',
        borderRadius: '4px',
        padding: '16px',
        borderLeft: `3px solid ${ctx.statusCode === 'ACTIVE' ? 'var(--spectrum-global-color-green-500)' : 'var(--spectrum-global-color-gray-400)'}`
      }}
    >
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
        <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })}
          style={{ flexWrap: 'wrap', gap: '8px' }}
        >
          <Text UNSAFE_style={{ fontWeight: 600 }}>
            {ctx.label || ctx.serviceCode || `Product ${index + 1}`}
          </Text>
          {ctx.statusCode && (
            <Text
              UNSAFE_style={{
                fontSize: '11px',
                color: ctx.statusCode === 'ACTIVE'
                  ? 'var(--spectrum-global-color-green-700)'
                  : 'var(--spectrum-global-color-gray-600)',
                fontFamily: 'monospace',
                backgroundColor: ctx.statusCode === 'ACTIVE'
                  ? 'var(--spectrum-global-color-green-100)'
                  : 'var(--spectrum-global-color-gray-200)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              {ctx.statusCode}
            </Text>
          )}
        </div>
        <div className={style({ display: 'flex', flexDirection: 'row', gap: 16 })}
          style={{ flexWrap: 'wrap' }}
        >
          {ctx.serviceCode && (
            <Text
              UNSAFE_style={{
                fontSize: '12px',
                color: 'var(--spectrum-global-color-gray-600)',
                fontFamily: 'monospace'
              }}
            >
              {ctx.serviceCode}
            </Text>
          )}
          {ctx.serviceLevel && (
            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              Level: {ctx.serviceLevel}
            </Text>
          )}
          {ctx.geo && (
            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              Region: {ctx.geo}
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Tag badge component
 */
const TagBadge: React.FC<{ tag: string }> = ({ tag }) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-global-color-gray-200)',
      borderRadius: '4px',
      padding: '4px 8px'
    }}
  >
    <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 500 }}>
      {tag}
    </Text>
  </div>
)

/**
 * Helper to format camelCase/snake_case to Title Case
 */
const formatLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

/**
 * UserProfile - Displays user profile information from IMS
 */
export const UserProfile: React.FC<UserProfileProps> = ({ ims }) => {
  const { avatarUrl } = useProfileAvatar(ims)

  if (!ims.profile) {
    return (
      <div style={{ padding: '32px', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
        <IllustratedMessage>
          <User />
          <Heading>No User Profile</Heading>
          <Content>User profile information is not available.</Content>
        </IllustratedMessage>
      </div>
    )
  }

  const profile = ims.profile

  // Extract known complex fields
  const roles = profile.roles as RoleData[] | undefined
  const projectedProductContext = profile.projectedProductContext as ProductContext[] | undefined
  const tags = profile.tags as string[] | undefined

  // Fields to exclude from "additional info" section
  const excludedFields = [
    'userId', 'name', 'displayName', 'email', 'first_name', 'last_name',
    'roles', 'projectedProductContext', 'tags', 'avatar', 'avatarSrc',
    'session', 'token', 'timestamp', 'isImpersonated'
  ]

  // Get simple string/boolean/number fields for additional display
  const additionalFields = Object.entries(profile)
    .filter(([key, value]) => {
      if (excludedFields.includes(key)) return false
      if (value === null || value === undefined || value === '') return false
      if (typeof value === 'object') return false
      return true
    })
    .map(([key, value]) => ({
      label: formatLabel(key),
      value: String(value)
    }))

  return (
    <div style={{ padding: '32px', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Heading level={1}>User Profile</Heading>
        <Text
          UNSAFE_style={{
            color: 'var(--spectrum-global-color-gray-700)',
            fontSize: '16px'
          }}
        >
          Your Adobe Identity Management System (IMS) profile information.
        </Text>
      </div>

      {/* Profile Header Card with Avatar */}
      <div
        style={{
          backgroundColor: 'var(--spectrum-global-color-gray-75)',
          border: '1px solid var(--spectrum-global-color-gray-200)',
          borderRadius: '8px',
          padding: '32px',
          marginBottom: '24px'
        }}
      >
        <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24 })}
          style={{ flexWrap: 'wrap' }}
        >
          {/* Avatar */}
          <div>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.displayName || profile.name || 'User avatar'}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--spectrum-global-color-gray-300)'
                }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'var(--spectrum-global-color-gray-300)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                <User />
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}
            style={{ flex: 1 }}
          >
            <Heading level={2}>
              {profile.displayName || profile.name || 'Unknown User'}
            </Heading>
            {profile.email && (
              <Text UNSAFE_style={{ fontSize: '16px', color: 'var(--spectrum-global-color-gray-700)' }}>
                {profile.email}
              </Text>
            )}
            {(profile.first_name || profile.last_name) && profile.displayName !== `${profile.first_name} ${profile.last_name}` && (
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)' }}>
                {profile.first_name} {profile.last_name}
              </Text>
            )}
            {profile.account_type && (
              <Text
                UNSAFE_style={{
                  fontSize: '12px',
                  color: 'var(--spectrum-global-color-gray-600)',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--spectrum-global-color-gray-200)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  width: 'fit-content'
                }}
              >
                {profile.account_type}
              </Text>
            )}
          </div>
        </div>
      </div>

      {/* Organization & Authentication Section */}
      <SectionCard
        icon={<Building />}
        title="Organization & Authentication"
        description="Your organization and authentication details"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}
        >
          {ims.org && (
            <InfoItem label="Organization ID" value={ims.org} isMonospace />
          )}
          {profile.userId && (
            <InfoItem label="User ID" value={profile.userId} isMonospace />
          )}
          {profile.authId && (
            <InfoItem label="Auth ID" value={String(profile.authId)} isMonospace />
          )}
          {profile.authAccountType && (
            <InfoItem label="Auth Type" value={String(profile.authAccountType)} />
          )}
          {profile.countryCode && (
            <InfoItem label="Country Code" value={String(profile.countryCode)} />
          )}
          <InfoItem
            label="Token Status"
            value={ims.token ? '✓ Active' : '✗ Not available'}
          />
        </div>
      </SectionCard>

      {/* Tags Section */}
      {tags && tags.length > 0 && (
        <SectionCard
          icon={<Key />}
          title="Account Tags"
          description="Tags associated with your account"
        >
          <div className={style({ display: 'flex', flexDirection: 'row', gap: 8 })}
            style={{ flexWrap: 'wrap' }}
          >
            {tags.map((tag, index) => (
              <TagBadge key={index} tag={tag} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Roles Section */}
      {roles && roles.length > 0 && (
        <SectionCard
          icon={<User />}
          title="Assigned Roles"
          description={`${roles.length} role${roles.length === 1 ? '' : 's'} assigned to your account`}
        >
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
            {roles.map((role, index) => (
              <RoleItem key={index} role={role} index={index} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Product Context Section */}
      {projectedProductContext && projectedProductContext.length > 0 && (
        <SectionCard
          icon={<UserIcon />}
          title="Product Entitlements"
          description={`${projectedProductContext.length} product${projectedProductContext.length === 1 ? '' : 's'} available`}
        >
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
            {projectedProductContext.map((context, index) => (
              <ProductContextItem key={index} context={context} index={index} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Additional Fields Section */}
      {additionalFields.length > 0 && (
        <SectionCard
          icon={<Key />}
          title="Additional Information"
          description="Other profile attributes"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}
          >
            {additionalFields.map((field, index) => (
              <InfoItem key={index} label={field.label} value={field.value} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Footer Note */}
      <div
        style={{
          border: '1px solid var(--spectrum-global-color-gray-300)',
          borderRadius: '4px',
          padding: '16px',
          backgroundColor: 'var(--spectrum-global-color-gray-75)',
          marginTop: '24px'
        }}
      >
        <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'start', gap: 16 })}>
          <div style={{ color: 'var(--spectrum-global-color-blue-600)', flexShrink: 0, marginTop: '2px' }}>
            <Key />
          </div>
          <div>
            <Heading level={4}>
              Security Information
            </Heading>
            <Text UNSAFE_style={{ fontSize: '14px', lineHeight: '1.5' }}>
              This profile information is provided by Adobe Identity Management System (IMS).
              Your authentication token is securely managed and automatically included in API requests.
              Sensitive information like full tokens and session data are not displayed.
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
