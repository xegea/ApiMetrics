/**
 * Format a timestamp to a human-readable string
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted date string (e.g., "Jan 1, 2024, 12:00 PM")
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format a number as a percentage
 * @param value - Number between 0 and 1 (or 0-100)
 * @param asDecimal - If true, treats value as decimal (0-1), otherwise as percentage (0-100)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "95.50%")
 */
export function formatPercentage(
  value: number,
  asDecimal: boolean = true,
  decimals: number = 2
): string {
  const percentage = asDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a duration string to milliseconds
 * @param duration - Duration string (e.g., "30s", "5m", "1h")
 * @returns Duration in milliseconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
  };

  return value * multipliers[unit]!;
}

