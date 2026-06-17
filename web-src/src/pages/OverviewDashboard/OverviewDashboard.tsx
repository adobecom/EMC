/*
* <license header>
*/

import React, { useEffect, useMemo, useState } from 'react'
import { Text, Button, Heading, Picker, PickerItem } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Refresh from '@react-spectrum/s2/icons/Refresh'
import Calendar from '@react-spectrum/s2/icons/Calendar'
import Collection from '@react-spectrum/s2/icons/Collection'
import UserGroup from '@react-spectrum/s2/icons/UserGroup'
import GlobeGrid from '@react-spectrum/s2/icons/GlobeGrid'
import Location from '@react-spectrum/s2/icons/Location'
import Data from '@react-spectrum/s2/icons/Data'
import { cachedApi } from '../../services/api'
import { BlurredLoadingOverlay } from '../../components/shared'
import { EventApiResponse, SeriesApiResponse } from '../../types/domain'
import { COLORS, GRADIENT_BACKGROUND, SPACING, TYPOGRAPHY } from '../../styles/designSystem'
import { IMS } from '../../types'
import { useSafeState, useRBACFilter, useHasPermission, usePersistentState } from '../../hooks'
import { useGroup } from '../../contexts/GroupContext'
import { SUPPORTED_SPEAKER_LOCALES, SPEAKER_LOCALE_LABELS } from '../../config/localeMapping'
import { hasLocalesSlice } from '../../types/configApi'

const FILTER_ALL = '__all__'

interface OverviewDashboardProps {
  ims: IMS
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: number | string
  subtitle?: string
  onClick?: () => void
}

/**
 * Stat Card component for displaying individual metrics
 */
const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, onClick }) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-global-color-gray-50)',
      border: '1px solid var(--spectrum-global-color-gray-200)',
      borderRadius: '8px',
      padding: 24,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      minHeight: '140px',
      position: 'relative',
      overflow: 'hidden'
    }}
    className="stat-card"
  >
    <div
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ height: '100%' }}
    >
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
        {/* Icon and Title Row */}
        <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
          <div style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
            {icon}
          </div>
          <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, color: 'var(--spectrum-global-color-gray-700)' }}>
            {title}
          </Text>
        </div>

        {/* Value */}
        <Text UNSAFE_style={{
          fontSize: '42px',
          fontWeight: 700,
          color: COLORS.DARK_GRAY,
          lineHeight: 1.1
        }}>
          {value}
        </Text>

        {/* Subtitle */}
        {subtitle && (
          <Text UNSAFE_style={{ ...TYPOGRAPHY.HELPER_TEXT, color: 'var(--spectrum-global-color-gray-600)' }}>
            {subtitle}
          </Text>
        )}
      </div>
    </div>
  </div>
)

/**
 * Distribution bar component for showing proportional data
 */
interface DistributionBarProps {
  items: { label: string; value: number; color: string }[]
  total: number
}

const DistributionBar: React.FC<DistributionBarProps> = ({ items, total }) => {
  if (total === 0) return null

  return (
    <div style={{ marginTop: 16 }}>
      {/* Bar */}
      <div className={style({ display: 'flex' })} style={{ height: 8, borderRadius: '4px', overflow: 'hidden' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              width: `${(item.value / total) * 100}%`,
              backgroundColor: item.color,
              minWidth: item.value > 0 ? '4px' : 0
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className={style({ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' })}>
        {items.map((item, idx) => (
          <div key={idx} className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: item.color
              }}
            />
            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700)' }}>
              {item.label}: {item.value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Template ID breakdown card
 */
interface TemplateBreakdownProps {
  templateCounts: Map<string, { count: number; seriesCount: number }>
}

const TemplateBreakdown: React.FC<TemplateBreakdownProps> = ({ templateCounts }) => {
  // Sort by event count descending
  const sortedTemplates = useMemo(() => {
    return Array.from(templateCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
  }, [templateCounts])

  // Generate colors for templates
  const templateColors = useMemo(() => {
    const colors = [
      '#0D66D0', // Blue
      '#2D9D92', // Teal
      '#CD3ACE', // Purple
      '#E68619', // Orange
      '#D7373F', // Red
      '#268E6C', // Green
      '#6E6E6E', // Gray
      '#8B5CF6', // Violet
    ]

    const colorMap = new Map<string, string>()
    sortedTemplates.forEach(([template], idx) => {
      colorMap.set(template, colors[idx % colors.length])
    })
    return colorMap
  }, [sortedTemplates])

  // Extract template name from path for display
  const getTemplateName = (templatePath: string): string => {
    const parts = templatePath.split('/')
    // Get the meaningful parts (last 2-3 segments)
    const meaningful = parts.slice(-3).filter(p => p && p !== 'template' && p !== 'simple')
    return meaningful.join(' / ') || templatePath
  }

  const totalEvents = Array.from(templateCounts.values()).reduce((sum, t) => sum + t.count, 0)

  return (
    <div
      style={{
        backgroundColor: 'var(--spectrum-global-color-gray-50)',
        border: '1px solid var(--spectrum-global-color-gray-200)',
        borderRadius: '8px',
        padding: 24
      }}
    >
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
        <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
          <Data />
          <Heading level={4} UNSAFE_style={{ margin: 0 }}>Events by Template</Heading>
        </div>

        {sortedTemplates.length === 0 ? (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            No template data available
          </Text>
        ) : (
          <div>
            {/* Visual bar chart */}
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
              {sortedTemplates.map(([template, data]) => {
                const percentage = totalEvents > 0 ? (data.count / totalEvents) * 100 : 0
                const displayName = getTemplateName(template)

                return (
                  <div key={template}>
                    <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })} style={{ marginBottom: 4 }}>
                      <Text
                        UNSAFE_style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--spectrum-global-color-gray-800)',
                          maxWidth: '70%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {displayName}
                      </Text>
                      <Text UNSAFE_style={{ fontSize: '13px', fontWeight: 600, color: templateColors.get(template) }}>
                        {data.count} events
                      </Text>
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        backgroundColor: 'var(--spectrum-global-color-gray-200)',
                        borderRadius: '4px',
                        height: 8,
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          backgroundColor: templateColors.get(template),
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>

                    <Text UNSAFE_style={{ fontSize: '11px', color: 'var(--spectrum-global-color-gray-600)', marginTop: '4px' }}>
                      {data.seriesCount} series using this template
                    </Text>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Default locale picker entries when no scope config is available */
const DEFAULT_LOCALE_PICKER_OPTIONS = SUPPORTED_SPEAKER_LOCALES.map((key) => ({
  key,
  label: SPEAKER_LOCALE_LABELS[key] || key,
}))

/**
 * Overview Dashboard - Main component
 * Displays comprehensive statistics and metrics for events and series
 */
export const OverviewDashboard: React.FC<OverviewDashboardProps> = () => {
  const { filterEvents, filterSeries } = useRBACFilter()
  const { groupVersion, activeGroup } = useGroup()
  const canReadEvents = useHasPermission('event', 'read')
  const canReadSeries = useHasPermission('series', 'read')
  const [events, setEvents] = useSafeState<EventApiResponse[]>([])
  const [series, setSeries] = useSafeState<SeriesApiResponse[]>([])
  const [isLoading, setIsLoading] = useSafeState(true)
  const [error, setError] = useSafeState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useSafeState<Date | null>(null)
  const [localeFilter, setLocaleFilter] = usePersistentState<string>('emc-overview-locale', FILTER_ALL)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [eventsData, seriesData] = await Promise.all([
        canReadEvents ? cachedApi.getEventsList() : Promise.resolve([]),
        canReadSeries ? cachedApi.getSeriesList() : Promise.resolve([])
      ])

      setEvents(filterEvents(eventsData))
      setSeries(filterSeries(seriesData))
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading overview data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [groupVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Locale options fetched from scope config; falls back to the static default list
  const [localeOptions, setLocaleOptions] = useState(DEFAULT_LOCALE_PICKER_OPTIONS)
  useEffect(() => {
    const scopeId = activeGroup?.scopeId
    if (!scopeId) {
      setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
      return
    }
    let cancelled = false
    cachedApi.getConfig(scopeId).then((result) => {
      if (cancelled) return
      if (result === null || 'error' in result) {
        setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
        return
      }
      const locales = hasLocalesSlice(result) ? result.locales.locales : undefined
      if (locales && locales.length > 0) {
        setLocaleOptions(locales.map((l) => ({ key: l.code, label: l.name })))
      } else {
        setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
      }
    }).catch(() => {
      if (!cancelled) setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
    })
    return () => { cancelled = true }
  }, [activeGroup?.scopeId])

  // Calculate statistics
  const stats = useMemo(() => {
    // Apply locale filter to event-derived stats only; series stats are always full counts.
    const filteredByLocale = localeFilter === FILTER_ALL
      ? events
      : events.filter(e => e.defaultLocale === localeFilter)

    // Basic counts
    const totalEvents = filteredByLocale.length
    const totalSeries = series.length

    // Event status distribution
    const publishedEvents = filteredByLocale.filter(e => e.published).length
    const draftEvents = filteredByLocale.filter(e => !e.published).length

    // Series status distribution
    const publishedSeries = series.filter(s => s.seriesStatus === 'published').length
    const draftSeries = series.filter(s => s.seriesStatus === 'draft').length
    const archivedSeries = series.filter(s => s.seriesStatus === 'archived').length

    // Event type distribution (locale-filtered)
    const inPersonEvents = filteredByLocale.filter(e => e.eventType === 'in-person' || e.eventType === 'InPerson').length
    const webinarEvents = filteredByLocale.filter(e => e.eventType === 'webinar' || e.eventType === 'Webinar').length
    const otherEvents = totalEvents - inPersonEvents - webinarEvents

    // Cloud type distribution (locale-filtered)
    const creativeCloudEvents = filteredByLocale.filter(e => e.cloudType === 'CreativeCloud').length
    const experienceCloudEvents = filteredByLocale.filter(e => e.cloudType === 'ExperienceCloud').length

    // Series cloud distribution (always full — series have no locale field)
    const creativeCloudSeries = series.filter(s => s.cloudType === 'CreativeCloud').length
    const experienceCloudSeries = series.filter(s => s.cloudType === 'ExperienceCloud').length

    // Total attendees (locale-filtered)
    const totalAttendees = filteredByLocale.reduce((sum, e) => sum + (e.attendeeCount || 0), 0)
    const totalCapacity = filteredByLocale.reduce((sum, e) => sum + (e.attendeeLimit || 0), 0)

    // Events by templateId (via series) — template breakdown uses full event set intentionally
    // because templateId is resolved via series which have no locale field
    const seriesTemplateMap = new Map<string, string>()
    series.forEach(s => {
      if (s.templateId) {
        seriesTemplateMap.set(s.seriesId, s.templateId)
      }
    })

    // Count events per template
    const templateCounts = new Map<string, { count: number; seriesCount: number }>()

    series.forEach(s => {
      if (s.templateId) {
        const existing = templateCounts.get(s.templateId) || { count: 0, seriesCount: 0 }
        existing.seriesCount++
        templateCounts.set(s.templateId, existing)
      }
    })

    events.forEach(e => {
      if (e.seriesId) {
        const templateId = seriesTemplateMap.get(e.seriesId)
        if (templateId) {
          const existing = templateCounts.get(templateId) || { count: 0, seriesCount: 0 }
          existing.count++
          templateCounts.set(templateId, existing)
        }
      }
    })

    // Upcoming / past events (locale-filtered)
    const now = Date.now()
    const upcomingEvents = filteredByLocale.filter(e => {
      if (e.localStartTimeMillis) return e.localStartTimeMillis > now
      if (e.startDate) return new Date(e.startDate).getTime() > now
      return false
    }).length

    const pastEvents = totalEvents - upcomingEvents

    return {
      totalEvents,
      totalSeries,
      publishedEvents,
      draftEvents,
      publishedSeries,
      draftSeries,
      archivedSeries,
      inPersonEvents,
      webinarEvents,
      otherEvents,
      creativeCloudEvents,
      experienceCloudEvents,
      creativeCloudSeries,
      experienceCloudSeries,
      totalAttendees,
      totalCapacity,
      templateCounts,
      upcomingEvents,
      pastEvents
    }
  }, [events, series, localeFilter])

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center' })} style={{ minHeight: 480 }}>
          <Heading level={3}>Error Loading Dashboard</Heading>
          <Text>{error}</Text>
          <Button variant="secondary" onPress={loadData}>
            <Refresh />
            <Text>Retry</Text>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, background: GRADIENT_BACKGROUND }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
          <div>
            <Heading level={1} UNSAFE_style={{ marginBottom: 4 }}>Overview Dashboard</Heading>
            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)', fontSize: '14px' }}>
              Event Management Console statistics and metrics
            </Text>
          </div>

          <div className={style({ display: 'flex', gap: 12, alignItems: 'center' })}>
            {lastUpdated && (
              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
            <Picker
              aria-label="Filter by language"
              selectedKey={localeFilter}
              onSelectionChange={(key) => {
                if (key != null) setLocaleFilter(String(key))
              }}
            >
              <PickerItem id={FILTER_ALL} textValue="All languages">All languages</PickerItem>
              {localeOptions.map(o => (
                <PickerItem key={o.key} id={o.key} textValue={o.label}>
                  {o.label}
                </PickerItem>
              ))}
            </Picker>
            <Button variant="secondary" onPress={loadData} isPending={isLoading}>
              <Refresh />
              <Text>Refresh</Text>
            </Button>
          </div>
        </div>

        <>
            {/* Primary Stats Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: `${SPACING.MD}px`
              }}
            >
              {canReadEvents && (
                <StatCard
                  icon={<Calendar />}
                  title="Total Events"
                  value={stats.totalEvents}
                  subtitle={`${stats.upcomingEvents} upcoming, ${stats.pastEvents} past`}
                  onClick={() => window.location.hash = '#/events'}
                />
              )}

              {canReadSeries && (
                <StatCard
                  icon={<Collection />}
                  title="Total Series"
                  value={stats.totalSeries}
                  subtitle={`${stats.publishedSeries} published`}
                  onClick={() => window.location.hash = '#/series'}
                />
              )}

              {canReadEvents && (
                <StatCard
                  icon={<UserGroup />}
                  title="Total Attendees"
                  value={stats.totalAttendees.toLocaleString()}
                  subtitle={stats.totalCapacity > 0 ? `of ${stats.totalCapacity.toLocaleString()} capacity` : 'registered'}
                  onClick={() => window.location.hash = '#/registrations'}
                />
              )}

              {canReadEvents && (
                <StatCard
                  icon={<Calendar />}
                  title="Published Events"
                  value={stats.publishedEvents}
                  subtitle={`${stats.draftEvents} drafts`}
                />
              )}
            </div>

            {/* Secondary Stats - Two Column Layout */}
            {(canReadEvents || canReadSeries) && (
            <div className={style({ display: 'flex', gap: 24, flexWrap: 'wrap' })}>
              {/* Left Column - Event & Series Distributions */}
              <div style={{ flex: 1, minWidth: 368 }}>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 24 })}>
                  {/* Event Type Distribution */}
                  {canReadEvents && (
                  <div
                    style={{
                      backgroundColor: 'var(--spectrum-global-color-gray-50)',
                      border: '1px solid var(--spectrum-global-color-gray-200)',
                      borderRadius: '8px',
                      padding: 24
                    }}
                  >
                    <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })} style={{ marginBottom: 8 }}>
                      <Location />
                      <Heading level={4} UNSAFE_style={{ margin: 0 }}>Events by Type</Heading>
                    </div>

                    <div className={style({ display: 'flex', gap: 32 })} style={{ marginTop: 16 }}>
                      <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 })}>
                        <Text UNSAFE_style={{ fontSize: '32px', fontWeight: 700, color: '#0D66D0' }}>
                          {stats.inPersonEvents}
                        </Text>
                        <div className={style({ display: 'flex', gap: 4, alignItems: 'center' })}>
                          <Location />
                          <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                            In-Person
                          </Text>
                        </div>
                      </div>

                      <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 })}>
                        <Text UNSAFE_style={{ fontSize: '32px', fontWeight: 700, color: '#2D9D92' }}>
                          {stats.webinarEvents}
                        </Text>
                        <div className={style({ display: 'flex', gap: 4, alignItems: 'center' })}>
                          <GlobeGrid />
                          <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                            Webinar
                          </Text>
                        </div>
                      </div>

                      {stats.otherEvents > 0 && (
                        <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 })}>
                          <Text UNSAFE_style={{ fontSize: '32px', fontWeight: 700, color: '#6E6E6E' }}>
                            {stats.otherEvents}
                          </Text>
                          <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                            Other
                          </Text>
                        </div>
                      )}
                    </div>

                    <DistributionBar
                      items={[
                        { label: 'In-Person', value: stats.inPersonEvents, color: '#0D66D0' },
                        { label: 'Webinar', value: stats.webinarEvents, color: '#2D9D92' },
                        { label: 'Other', value: stats.otherEvents, color: '#6E6E6E' }
                      ]}
                      total={stats.totalEvents}
                    />
                  </div>
                  )}

                  {/* Cloud Type Distribution */}
                  {canReadEvents && (
                  <div
                    style={{
                      backgroundColor: 'var(--spectrum-global-color-gray-50)',
                      border: '1px solid var(--spectrum-global-color-gray-200)',
                      borderRadius: '8px',
                      padding: 24
                    }}
                  >
                    <Heading level={4} UNSAFE_style={{ margin: 0, marginBottom: 16 }}>Events by Cloud</Heading>

                    <div className={style({ display: 'flex', gap: 32 })}>
                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: '#E68619' }}>
                          {stats.creativeCloudEvents}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Creative Cloud
                        </Text>
                      </div>

                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: '#EB1000' }}>
                          {stats.experienceCloudEvents}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Experience Cloud
                        </Text>
                      </div>
                    </div>

                    <DistributionBar
                      items={[
                        { label: 'Creative Cloud', value: stats.creativeCloudEvents, color: '#E68619' },
                        { label: 'Experience Cloud', value: stats.experienceCloudEvents, color: '#EB1000' }
                      ]}
                      total={stats.totalEvents}
                    />
                  </div>
                  )}

                  {/* Series Status Distribution */}
                  {canReadSeries && (
                  <div
                    style={{
                      backgroundColor: 'var(--spectrum-global-color-gray-50)',
                      border: '1px solid var(--spectrum-global-color-gray-200)',
                      borderRadius: '8px',
                      padding: 24
                    }}
                  >
                    <Heading level={4} UNSAFE_style={{ margin: 0, marginBottom: 16 }}>Series by Status</Heading>

                    <div className={style({ display: 'flex', gap: 24 })}>
                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: COLORS.STATUS_PUBLISHED }}>
                          {stats.publishedSeries}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Published
                        </Text>
                      </div>

                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: COLORS.STATUS_DRAFT }}>
                          {stats.draftSeries}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Draft
                        </Text>
                      </div>

                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: COLORS.STATUS_ARCHIVED }}>
                          {stats.archivedSeries}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Archived
                        </Text>
                      </div>
                    </div>

                    <DistributionBar
                      items={[
                        { label: 'Published', value: stats.publishedSeries, color: COLORS.STATUS_PUBLISHED },
                        { label: 'Draft', value: stats.draftSeries, color: COLORS.STATUS_DRAFT },
                        { label: 'Archived', value: stats.archivedSeries, color: COLORS.STATUS_ARCHIVED }
                      ]}
                      total={stats.totalSeries}
                    />
                  </div>
                  )}
                </div>
              </div>

              {/* Right Column - Template Breakdown */}
              {canReadEvents && (
              <div style={{ flex: 1, minWidth: 368 }}>
                <TemplateBreakdown templateCounts={stats.templateCounts} />
              </div>
              )}
            </div>
            )}

            {/* Quick Actions */}
            {(canReadEvents || canReadSeries) && (
            <div
              style={{
                backgroundColor: 'var(--spectrum-global-color-gray-100)',
                borderRadius: '8px',
                padding: 24,
                marginTop: 16
              }}
            >
              <Heading level={4} UNSAFE_style={{ margin: 0, marginBottom: 16 }}>Quick Actions</Heading>
              <div className={style({ display: 'flex', gap: 16, flexWrap: 'wrap' })}>
                {canReadEvents && (
                  <Button variant="secondary" onPress={() => window.location.hash = '#/events/new/in-person'}>
                    <Location />
                    <Text>Create In-Person Event</Text>
                  </Button>
                )}
                {canReadEvents && (
                  <Button variant="secondary" onPress={() => window.location.hash = '#/events/new/webinar'}>
                    <GlobeGrid />
                    <Text>Create Webinar</Text>
                  </Button>
                )}
                {canReadSeries && (
                  <Button variant="secondary" onPress={() => window.location.hash = '#/series/new'}>
                    <Collection />
                    <Text>Create Series</Text>
                  </Button>
                )}
                {canReadEvents && (
                  <Button variant="secondary" onPress={() => window.location.hash = '#/events'}>
                    <Calendar />
                    <Text>View All Events</Text>
                  </Button>
                )}
              </div>
            </div>
            )}
        </>
      </div>

      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading dashboard data..."
        ariaLabel="Loading dashboard"
      />
    </div>
  )
}

export default OverviewDashboard
