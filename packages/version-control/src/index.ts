/**
 * BosDB Version Control System
 * Advanced Git-like version control for databases
 * 
 * @module @bosdb/version-control
 */

// Export all types
export * from './core/types';

// Export core manager
export { VersionControlManager } from './core/VersionControlManager';

// Export specialized services
export { BlameService } from './core/BlameService';
export { BisectService } from './core/BisectService';
export { PatchService } from './core/PatchService';

// Export storage implementations
export { FileStorage } from './storage/FileStorage';

// Re-export default
export { default as VersionControl } from './core/VersionControlManager';

/**
 * Create a new version control instance
 */
import { VersionControlManager } from './core/VersionControlManager';
import type { VersionControlStorage } from './core/types';

export function createVersionControl(
    database: string,
    storage: VersionControlStorage
): VersionControlManager {
    return new VersionControlManager(database, storage);
}

/**
 * Version information
 */
export const VERSION = '1.0.0';
export const FEATURES = [
    'commits',
    'branches',
    'tags',
    'stash',
    'merge',
    'cherry-pick',
    'rebase',
    'diff',
    'blame',
    'bisect',
    'reflog',
    'patches',
] as const;

export type Feature = typeof FEATURES[number];
