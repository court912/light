/**
 * Format unix timestamp to readable date
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted time string (HH:MM)
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
};

/**
 * Format price with decimals
 * @param price - Price value
 * @returns Formatted price string with 2 decimal places
 */
export const formatPrice = (price: number): string => {
  return price.toFixed(2);
};
