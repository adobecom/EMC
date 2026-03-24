/* 
* <license header>
*/

import React, { useState } from 'react'
import {
  View,
  Flex,
  Heading,
  Well,
  Divider,
  ActionButton,
  Link
} from '@adobe/react-spectrum'
import { Text } from '@react-spectrum/s2'
import ChevronDown from '@spectrum-icons/workflow/ChevronDown'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import Code from '@spectrum-icons/workflow/Code'
import Document from '@spectrum-icons/workflow/Document'
import Wrench from '@spectrum-icons/workflow/Wrench'
import Data from '@spectrum-icons/workflow/Data'
import Key from '@spectrum-icons/workflow/Key'
import TestABRemove from '@spectrum-icons/workflow/TestABRemove'

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
    icon: <Document size="S" />,
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
    icon: <Code size="S" />,
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
    icon: <Data size="S" />,
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
    icon: <Key size="S" />,
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
    icon: <TestABRemove size="S" />,
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
    <View marginBottom="size-200">
      {/* Custom clickable header instead of ActionButton for better alignment control */}
      <View
        UNSAFE_style={{
          cursor: 'pointer',
          padding: '12px 16px',
          borderRadius: '4px',
          transition: 'background-color 0.15s ease'
        }}
        UNSAFE_className="doc-section-header"
      >
        <Flex 
          direction="row" 
          alignItems="center" 
          gap="size-150" 
          width="100%"
          UNSAFE_style={{ cursor: 'pointer' }}
        >
          <ActionButton
            onPress={onToggle}
            isQuiet
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            UNSAFE_style={{ flexShrink: 0 }}
          >
            {isExpanded ? <ChevronDown size="S" /> : <ChevronRight size="S" />}
          </ActionButton>
          <div 
            style={{ color: 'var(--spectrum-global-color-gray-700)', flexShrink: 0, cursor: 'pointer' }}
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
                color: 'var(--spectrum-global-color-gray-600)',
                textAlign: 'left'
              }}
            >
              {section.description}
            </Text>
          </div>
        </Flex>
      </View>

      {isExpanded && (
        <View marginStart="size-400" marginTop="size-100">
          <Flex direction="column" gap="size-100">
            {section.docs.map(doc => (
              <DocItemComponent key={doc.file} doc={doc} />
            ))}
          </Flex>
        </View>
      )}
    </View>
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
    <View
      backgroundColor="gray-50"
      borderRadius="regular"
      padding="size-200"
      UNSAFE_style={{
        borderLeft: '3px solid var(--spectrum-global-color-blue-400)'
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex direction="row" alignItems="center" justifyContent="space-between" wrap="wrap" gap="size-100">
          <Text UNSAFE_style={{ fontWeight: 600 }}>{doc.title}</Text>
          <Link>
            <a 
              href={docUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Flex direction="row" alignItems="center" gap="size-50">
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
                  {doc.file} ↗
                </Text>
              </Flex>
            </a>
          </Link>
        </Flex>
        <Text 
          UNSAFE_style={{ 
            fontSize: '13px', 
            color: 'var(--spectrum-global-color-gray-700)',
            lineHeight: '1.5'
          }}
        >
          {doc.description}
        </Text>
      </Flex>
    </View>
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
    <View padding="size-400" maxWidth="900px" marginX="auto">
      {/* Header */}
      <View marginBottom="size-400">
        <Heading level={1}>Documentation Hub</Heading>
        <Text
          UNSAFE_style={{
            color: 'var(--spectrum-global-color-gray-700)',
            fontSize: '16px'
          }}
        >
          Comprehensive guides and references for the Event Management Cloud application.
        </Text>
      </View>

      {/* Quick Reference Card */}
      <Well marginBottom="size-400">
        <Heading level={3} marginTop="size-0">Quick Reference</Heading>
        <View
          UNSAFE_style={{
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
        </View>
      </Well>

      {/* Controls */}
      <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="size-200">
        <Heading level={2} marginBottom="size-0">Documentation</Heading>
        <Flex direction="row" gap="size-100">
          <ActionButton onPress={expandAll} isQuiet>
            Expand All
          </ActionButton>
          <ActionButton onPress={collapseAll} isQuiet>
            Collapse All
          </ActionButton>
        </Flex>
      </Flex>

      <Divider marginBottom="size-300" />

      {/* Documentation Sections */}
      <View>
        {documentationSections.map(section => (
          <DocSectionComponent
            key={section.id}
            section={section}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </View>

      {/* External Resources */}
      <View marginTop="size-500">
        <Heading level={2}>External Resources</Heading>
        <Divider marginBottom="size-300" />
        
        <View
          UNSAFE_style={{
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
        </View>
      </View>

      {/* API Reference Note */}
      <View marginTop="size-500">
        <Well>
          <Flex direction="row" alignItems="start" gap="size-200">
            <View UNSAFE_style={{ color: 'var(--spectrum-global-color-blue-600)' }}>
              <Wrench size="M" />
            </View>
            <View>
              <Heading level={4} marginTop="size-0">Backend API Reference</Heading>
              <Text>
                The backend OpenAPI specification is available at{' '}
                <code style={{ 
                  backgroundColor: 'var(--spectrum-global-color-gray-200)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  docs/backend-reference/openapi.json
                </code>
              </Text>
            </View>
          </Flex>
        </Well>
      </View>
    </View>
  )
}

/**
 * Quick reference item
 */
const QuickRefItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View
    backgroundColor="gray-75"
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
      <Text UNSAFE_style={{ fontWeight: 500, fontSize: '14px' }}>{value}</Text>
    </Flex>
  </View>
)

/**
 * External link card
 */
const ExternalLink: React.FC<{ title: string; url: string; description: string }> = ({ 
  title, 
  url, 
  description 
}) => (
  <View
    backgroundColor="gray-50"
    borderRadius="regular"
    padding="size-200"
    borderWidth="thin"
    borderColor="gray-200"
  >
    <Link>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <Text UNSAFE_style={{ fontWeight: 600, color: 'var(--spectrum-global-color-blue-600)' }}>
          {title} ↗
        </Text>
      </a>
    </Link>
    <Text 
      UNSAFE_style={{ 
        fontSize: '13px', 
        color: 'var(--spectrum-global-color-gray-700)',
        marginTop: '4px',
        display: 'block'
      }}
    >
      {description}
    </Text>
  </View>
)

export default About
