import React from 'react'
import { View, Text } from '@adobe/react-spectrum'
import { COLORS } from '../../styles/designSystem'

interface ChipProps {
  /** The text to display in the chip */
  text: string
  /** Optional variant for different chip styles */
  variant?: 'default'
}

/**
 * Chip Component
 * 
 * Displays a single chip/tag with text.
 */
export const Chip: React.FC<ChipProps> = ({ 
  text, 
  variant = 'default',
}) => {
  // Variant configurations
  const variantConfig = {
    default: {
      backgroundColor: COLORS.GRAY_200,
      color: COLORS.GRAY_800,
    },
  }

  const currentVariant = variantConfig[variant]

  return (
    <View
      UNSAFE_style={{
        display: 'inline-flex',
        alignItems: 'center',
        paddingLeft: '9px',
        paddingRight: '9px',
        paddingTop: '4px',
        paddingBottom: '4px',
        backgroundColor: currentVariant.backgroundColor,
        borderRadius: '7px',
        whiteSpace: 'nowrap',
      }}
    >
      <Text
        UNSAFE_style={{
          fontSize: '12px',
          fontWeight: 500,
          color: currentVariant.color,
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {text}
      </Text>
    </View>
  )
}

export default Chip

