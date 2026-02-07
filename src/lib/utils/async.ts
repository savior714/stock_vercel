/**
 * Async Utilities
 * Common asynchronous helper functions
 */

/**
 * Wait for a specified amount of time
 * @param ms Duration in milliseconds
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
