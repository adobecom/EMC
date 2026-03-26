import React, { useEffect, useRef } from 'react'
import { View, Text } from '@adobe/react-spectrum'
import 'quill/dist/quill.snow.css'

interface RichTextEditorProps {
  label: string
  value: string
  onChange: (value: string) => void
  isRequired?: boolean
  height?: string
  description?: string
}

// Custom styles to move toolbar to bottom and make it float
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
    background: linear-gradient(to bottom, rgba(250, 250, 250, 0.98), rgba(245, 245, 245, 0.98)) !important;
    border-radius: 8px !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
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
  
  .rte-wrapper .ql-toolbar.ql-snow button:hover,
  .rte-wrapper .ql-toolbar.ql-snow .ql-picker-label:hover {
    background-color: rgba(0, 0, 0, 0.06) !important;
  }
  
  /* Make dropdowns expand upwards since toolbar is at bottom */
  .rte-wrapper .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
    top: auto !important;
    bottom: 100% !important;
    margin-bottom: 4px !important;
    border-radius: 6px !important;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
  }
  
  /* Also handle the align picker */
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
    color: var(--spectrum-global-color-gray-500) !important;
  }
`

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
          
          if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
              theme: 'snow',
              modules: {
                toolbar: [
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  [{ 'align': [] }],
                  ['link'],
                  ['clean']
                ]
              },
              placeholder: `Enter ${label.toLowerCase()}...`
            })
            
            // Set initial value
            if (valueRef.current) {
              isUpdatingRef.current = true
              quillRef.current.root.innerHTML = valueRef.current
              isUpdatingRef.current = false
            }
            
            // Listen for changes - only trigger onChange for user edits, not programmatic updates
            quillRef.current.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
              // Skip if this is a programmatic update or not a user edit
              if (isUpdatingRef.current || source !== 'user') {
                return
              }
              
              const html = quillRef.current.root.innerHTML
              const normalizedHtml = html === '<p><br></p>' ? '' : html
              
              // Only trigger onChange if content actually differs from current value
              if (normalizedHtml !== valueRef.current) {
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
  
  // Update editor content when value prop changes externally
  useEffect(() => {
    if (quillRef.current && quillRef.current.root.innerHTML !== value) {
      isUpdatingRef.current = true
      const currentSelection = quillRef.current.getSelection()
      quillRef.current.root.innerHTML = value || ''
      if (currentSelection) {
        quillRef.current.setSelection(currentSelection)
      }
      isUpdatingRef.current = false
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
    <View marginBottom="size-200">
      <Text UNSAFE_style={{ 
        display: 'block', 
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--spectrum-global-color-gray-800)'
      }}>
        {label}{isRequired && <span style={{ color: 'var(--spectrum-global-color-gray-700)' }}> *</span>}
      </Text>
      
      <div 
        className="rte-wrapper"
        style={{
          border: '2px solid rgb(218, 218, 218)',
          borderRadius: '8px',
          backgroundColor: 'white',
          minHeight: height,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div className="rte-container" ref={editorRef} style={{ minHeight: height }} />
      </div>
      
      {description && (
        <Text UNSAFE_style={{ 
          display: 'block',
          marginTop: '4px',
          fontSize: '12px',
          color: 'var(--spectrum-global-color-gray-700)'
        }}>
          {description}
        </Text>
      )}
    </View>
  )
}

