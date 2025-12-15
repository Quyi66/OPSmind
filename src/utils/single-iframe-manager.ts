/**
 * Single Iframe Manager Stub
 * Stub implementation after removing Angular/iframe integration
 */

/**
 * Stub manager class
 */
class SingleIframeManagerStub {
    /**
     * Send auth data - stub
     */
    sendAuthData(): void {
        // Stub implementation - no longer needed
    }

    /**
     * Switch to module - stub
     */
    async switchToModule(_moduleCode: string, _container: HTMLElement): Promise<void> {
        // Stub implementation - no longer needed
        console.debug('switchToModule is no longer needed after Angular removal')
    }

    /**
     * Get current module code - stub
     */
    getCurrentModuleCode(): string | null {
        return null
    }

    /**
     * Destroy - stub
     */
    destroy(): void {
        // Stub implementation - no longer needed
    }
}

// Create singleton instance
export const singleIframeManager = new SingleIframeManagerStub()

// Default export for compatibility
export default singleIframeManager
