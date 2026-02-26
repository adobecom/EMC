/* 
* <license header>
*/

import React from 'react'
import {
  View,
  Heading,
  Flex,
  Text,
  Content,
  IllustratedMessage,
  Divider,
  Well
} from '@adobe/react-spectrum'
import User from '@spectrum-icons/workflow/User'
import Building from '@spectrum-icons/workflow/Building'
import Key from '@spectrum-icons/workflow/Key'
import Box from '@spectrum-icons/workflow/Box'
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
  <View
    backgroundColor="gray-50"
    padding="size-150"
    borderRadius="regular"
  >
    <Flex direction="column" gap="size-50">
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
    </Flex>
  </View>
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
  <View
    backgroundColor="gray-50"
    borderWidth="thin"
    borderColor="gray-200"
    borderRadius="medium"
    padding="size-300"
    marginBottom="size-300"
  >
    <Flex direction="row" alignItems="center" gap="size-150" marginBottom="size-200">
      <View UNSAFE_style={{ color: COLORS.GRAY_700 }}>
        {icon}
      </View>
      <Flex direction="column" gap="size-0">
        <Heading level={3} margin="size-0">
          {title}
        </Heading>
        {description && (
          <Text UNSAFE_style={{ ...TYPOGRAPHY.HELPER_TEXT }}>
            {description}
          </Text>
        )}
      </Flex>
    </Flex>
    <Divider marginBottom="size-200" />
    {children}
  </View>
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
  <View
    backgroundColor="gray-75"
    borderRadius="regular"
    padding="size-200"
    UNSAFE_style={{
      borderLeft: '3px solid var(--spectrum-global-color-blue-400)'
    }}
  >
    <Flex direction="column" gap="size-100">
      <Flex direction="row" alignItems="center" justifyContent="space-between" wrap="wrap" gap="size-100">
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
      </Flex>
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
    </Flex>
  </View>
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
    <View
      backgroundColor="gray-75"
      borderRadius="regular"
      padding="size-200"
      UNSAFE_style={{
        borderLeft: `3px solid ${ctx.statusCode === 'ACTIVE' ? 'var(--spectrum-global-color-green-500)' : 'var(--spectrum-global-color-gray-400)'}`
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex direction="row" alignItems="center" justifyContent="space-between" wrap="wrap" gap="size-100">
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
        </Flex>
        <Flex direction="row" gap="size-200" wrap="wrap">
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
        </Flex>
      </Flex>
    </View>
  )
}

/**
 * Tag badge component
 */
const TagBadge: React.FC<{ tag: string }> = ({ tag }) => (
  <View
    backgroundColor="gray-200"
    borderRadius="regular"
    paddingX="size-100"
    paddingY="size-50"
  >
    <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 500 }}>
      {tag}
    </Text>
  </View>
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
      <View padding="size-400" maxWidth="900px" marginX="auto">
        <IllustratedMessage>
          <User size="XXL" />
          <Heading>No User Profile</Heading>
          <Content>User profile information is not available.</Content>
        </IllustratedMessage>
      </View>
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
    <View padding="size-400" maxWidth="900px" marginX="auto">
      {/* Header */}
      <View marginBottom="size-400">
        <Heading level={1}>User Profile</Heading>
        <Text
          UNSAFE_style={{
            color: 'var(--spectrum-global-color-gray-700)',
            fontSize: '16px'
          }}
        >
          Your Adobe Identity Management System (IMS) profile information.
        </Text>
      </View>

      {/* Profile Header Card with Avatar */}
      <View
        backgroundColor="gray-50"
        borderWidth="thin"
        borderColor="gray-200"
        borderRadius="medium"
        padding="size-400"
        marginBottom="size-300"
      >
        <Flex direction="row" alignItems="center" gap="size-300" wrap="wrap">
          {/* Avatar */}
          <View>
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
              <View
                width="size-1000"
                height="size-1000"
                backgroundColor="gray-300"
                UNSAFE_style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                <User size="XL" />
              </View>
            )}
          </View>

          {/* Basic Info */}
          <Flex direction="column" gap="size-50" flex>
            <Heading level={2} margin="size-0">
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
          </Flex>
        </Flex>
      </View>

      {/* Organization & Authentication Section */}
      <SectionCard
        icon={<Building size="S" />}
        title="Organization & Authentication"
        description="Your organization and authentication details"
      >
        <View
          UNSAFE_style={{
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
        </View>
      </SectionCard>

      {/* Tags Section */}
      {tags && tags.length > 0 && (
        <SectionCard
          icon={<Key size="S" />}
          title="Account Tags"
          description="Tags associated with your account"
        >
          <Flex direction="row" gap="size-100" wrap="wrap">
            {tags.map((tag, index) => (
              <TagBadge key={index} tag={tag} />
            ))}
          </Flex>
        </SectionCard>
      )}

      {/* Roles Section */}
      {roles && roles.length > 0 && (
        <SectionCard
          icon={<User size="S" />}
          title="Assigned Roles"
          description={`${roles.length} role${roles.length === 1 ? '' : 's'} assigned to your account`}
        >
          <Flex direction="column" gap="size-150">
            {roles.map((role, index) => (
              <RoleItem key={index} role={role} index={index} />
            ))}
          </Flex>
        </SectionCard>
      )}

      {/* Product Context Section */}
      {projectedProductContext && projectedProductContext.length > 0 && (
        <SectionCard
          icon={<Box size="S" />}
          title="Product Entitlements"
          description={`${projectedProductContext.length} product${projectedProductContext.length === 1 ? '' : 's'} available`}
        >
          <Flex direction="column" gap="size-150">
            {projectedProductContext.map((context, index) => (
              <ProductContextItem key={index} context={context} index={index} />
            ))}
          </Flex>
        </SectionCard>
      )}

      {/* Additional Fields Section */}
      {additionalFields.length > 0 && (
        <SectionCard
          icon={<Key size="S" />}
          title="Additional Information"
          description="Other profile attributes"
        >
          <View
            UNSAFE_style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}
          >
            {additionalFields.map((field, index) => (
              <InfoItem key={index} label={field.label} value={field.value} />
            ))}
          </View>
        </SectionCard>
      )}

      {/* Footer Note */}
      <Well marginTop="size-300">
        <Flex direction="row" alignItems="start" gap="size-200">
          <View UNSAFE_style={{ color: 'var(--spectrum-global-color-blue-600)', flexShrink: 0, marginTop: '2px' }}>
            <Key size="S" />
          </View>
          <View>
            <Heading level={4} marginTop="size-0" marginBottom="size-50">
              Security Information
            </Heading>
            <Text UNSAFE_style={{ fontSize: '14px', lineHeight: '1.5' }}>
              This profile information is provided by Adobe Identity Management System (IMS).
              Your authentication token is securely managed and automatically included in API requests.
              Sensitive information like full tokens and session data are not displayed.
            </Text>
          </View>
        </Flex>
      </Well>
    </View>
  )
}
