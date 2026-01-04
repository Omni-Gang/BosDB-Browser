/**
 * Singleton Debug Engine Instance
 * Ensures single instance across the application
 */

import { DebugEngine } from '@bosdb/debugger-core';

let debugEngineInstance: DebugEngine | null = null;

export function getDebugEngine(): DebugEngine {
    if (!debugEngineInstance) {
        debugEngineInstance = new DebugEngine();
        console.log('[Debug Engine] Initialized');
    }

    return debugEngineInstance;
}
