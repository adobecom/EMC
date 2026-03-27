/*
* <license header>
*/

import React from 'react'
import {
  IllustratedMessage,
  Heading,
  Content,
  Text,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { SPACING } from '../../styles/designSystem'

/** Readable line length for empty-state body copy */
const DESCRIPTION_MAX_WIDTH_PX = 520

/** Default vertical band when parent does not supply height */
export const RESOURCE_EMPTY_STATE_MIN_HEIGHT_PX = 480

export interface ResourceEmptyStateProps {
  illustration: React.ReactNode
  title: string
  description: string
  /** Actions below the message (buttons, MenuTrigger, etc.) — centered row */
  actions?: React.ReactNode
  /**
   * Min height of the centered region. Use when the parent has no min-height;
   * when nested in DataTable’s empty shell, pass `fillContainer` instead.
   */
  minHeightPx?: number
  /** When true, stretch to parent height (parent should set min-height, e.g. DataTable empty region) */
  fillContainer?: boolean
}

/**
 * Centered IllustratedMessage for table/dashboard empty states.
 * Keeps illustration + title + description in the middle of the empty region (not top-squashed).
 */
export const ResourceEmptyState: React.FC<ResourceEmptyStateProps> = ({
  illustration,
  title,
  description,
  actions,
  minHeightPx = RESOURCE_EMPTY_STATE_MIN_HEIGHT_PX,
  fillContainer = false,
}) => {
  const shellStyle: React.CSSProperties = {
    paddingTop: SPACING.XXXL,
    paddingBottom: SPACING.XXXL,
    paddingLeft: SPACING.XL,
    paddingRight: SPACING.XL,
    ...(fillContainer
      ? { minHeight: '100%', flex: 1 }
      : { minHeight: minHeightPx }),
  }

  return (
    <div
      className={style({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '[100%]',
      })}
      style={shellStyle}
    >
      <IllustratedMessage>
        {illustration}
        <Heading>{title}</Heading>
        <Content>
          <Text
            UNSAFE_style={{
              maxWidth: DESCRIPTION_MAX_WIDTH_PX,
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            {description}
          </Text>
        </Content>
        {actions ? (
          <div
            className={style({
              display: 'flex',
              flexDirection: 'row',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 16,
            })}
          >
            {actions}
          </div>
        ) : null}
      </IllustratedMessage>
    </div>
  )
}
