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
                  [{ 'header': [1, 2, 3, false] }],
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
            if (value) {
              quillRef.current.root.innerHTML = value
            }
            
            // Listen for changes
            quillRef.current.on('text-change', () => {
              const html = quillRef.current.root.innerHTML
              // Only trigger onChange if content actually changed
              if (html !== value) {
                onChange(html === '<p><br></p>' ? '' : html)
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
  }, [])
  
  // Update editor content when value prop changes externally
  useEffect(() => {
    if (quillRef.current && quillRef.current.root.innerHTML !== value) {
      const currentSelection = quillRef.current.getSelection()
      quillRef.current.root.innerHTML = value || ''
      if (currentSelection) {
        quillRef.current.setSelection(currentSelection)
      }
    }
  }, [value])

  return (
    <View marginBottom="size-200">
      <Text UNSAFE_style={{ 
        display: 'block', 
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--spectrum-global-color-gray-800)'
      }}>
        {label}{isRequired && <span style={{ color: 'var(--spectrum-global-color-red-600)' }}> *</span>}
      </Text>
      
      <View
        borderWidth="thin"
        borderColor="gray-400"
        borderRadius="medium"
        UNSAFE_style={{
          backgroundColor: 'white',
          minHeight: height
        }}
      >
        <div ref={editorRef} style={{ height }} />
      </View>
      
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

