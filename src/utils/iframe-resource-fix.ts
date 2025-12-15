/**
 * Iframe Resource Fix Stub
 * Stub implementation after removing iframe integration
 */

/**
 * Safe set iframe src - stub
 */
export function safeSetIframeSrc(_iframe: HTMLIFrameElement, _src: string): void {
    // Stub implementation - no longer needed
}

/**
 * Iframe operation queue - stub
 */
export const iframeOperationQueue = {
    add: async (operation: () => Promise<void>) => {
        // Execute immediately since there's no queue needed
        await operation()
    }
}

/**
 * Cleanup iframe resources - stub
 */
export function cleanupIframeResources(_iframe: HTMLIFrameElement): void {
    // Stub implementation - no longer needed
}

/**
 * Apply iframe resource fix - stub
 */
export function applyIframeResourceFix(): void {
    // Stub implementation - no longer needed
    console.debug('applyIframeResourceFix is no longer needed after Angular removal')
}
