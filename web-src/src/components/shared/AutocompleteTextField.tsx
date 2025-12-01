/* 
* <license header>
*/

import React, { useState, useRef, useEffect } from 'react'
import './AutocompleteTextField.css'

interface AutocompleteOption {
  id: string
  label: string
  imageUrl?: string
  initials?: string
}

interface AutocompleteTextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onSelect: (option: AutocompleteOption) => void
  options: AutocompleteOption[]
  placeholder?: string
  isDisabled?: boolean
}

export const AutocompleteTextField: React.FC<AutocompleteTextFieldProps> = ({
  label,
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  isDisabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter options based on input value
  const filteredOptions = value.length > 0
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10)
    : []

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsOpen(newValue.length > 0 && filteredOptions.length > 0)
    setHighlightedIndex(-1)
  }

  // Handle option selection
  const handleSelectOption = (option: AutocompleteOption) => {
    onSelect(option)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && filteredOptions.length > 0) {
        setIsOpen(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // Update isOpen when filtered options change
  useEffect(() => {
    if (value.length > 0 && filteredOptions.length > 0 && document.activeElement === inputRef.current) {
      setIsOpen(true)
    } else if (filteredOptions.length === 0) {
      setIsOpen(false)
    }
  }, [filteredOptions.length, value])

  return (
    <div className="autocomplete-container" ref={containerRef}>
      <label className="autocomplete-label">{label}</label>
      <input
        ref={inputRef}
        type="text"
        className="autocomplete-input"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.length > 0 && filteredOptions.length > 0) {
            setIsOpen(true)
          }
        }}
        placeholder={placeholder}
        disabled={isDisabled}
        autoComplete="off"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="autocomplete-menu" role="listbox">
          {filteredOptions.map((option, index) => (
            <li
              key={option.id}
              className={`autocomplete-option ${index === highlightedIndex ? 'highlighted' : ''}`}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => handleSelectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.imageUrl ? (
                <img 
                  src={option.imageUrl} 
                  alt="" 
                  className="autocomplete-avatar"
                />
              ) : option.initials ? (
                <span className="autocomplete-avatar-placeholder">
                  {option.initials}
                </span>
              ) : null}
              <span className="autocomplete-option-label">{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

