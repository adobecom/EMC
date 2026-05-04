import React, { useEffect, useRef } from 'react'
import { Text } from '@react-spectrum/s2'
import type Delta from 'quill-delta'
import 'quill/dist/quill.snow.css'

/** Matches toolbar capabilities; omits color/background/font/size so paste cannot add them. */
const RTE_FORMATS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'indent',
  'align',
  'link',
] as const

interface RichTextEditorProps {
  label: string
  value: string
  onChange: (value: string) => void
  isRequired?: boolean
  height?: string
  description?: string
}

/**
 * Layout-only overrides (position, z-index). Colors / surfaces live in index.css
 * (`.rte-wrapper` + Quill) so light/dark Spectrum tokens apply.
 */
const editorStyles = `
  .rte-wrapper {
    position: relative !important;
  }

  .rte-wrapper .ql-toolbar.ql-snow {
    position: absolute !important;
    bottom: 10px !important;
    left: 10px !important;
    right: 10px !important;
    border: none !important;
    border-radius: 8px !important;
    padding: 6px 10px !important;
    z-index: 10 !important;
  }

  .rte-wrapper .ql-toolbar.ql-snow .ql-formats {
    margin-right: 10px !important;
  }

  .rte-wrapper .ql-toolbar.ql-snow button,
  .rte-wrapper .ql-toolbar.ql-snow .ql-picker-label {
    border-radius: 4px !important;
  }

  .rte-wrapper .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
    top: auto !important;
    bottom: 100% !important;
    margin-bottom: 4px !important;
    border-radius: 6px !important;
  }

  .rte-wrapper .ql-toolbar.ql-snow .ql-align .ql-picker-options {
    top: auto !important;
    bottom: 100% !important;
  }

  .rte-wrapper .ql-container.ql-snow {
    border: none !important;
    font-family: inherit !important;
  }

  .rte-wrapper .ql-editor {
    padding: 12px !important;
    padding-bottom: 60px !important;
  }

  .rte-wrapper .ql-editor.ql-blank::before {
    font-style: normal !important;
  }
`

/** Quill / browsers often emit NBSP in HTML; we only support normal spaces in stored markup. */
function normalizeNbspInRteHtml(html: string): string {
  return html
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#x0*A0;/gi, ' ')
    .replace(/\u00A0/g, ' ')
}

function getExportedRteHtml(quill: {
  getText: () => string
  getSemanticHTML: () => string
}): string {
  if (!quill.getText().trim()) {
    return ''
  }
  return normalizeNbspInRteHtml(quill.getSemanticHTML())
}

function applyHtmlToQuill(quill: any, html: string, silent: string, isUpdatingRef: React.MutableRefObject<boolean>) {
  isUpdatingRef.current = true
  const trimmed = normalizeNbspInRteHtml(html).trim()
  if (!trimmed) {
    quill.setText('', silent)
  } else {
    const delta = quill.clipboard.convert({ html: trimmed, text: '' })
    quill.setContents(delta, silent)
  }
  isUpdatingRef.current = false
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  isRequired = false,
  height = '300px',
  description
}) => {
  const editorRef = useRef<any>(null)
  const quillRef = useRef<any>(null)
  // Track whether we're programmatically updating content to avoid feedback loops
  const isUpdatingRef = useRef(false)
  // Store the latest value in a ref for use in the text-change handler
  const valueRef = useRef(value)
  // Store the latest onChange in a ref to avoid stale closures
  const onChangeRef = useRef(onChange)
  /** Exact `value` string last applied from props (avoids re-sync when semantic HTML !== API string). */
  const lastAppliedValueRef = useRef<string | null>(null)
  
  // Keep refs in sync with props
  useEffect(() => {
    valueRef.current = value
  }, [value])
  
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  
  useEffect(() => {
    // Dynamically import Quill to avoid SSR issues
    const loadQuill = async () => {
      if (typeof window !== 'undefined' && !quillRef.current) {
        try {
          const Quill = (await import('quill')).default
          const Delta = (await import('quill-delta')).default
          const silent = Quill.sources?.SILENT ?? 'silent'

          if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
              theme: 'snow',
              formats: [...RTE_FORMATS],
              modules: {
                toolbar: [
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  [{ align: [] }],
                  ['link'],
                  ['clean'],
                ],
              },
              placeholder: `Enter ${label.toLowerCase()}...`,
            })

            // Drop Quill UI chrome if it ever appears in pasted HTML
            quillRef.current.clipboard.addMatcher('SPAN', (node: Node, delta: Delta) => {
              if (node instanceof HTMLElement && node.classList.contains('ql-ui')) {
                return new Delta()
              }
              return delta
            })

            const initial = valueRef.current ?? ''
            lastAppliedValueRef.current = initial
            applyHtmlToQuill(quillRef.current, initial, silent, isUpdatingRef)

            // Listen for changes - only trigger onChange for user edits, not programmatic updates
            quillRef.current.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
              if (isUpdatingRef.current || source !== 'user') {
                return
              }

              const normalizedHtml = getExportedRteHtml(quillRef.current)
              const prevNormalized = normalizeNbspInRteHtml(valueRef.current ?? '')

              if (normalizedHtml !== prevNormalized) {
                onChangeRef.current(normalizedHtml)
              }
            })
          }
        } catch (error) {
          console.error('Failed to load Quill editor:', error)
        }
      }
    }
    
    loadQuill()
    
    // Cleanup
    return () => {
      if (quillRef.current) {
        quillRef.current = null
      }
    }
  }, [label])
  
  // Update editor when `value` from parent changes (skip redundant applies — avoids selection jumps on each keystroke)
  useEffect(() => {
    const quill = quillRef.current
    if (!quill) {
      return
    }
    if (value === lastAppliedValueRef.current) {
      return
    }
    if (getExportedRteHtml(quill) === normalizeNbspInRteHtml(value ?? '')) {
      lastAppliedValueRef.current = value
      return
    }
    lastAppliedValueRef.current = value
    const silent = 'silent'
    const currentSelection = quill.getSelection()
    applyHtmlToQuill(quill, value || '', silent, isUpdatingRef)
    if (currentSelection) {
      quill.setSelection(currentSelection)
    }
  }, [value])

  // Inject custom styles (update if changed)
  useEffect(() => {
    const styleId = 'rte-custom-styles'
    let styleSheet = document.getElementById(styleId) as HTMLStyleElement
    if (!styleSheet) {
      styleSheet = document.createElement('style')
      styleSheet.id = styleId
      document.head.appendChild(styleSheet)
    }
    // Always update content to handle hot reload
    styleSheet.textContent = editorStyles
  }, [])

  return (
    <div style={{ marginBottom: 16 }}>
      <Text
        UNSAFE_style={{
          display: 'block',
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--spectrum-global-color-gray-800)',
        }}
      >
        {label}{isRequired && (
          <span style={{ color: 'var(--spectrum-global-color-red-600)' }}> *</span>
        )}
      </Text>
      
      <div
        className="rte-wrapper rte-field-shell"
        style={{
          minHeight: height,
        }}
      >
        <div className="rte-container" ref={editorRef} style={{ minHeight: height }} />
      </div>
      
      {description && (
        <Text
          UNSAFE_style={{
            display: 'block',
            marginTop: 4,
            fontSize: 12,
            color: 'var(--spectrum-global-color-gray-700)',
          }}
        >
          {description}
        </Text>
      )}
    </div>
  )
}

