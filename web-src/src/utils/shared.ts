/**
 * Format datetime string to readable format
 * @param dateTimeString - ISO datetime string
 * @returns Formatted time string (e.g., "8:00 AM")
 */
export const formatTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  /**
   * Format date string to readable format
   * @param dateTimeString - ISO datetime string
   * @returns Formatted date string (e.g., "Dec 18, 2024")
   */
export const formatDate = (dateTimeString: string): string => {
    const date = new Date(dateTimeString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }