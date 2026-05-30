/**
 * Utility helper functions
 * Pure functions with no Vue reactivity dependencies
 */

/**
 * Returns initials from a full name string.
 * e.g. "John Doe" → "JD", undefined → "?"
 */
export const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Formats an ISO date string into a localized date string.
 * e.g. "2024-01-15T10:30:00Z" → "15 Jan 2024"
 */
export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Truncates a string to a max length and appends "..." if truncated.
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
};
