/*
* <license header>
*/

import React, { useState } from 'react'
import {
  ActionButton,
  Divider,
  Heading,
  Link,
  Text
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import Code from '@react-spectrum/s2/icons/Code'
import FileText from '@react-spectrum/s2/icons/FileText'
import Tools from '@react-spectrum/s2/icons/Tools'
import Data from '@react-spectrum/s2/icons/Data'
import Key from '@react-spectrum/s2/icons/Key'
import Cancel from '@react-spectrum/s2/icons/Cancel'

/**
 * Documentation section configuration
 */
interface DocSection {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  docs: DocItem[]
}

interface DocItem {
  title: string
  file: string
  description: string
}

const documentationSections: DocSection[] = [
  {
    id: 'getting-started',
    icon: <FileText />,
    title: 'Getting Started',
    description: 'Essential guides for understanding and running the project',
    docs: [
      {
        title: 'Project Overview',
        file: 'PROJECT_OVERVIEW.md',
        description: 'High-level overview of the EMC application, architecture, and domain model.'
      },
      {
        title: 'Development Workflow',
        file: 'DEVELOPMENT_WORKFLOW.md',
        description: 'Step-by-step guide for local development, debugging, and deployment.'
      },
      {
        title: 'README',
        file: 'README.md',
        description: 'Quick reference and project summary.'
      }
    ]
  },
  {
    id: 'frontend',
    icon: <Code />,
    title: 'Frontend Development',
    description: 'Guides for building and extending the React UI',
    docs: [
      {
        title: 'Frontend Guide',
        file: 'FRONTEND.md',
        description: 'Architecture overview, component patterns, state management, and best practices.'
      },
      {
        title: 'Modular Component Pattern',
        file: 'MODULAR_COMPONENT_PATTERN.md',
        description: 'How to build and structure modular, reusable components.'
      },
      {
        title: 'Event Form Guide',
        file: 'EVENT_FORM.md',
        description: 'Complete guide to the multi-step event creation wizard.'
      },
      {
        title: 'Design System',
        file: 'DESIGN_SYSTEM.md',
        description: 'Centralized design tokens, layout constants, and style utilities.'
      },
      {
        title: 'Top Nav Layout',
        file: 'TOP_NAV_LAYOUT.md',
        description: 'Navigation structure and layout patterns.'
      },
      {
        title: 'User Panel Implementation',
        file: 'USER_PANEL_IMPLEMENTATION.md',
        description: 'User authentication UI and profile display.'
      }
    ]
  },
  {
    id: 'api',
    icon: <Data />,
    title: 'API & Services',
    description: 'Backend integration and external API documentation',
    docs: [
      {
        title: 'API Centralization',
        file: 'API_CENTRALIZATION.md',
        description: 'Centralized API service layer, mock data, and backend integration patterns.'
      },
      {
        title: 'Google Places Setup',
        file: 'GOOGLE_PLACES_SETUP.md',
        description: 'Configuration for venue autocomplete and location services.'
      }
    ]
  },
  {
    id: 'dev-token',
    icon: <Key />,
    title: 'Authentication & Dev Token',
    description: 'How to authenticate and use development tokens',
    docs: [
      {
        title: 'Dev Token Quick Start',
        file: 'DEV_TOKEN_QUICKSTART.md',
        description: '30-second setup guide to get your development token working.'
      },
      {
        title: 'Dev Token Guide',
        file: 'DEV_TOKEN_GUIDE.md',
        description: 'Comprehensive guide to the token system architecture.'
      },
      {
        title: 'Dev Token Security',
        file: 'DEV_TOKEN_SECURITY.md',
        description: 'Security considerations and best practices for token handling.'
      }
    ]
  },
  {
    id: 'testing',
    icon: <Cancel />,
    title: 'Testing',
    description: 'Testing strategies and patterns',
    docs: [
      {
        title: 'Testing Guide',
        file: 'TESTING.md',
        description: 'Unit testing, E2E testing, and testing best practices.'
      }
    ]
  }
]

/**
 * Collapsible documentation section
 */
interface DocSectionComponentProps {
  section: DocSection
  isExpanded: boolean
  onToggle: () => void
}

const DocSectionComponent: React.FC<DocSectionComponentProps> = ({
  section,
  isExpanded,
  onToggle
}) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Custom clickable header instead of ActionButton for better alignment control */}
      <div
        style={{
          cursor: 'pointer',
          padding: '12px 16px',
          borderRadius: '4px',
          transition: 'background-color 0.15s ease'
        }}
        className="doc-section-header"
      >
        <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, width: 'full' })}
          style={{ cursor: 'pointer' }}
        >
          <ActionButton
            onPress={onToggle}
            isQuiet
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            UNSAFE_style={{ flexShrink: 0 }}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </ActionButton>
          <div
            style={{ color: 'var(--spectrum-gray-700)', flexShrink: 0, cursor: 'pointer' }}
            onClick={onToggle}
          >
            {section.icon}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'flex-start',
              textAlign: 'left',
              flex: 1,
              cursor: 'pointer'
            }}
            onClick={onToggle}
          >
            <Text UNSAFE_style={{ fontWeight: 600, textAlign: 'left' }}>{section.title}</Text>
            <Text
              UNSAFE_style={{
                fontSize: '12px',
                color: 'var(--spectrum-gray-600)',
                textAlign: 'left'
              }}
            >
              {section.description}
            </Text>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginLeft: '32px', marginTop: '8px' }}>
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
            {section.docs.map(doc => (
              <DocItemComponent key={doc.file} doc={doc} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual documentation item
 */
interface DocItemComponentProps {
  doc: DocItem
}

// Helper to determine the correct path for each doc file
const getDocPath = (filename: string): string => {
  if (filename === 'README.md') {
    return 'README.md'
  }
  return `docs/${filename}`
}

const DocItemComponent: React.FC<DocItemComponentProps> = ({ doc }) => {
  const docPath = getDocPath(doc.file)
  // GitHub URL for viewing .md files
  const githubBaseUrl = 'https://github.com/adobecom/EMC/blob/main'
  const docUrl = `${githubBaseUrl}/${docPath}`

  return (
    <div
      style={{
        border: '1px solid var(--spectrum-gray-300)',
        borderRadius: '4px',
        padding: '16px',
        backgroundColor: 'var(--spectrum-gray-75)',
        borderLeft: '3px solid var(--spectrum-blue-400)'
      }}
    >
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
        <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })}
          style={{ flexWrap: 'wrap', gap: '8px' }}
        >
          <Text UNSAFE_style={{ fontWeight: 600 }}>{doc.title}</Text>
          <Link href={docUrl} target="_blank" rel="noopener noreferrer">
            <Text
              UNSAFE_style={{
                fontSize: '11px',
                color: 'var(--spectrum-blue-600)',
                fontFamily: 'monospace',
                backgroundColor: 'var(--spectrum-blue-100)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              {doc.file} ↗
            </Text>
          </Link>
        </div>
        <Text
          UNSAFE_style={{
            fontSize: '13px',
            color: 'var(--spectrum-gray-700)',
            lineHeight: '1.5'
          }}
        >
          {doc.description}
        </Text>
      </div>
    </div>
  )
}

/**
 * About page - Documentation Hub
 */
export const About: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['getting-started']) // Default expand first section
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const expandAll = () => {
    setExpandedSections(new Set(documentationSections.map(s => s.id)))
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Heading level={1}>Documentation Hub</Heading>
        <Text
          UNSAFE_style={{
            color: 'var(--spectrum-gray-700)',
            fontSize: '16px'
          }}
        >
          Comprehensive guides and references for the Event Management Cloud application.
        </Text>
      </div>

      {/* Quick Reference Card */}
      <div
        style={{
          border: '1px solid var(--spectrum-gray-300)',
          borderRadius: '4px',
          padding: '16px',
          backgroundColor: 'var(--spectrum-gray-75)',
          marginBottom: '32px'
        }}
      >
        <Heading level={3}>Quick Reference</Heading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '16px'
          }}
        >
          <QuickRefItem
            label="Tech Stack"
            value="React 16, TypeScript, Adobe Spectrum"
          />
          <QuickRefItem
            label="External APIs"
            value="ESP, ESL, Google Places, Chimera"
          />
          <QuickRefItem
            label="Dev Server"
            value="localhost:3000"
          />
          <QuickRefItem
            label="Start Command"
            value="aio app run"
          />
        </div>
      </div>

      {/* Controls */}
      <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' })}
        style={{ marginBottom: '16px' }}
      >
        <Heading level={2}>Documentation</Heading>
        <div className={style({ display: 'flex', flexDirection: 'row', gap: 8 })}>
          <ActionButton onPress={expandAll} isQuiet>
            Expand All
          </ActionButton>
          <ActionButton onPress={collapseAll} isQuiet>
            Collapse All
          </ActionButton>
        </div>
      </div>

      <Divider />
      <div style={{ marginBottom: '24px' }} />

      {/* Documentation Sections */}
      <div>
        {documentationSections.map(section => (
          <DocSectionComponent
            key={section.id}
            section={section}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      {/* External Resources */}
      <div style={{ marginTop: '40px' }}>
        <Heading level={2}>External Resources</Heading>
        <Divider />
        <div style={{ marginBottom: '24px' }} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}
        >
          <ExternalLink
            title="Adobe App Builder"
            url="https://developer.adobe.com/app-builder/docs/"
            description="Official App Builder documentation"
          />
          <ExternalLink
            title="React Spectrum"
            url="https://react-spectrum.adobe.com/"
            description="Adobe's design system and component library"
          />
          <ExternalLink
            title="Adobe I/O Runtime"
            url="https://developer.adobe.com/runtime/docs/"
            description="Serverless runtime documentation"
          />
          <ExternalLink
            title="TypeScript"
            url="https://www.typescriptlang.org/docs/"
            description="TypeScript language documentation"
          />
        </div>
      </div>

      {/* API Reference Note */}
      <div style={{ marginTop: '40px' }}>
        <div
          style={{
            border: '1px solid var(--spectrum-gray-300)',
            borderRadius: '4px',
            padding: '16px',
            backgroundColor: 'var(--spectrum-gray-75)'
          }}
        >
          <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'start', gap: 16 })}>
            <div style={{ color: 'var(--spectrum-blue-600)' }}>
              <Tools />
            </div>
            <div>
              <Heading level={4}>Backend API Reference</Heading>
              <Text>
                The backend OpenAPI specification is available at{' '}
                <code style={{
                  backgroundColor: 'var(--spectrum-gray-200)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  docs/backend-reference/openapi.json
                </code>
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Quick reference item
 */
const QuickRefItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-gray-75)',
      padding: '12px',
      borderRadius: '4px'
    }}
  >
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
      <Text
        UNSAFE_style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--spectrum-gray-600)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {label}
      </Text>
      <Text UNSAFE_style={{ fontWeight: 500, fontSize: '14px' }}>{value}</Text>
    </div>
  </div>
)

/**
 * External link card
 */
const ExternalLink: React.FC<{ title: string; url: string; description: string }> = ({
  title,
  url,
  description
}) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-gray-75)',
      borderRadius: '4px',
      padding: '16px',
      border: '1px solid var(--spectrum-gray-200)'
    }}
  >
    <Link href={url} target="_blank" rel="noopener noreferrer">
      <Text UNSAFE_style={{ fontWeight: 600 }}>
        {title} ↗
      </Text>
    </Link>
    <Text
      UNSAFE_style={{
        fontSize: '13px',
        color: 'var(--spectrum-gray-700)',
        marginTop: '4px',
        display: 'block'
      }}
    >
      {description}
    </Text>
  </div>
)

export default About
