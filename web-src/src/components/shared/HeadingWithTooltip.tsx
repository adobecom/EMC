import React from 'react'
import { ActionButton, Heading, TooltipTrigger, Tooltip } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import InfoCircle from "@react-spectrum/s2/icons/InfoCircle"
import { TYPOGRAPHY } from '../../styles/designSystem'

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
   * Level 3 is styled as a step heading (red, 24px, bold)
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6

  /**
   * Optional margin bottom
   */
  /** Bottom margin in px (maps from former Spectrum dimension tokens) */
  marginBottomPx?: number

  /**
   * Optional additional styles
   */
  UNSAFE_style?: React.CSSProperties
}

/**
 * Get heading styles based on level
 * Level 3 uses component heading styles from design system
 */
const getHeadingStyles = (level: number, customStyles?: React.CSSProperties): React.CSSProperties => {
  const baseStyles = level === 3 ? TYPOGRAPHY.COMPONENT_HEADING : {}
  return { ...baseStyles, ...customStyles }
}

export const HeadingWithTooltip: React.FC<HeadingWithTooltipProps> = ({
  children,
  tooltip,
  level = 3,
  marginBottomPx,
  UNSAFE_style
}) => {
  const headingStyles = getHeadingStyles(level, UNSAFE_style)
  const wrapStyle: React.CSSProperties | undefined =
    marginBottomPx != null ? { marginBottom: marginBottomPx } : undefined

  // If no tooltip provided, just render the heading
  if (!tooltip) {
    return (
      <Heading level={level} UNSAFE_style={{ ...headingStyles, ...wrapStyle }}>
        {children}
      </Heading>
    )
  }

  return (
    <div
      className={style({ display: 'flex', gap: 8, alignItems: 'center' })}
      style={wrapStyle}
    >
      <Heading level={level} UNSAFE_style={headingStyles}>
        {children}
      </Heading>

      <TooltipTrigger delay={0}>
        <ActionButton isQuiet aria-label={typeof tooltip === 'string' ? tooltip : 'More information'}>
          <InfoCircle />
        </ActionButton>
        <Tooltip>{tooltip}</Tooltip>
      </TooltipTrigger>
    </div>
  )
}
