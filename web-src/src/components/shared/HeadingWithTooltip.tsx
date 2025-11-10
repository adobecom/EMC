import React from 'react'
import { Flex, Heading, TooltipTrigger, Tooltip, ActionButton } from '@adobe/react-spectrum'
import Info from '@spectrum-icons/workflow/Info'

interface HeadingWithTooltipProps {
  /**
   * The heading text to display
   */
  children: React.ReactNode
  
  /**
   * The tooltip content to show on hover
   */
  tooltip?: string | React.ReactNode
  
  /**
   * The heading level (1-6)
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6
  
  /**
   * Optional margin bottom
   */
  marginBottom?: 'size-0' | 'size-50' | 'size-100' | 'size-150' | 'size-200' | 'size-300' | 'size-400'
  
  /**
   * Optional additional styles
   */
  UNSAFE_style?: React.CSSProperties
}

export const HeadingWithTooltip: React.FC<HeadingWithTooltipProps> = ({
  children,
  tooltip,
  level = 3,
  marginBottom,
  UNSAFE_style
}) => {
  // If no tooltip provided, just render the heading
  if (!tooltip) {
    return (
      <Heading 
        level={level} 
        marginBottom={marginBottom}
        UNSAFE_style={UNSAFE_style}
      >
        {children}
      </Heading>
    )
  }

  return (
    <Flex 
      direction="row" 
      gap="size-100" 
      alignItems="center"
      marginBottom={marginBottom}
    >
      <Heading 
        level={level}
        UNSAFE_style={UNSAFE_style}
      >
        {children}
      </Heading>
      
      <TooltipTrigger delay={0}>
        <ActionButton 
          isQuiet 
          UNSAFE_style={{ 
            minWidth: 'auto',
            padding: 0,
            width: '20px',
            height: '20px'
          }}
        >
          <Info size="S" />
        </ActionButton>
        <Tooltip>{tooltip}</Tooltip>
      </TooltipTrigger>
    </Flex>
  )
}

