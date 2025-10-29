/* 
* <license header>
*/

import React from 'react'
import {
  View,
  Heading,
  Flex,
  Text,
  Divider,
  Content,
  IllustratedMessage
} from '@adobe/react-spectrum'
import User from '@spectrum-icons/workflow/User'
import { IMS } from '../types'

interface UserProfileProps {
  ims: IMS
}

interface ProfileRow {
  label: string
  value: string | undefined
}

export const UserProfile: React.FC<UserProfileProps> = ({ ims }) => {
  if (!ims.profile) {
    return (
      <View width="size-6000">
        <IllustratedMessage>
          <User />
          <Heading>No User Profile</Heading>
          <Content>User profile information is not available.</Content>
        </IllustratedMessage>
      </View>
    )
  }

  const profileRows: ProfileRow[] = [
    { label: 'User ID', value: ims.profile.userId },
    { label: 'Name', value: ims.profile.name },
    { label: 'Email', value: ims.profile.email },
    { label: 'Organization ID', value: ims.org },
    { label: 'Token', value: ims.token ? '••••••••••••' : undefined }
  ]

  // Additional profile fields from IMS
  const additionalFields = Object.keys(ims.profile)
    .filter((key) => !['userId', 'name', 'email'].includes(key))
    .map((key) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: ims.profile?.[key] ? String(ims.profile[key]) : undefined
    }))

  const allRows = [...profileRows, ...additionalFields].filter((row) => row.value)

  return (
    <View width="size-6000">
      <Heading level={1} marginBottom="size-300">
        User Profile
      </Heading>

      <Divider size="M" marginBottom="size-300" />

      <Flex direction="column" gap="size-200">
        {allRows.map((row, index) => (
          <Flex key={index} direction="row" gap="size-400" alignItems="center">
            <View width="size-2000">
              <Text>
                <strong>{row.label}:</strong>
              </Text>
            </View>
            <View flex>
              <Text>{row.value}</Text>
            </View>
          </Flex>
        ))}
      </Flex>

      <Divider size="M" marginTop="size-400" marginBottom="size-300" />

      <View marginTop="size-300">
        <Heading level={3} marginBottom="size-200">
          IMS Information
        </Heading>
        <Text>
          This profile information is provided by Adobe Identity Management System (IMS).
          Your authentication token is securely managed and automatically included in API requests.
        </Text>
      </View>
    </View>
  )
}

