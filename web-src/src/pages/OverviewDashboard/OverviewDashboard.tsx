/* 
* <license header>
*/

import React, { useEffect, useMemo } from 'react'
import {
  View,
  Flex,
  Heading,
  Text,
  ActionButton
} from '@adobe/react-spectrum'
import Refresh from '@spectrum-icons/workflow/Refresh'
import Events from '@spectrum-icons/workflow/Events'
import Collection from '@spectrum-icons/workflow/Collection'
import UserGroup from '@spectrum-icons/workflow/UserGroup'
import Globe from '@spectrum-icons/workflow/Globe'
import Location from '@spectrum-icons/workflow/Location'
import Data from '@spectrum-icons/workflow/Data'
import { cachedApi } from '../../services/api'
import { BlurredLoadingOverlay } from '../../components/shared'
import { EventApiResponse, SeriesApiResponse } from '../../types/domain'
import { COLORS, SPACING, TYPOGRAPHY } from '../../styles/designSystem'
import { IMS } from '../../types'
import { useSafeState, useRBACFilter } from '../../hooks'

interface OverviewDashboardProps {
  ims: IMS
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: number | string
  subtitle?: string
  color?: string
  onClick?: () => void
}

/**
 * Stat Card component for displaying individual metrics
 */
const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color = COLORS.ADOBE_RED, onClick }) => (
  <View
    backgroundColor="gray-50"
    borderWidth="thin"
    borderColor="gray-200"
    borderRadius="medium"
    padding="size-300"
    UNSAFE_style={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      minHeight: '140px',
      position: 'relative',
      overflow: 'hidden'
    }}
    UNSAFE_className="stat-card"
  >
    <div onClick={onClick} style={{ height: '100%' }}>
      {/* Accent bar on top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: color
        }}
      />
      
      <Flex direction="column" gap="size-150" height="100%">
        {/* Icon and Title Row */}
        <Flex direction="row" gap="size-100" alignItems="center">
          <View UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
            {icon}
          </View>
          <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, color: 'var(--spectrum-global-color-gray-700)' }}>
            {title}
          </Text>
        </Flex>
        
        {/* Value */}
        <Text UNSAFE_style={{
          fontSize: '42px',
          fontWeight: 700,
          color: COLORS.BLACK,
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
      </Flex>
    </div>
  </View>
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
    <View marginTop="size-200">
      {/* Bar */}
      <Flex direction="row" height="size-100" UNSAFE_style={{ borderRadius: '4px', overflow: 'hidden' }}>
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
      </Flex>
      
      {/* Legend */}
      <Flex direction="row" gap="size-200" marginTop="size-150" wrap="wrap">
        {items.map((item, idx) => (
          <Flex key={idx} direction="row" gap="size-75" alignItems="center">
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
          </Flex>
        ))}
      </Flex>
    </View>
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
    <View
      backgroundColor="gray-50"
      borderWidth="thin"
      borderColor="gray-200"
      borderRadius="medium"
      padding="size-300"
    >
      <Flex direction="column" gap="size-200">
        <Flex direction="row" gap="size-100" alignItems="center">
          <Data size="S" />
          <Heading level={4} margin="size-0">Events by Template</Heading>
        </Flex>
        
        {sortedTemplates.length === 0 ? (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            No template data available
          </Text>
        ) : (
          <View>
            {/* Visual bar chart */}
            <Flex direction="column" gap="size-150">
              {sortedTemplates.map(([template, data]) => {
                const percentage = totalEvents > 0 ? (data.count / totalEvents) * 100 : 0
                const displayName = getTemplateName(template)
                
                return (
                  <View key={template}>
                    <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="size-50">
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
                    </Flex>
                    
                    {/* Progress bar */}
                    <View
                      backgroundColor="gray-200"
                      borderRadius="small"
                      height="size-75"
                      overflow="hidden"
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
                    </View>
                    
                    <Text UNSAFE_style={{ fontSize: '11px', color: 'var(--spectrum-global-color-gray-600)', marginTop: '4px' }}>
                      {data.seriesCount} series using this template
                    </Text>
                  </View>
                )
              })}
            </Flex>
          </View>
        )}
      </Flex>
    </View>
  )
}

/**
 * Overview Dashboard - Main component
 * Displays comprehensive statistics and metrics for events and series
 */
export const OverviewDashboard: React.FC<OverviewDashboardProps> = () => {
  const { filterEvents, filterSeries } = useRBACFilter()
  const [events, setEvents] = useSafeState<EventApiResponse[]>([])
  const [series, setSeries] = useSafeState<SeriesApiResponse[]>([])
  const [isLoading, setIsLoading] = useSafeState(true)
  const [error, setError] = useSafeState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useSafeState<Date | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [eventsData, seriesData] = await Promise.all([
        cachedApi.getEventsList(),
        cachedApi.getSeriesList()
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
  }, [])

  // Calculate statistics
  const stats = useMemo(() => {
    // Basic counts
    const totalEvents = events.length
    const totalSeries = series.length
    
    // Event status distribution
    const publishedEvents = events.filter(e => e.published).length
    const draftEvents = events.filter(e => !e.published).length
    
    // Series status distribution
    const publishedSeries = series.filter(s => s.seriesStatus === 'published').length
    const draftSeries = series.filter(s => s.seriesStatus === 'draft').length
    const archivedSeries = series.filter(s => s.seriesStatus === 'archived').length
    
    // Event type distribution
    const inPersonEvents = events.filter(e => e.eventType === 'in-person' || e.eventType === 'InPerson').length
    const webinarEvents = events.filter(e => e.eventType === 'webinar' || e.eventType === 'Webinar').length
    const otherEvents = totalEvents - inPersonEvents - webinarEvents
    
    // Cloud type distribution
    const creativeCloudEvents = events.filter(e => e.cloudType === 'CreativeCloud').length
    const experienceCloudEvents = events.filter(e => e.cloudType === 'ExperienceCloud').length
    
    const creativeCloudSeries = series.filter(s => s.cloudType === 'CreativeCloud').length
    const experienceCloudSeries = series.filter(s => s.cloudType === 'ExperienceCloud').length
    
    // Calculate total attendees
    const totalAttendees = events.reduce((sum, e) => sum + (e.attendeeCount || 0), 0)
    const totalCapacity = events.reduce((sum, e) => sum + (e.attendeeLimit || 0), 0)
    
    // Events by templateId (via series)
    // First, create a map of seriesId -> templateId
    const seriesTemplateMap = new Map<string, string>()
    series.forEach(s => {
      if (s.templateId) {
        seriesTemplateMap.set(s.seriesId, s.templateId)
      }
    })
    
    // Then count events per template
    const templateCounts = new Map<string, { count: number; seriesCount: number }>()
    
    // First, count series per template
    series.forEach(s => {
      if (s.templateId) {
        const existing = templateCounts.get(s.templateId) || { count: 0, seriesCount: 0 }
        existing.seriesCount++
        templateCounts.set(s.templateId, existing)
      }
    })
    
    // Then count events per template (via their series)
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
    
    // Upcoming events (events with start date in the future)
    const now = Date.now()
    const upcomingEvents = events.filter(e => {
      if (e.localStartTimeMillis) return e.localStartTimeMillis > now
      if (e.startDate) return new Date(e.startDate).getTime() > now
      return false
    }).length
    
    // Past events
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
  }, [events, series])

  if (error) {
    return (
      <View padding="size-400">
        <Flex direction="column" gap="size-200" alignItems="center" justifyContent="center" minHeight="size-6000">
          <Heading level={3}>Error Loading Dashboard</Heading>
          <Text>{error}</Text>
          <ActionButton onPress={loadData}>
            <Refresh />
            <Text>Retry</Text>
          </ActionButton>
        </Flex>
      </View>
    )
  }

  return (
    <View padding="size-400" maxWidth="1400px" marginX="auto">
      <Flex direction="column" gap="size-400">
        {/* Header */}
        <Flex direction="row" justifyContent="space-between" alignItems="center">
          <View>
            <Heading level={1} marginBottom="size-50">Overview Dashboard</Heading>
            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)', fontSize: '14px' }}>
              Event Management Cloud statistics and metrics
            </Text>
          </View>
          
          <Flex direction="row" gap="size-150" alignItems="center">
            {lastUpdated && (
              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
            <ActionButton onPress={loadData} isQuiet isDisabled={isLoading}>
              <Refresh />
              <Text>Refresh</Text>
            </ActionButton>
          </Flex>
        </Flex>

        <>
            {/* Primary Stats Row */}
            <View
              UNSAFE_style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: `${SPACING.MD}px`
              }}
            >
              <StatCard
                icon={<Events size="S" />}
                title="Total Events"
                value={stats.totalEvents}
                subtitle={`${stats.upcomingEvents} upcoming, ${stats.pastEvents} past`}
                color={COLORS.ADOBE_RED}
                onClick={() => window.location.hash = '#/events'}
              />
              
              <StatCard
                icon={<Collection size="S" />}
                title="Total Series"
                value={stats.totalSeries}
                subtitle={`${stats.publishedSeries} published`}
                color="#0D66D0"
                onClick={() => window.location.hash = '#/series'}
              />
              
              <StatCard
                icon={<UserGroup size="S" />}
                title="Total Attendees"
                value={stats.totalAttendees.toLocaleString()}
                subtitle={stats.totalCapacity > 0 ? `of ${stats.totalCapacity.toLocaleString()} capacity` : 'registered'}
                color="#268E6C"
                onClick={() => window.location.hash = '#/registrations'}
              />
              
              <StatCard
                icon={<Events size="S" />}
                title="Published Events"
                value={stats.publishedEvents}
                subtitle={`${stats.draftEvents} drafts`}
                color={COLORS.STATUS_PUBLISHED}
              />
            </View>

            {/* Secondary Stats - Two Column Layout */}
            <Flex direction="row" gap="size-300" wrap="wrap">
              {/* Left Column - Event Distributions */}
              <View flex="1" minWidth="size-4600">
                <Flex direction="column" gap="size-300">
                  {/* Event Type Distribution */}
                  <View
                    backgroundColor="gray-50"
                    borderWidth="thin"
                    borderColor="gray-200"
                    borderRadius="medium"
                    padding="size-300"
                  >
                    <Flex direction="row" gap="size-100" alignItems="center" marginBottom="size-100">
                      <Location size="S" />
                      <Heading level={4} margin="size-0">Events by Type</Heading>
                    </Flex>
                    
                    <Flex direction="row" gap="size-400" marginTop="size-200">
                      <Flex direction="column" alignItems="center" gap="size-50">
                        <Text UNSAFE_style={{ fontSize: '32px', fontWeight: 700, color: '#0D66D0' }}>
                          {stats.inPersonEvents}
                        </Text>
                        <Flex direction="row" gap="size-50" alignItems="center">
                          <Location size="XS" />
                          <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                            In-Person
                          </Text>
                        </Flex>
                      </Flex>
                      
                      <Flex direction="column" alignItems="center" gap="size-50">
                        <Text UNSAFE_style={{ fontSize: '32px', fontWeight: 700, color: '#2D9D92' }}>
                          {stats.webinarEvents}
                        </Text>
                        <Flex direction="row" gap="size-50" alignItems="center">
                          <Globe size="XS" />
                          <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                            Webinar
                          </Text>
                        </Flex>
                      </Flex>
                      
                      {stats.otherEvents > 0 && (
                        <Flex direction="column" alignItems="center" gap="size-50">
                          <Text UNSAFE_style={{ fontSize: '32px', fontWeight: 700, color: '#6E6E6E' }}>
                            {stats.otherEvents}
                          </Text>
                          <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                            Other
                          </Text>
                        </Flex>
                      )}
                    </Flex>
                    
                    <DistributionBar
                      items={[
                        { label: 'In-Person', value: stats.inPersonEvents, color: '#0D66D0' },
                        { label: 'Webinar', value: stats.webinarEvents, color: '#2D9D92' },
                        { label: 'Other', value: stats.otherEvents, color: '#6E6E6E' }
                      ]}
                      total={stats.totalEvents}
                    />
                  </View>

                  {/* Cloud Type Distribution */}
                  <View
                    backgroundColor="gray-50"
                    borderWidth="thin"
                    borderColor="gray-200"
                    borderRadius="medium"
                    padding="size-300"
                  >
                    <Heading level={4} margin="size-0" marginBottom="size-200">Events by Cloud</Heading>
                    
                    <Flex direction="row" gap="size-400">
                      <Flex direction="column" gap="size-50">
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: '#E68619' }}>
                          {stats.creativeCloudEvents}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Creative Cloud
                        </Text>
                      </Flex>
                      
                      <Flex direction="column" gap="size-50">
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: '#EB1000' }}>
                          {stats.experienceCloudEvents}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Experience Cloud
                        </Text>
                      </Flex>
                    </Flex>
                    
                    <DistributionBar
                      items={[
                        { label: 'Creative Cloud', value: stats.creativeCloudEvents, color: '#E68619' },
                        { label: 'Experience Cloud', value: stats.experienceCloudEvents, color: '#EB1000' }
                      ]}
                      total={stats.totalEvents}
                    />
                  </View>

                  {/* Series Status Distribution */}
                  <View
                    backgroundColor="gray-50"
                    borderWidth="thin"
                    borderColor="gray-200"
                    borderRadius="medium"
                    padding="size-300"
                  >
                    <Heading level={4} margin="size-0" marginBottom="size-200">Series by Status</Heading>
                    
                    <Flex direction="row" gap="size-300">
                      <Flex direction="column" gap="size-50">
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: COLORS.STATUS_PUBLISHED }}>
                          {stats.publishedSeries}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Published
                        </Text>
                      </Flex>
                      
                      <Flex direction="column" gap="size-50">
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: COLORS.STATUS_DRAFT }}>
                          {stats.draftSeries}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Draft
                        </Text>
                      </Flex>
                      
                      <Flex direction="column" gap="size-50">
                        <Text UNSAFE_style={{ fontSize: '28px', fontWeight: 700, color: COLORS.STATUS_ARCHIVED }}>
                          {stats.archivedSeries}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Archived
                        </Text>
                      </Flex>
                    </Flex>
                    
                    <DistributionBar
                      items={[
                        { label: 'Published', value: stats.publishedSeries, color: COLORS.STATUS_PUBLISHED },
                        { label: 'Draft', value: stats.draftSeries, color: COLORS.STATUS_DRAFT },
                        { label: 'Archived', value: stats.archivedSeries, color: COLORS.STATUS_ARCHIVED }
                      ]}
                      total={stats.totalSeries}
                    />
                  </View>
                </Flex>
              </View>

              {/* Right Column - Template Breakdown */}
              <View flex="1" minWidth="size-4600">
                <TemplateBreakdown templateCounts={stats.templateCounts} />
              </View>
            </Flex>

            {/* Quick Actions */}
            <View
              backgroundColor="gray-100"
              borderRadius="medium"
              padding="size-300"
              marginTop="size-200"
            >
              <Heading level={4} margin="size-0" marginBottom="size-200">Quick Actions</Heading>
              <Flex direction="row" gap="size-200" wrap="wrap">
                <ActionButton onPress={() => window.location.hash = '#/events/new/in-person'}>
                  <Location />
                  <Text>Create In-Person Event</Text>
                </ActionButton>
                <ActionButton onPress={() => window.location.hash = '#/events/new/webinar'}>
                  <Globe />
                  <Text>Create Webinar</Text>
                </ActionButton>
                <ActionButton onPress={() => window.location.hash = '#/series/new'}>
                  <Collection />
                  <Text>Create Series</Text>
                </ActionButton>
                <ActionButton onPress={() => window.location.hash = '#/events'}>
                  <Events />
                  <Text>View All Events</Text>
                </ActionButton>
              </Flex>
            </View>
        </>
      </Flex>

      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading dashboard data..."
        ariaLabel="Loading dashboard"
      />
    </View>
  )
}

export default OverviewDashboard
