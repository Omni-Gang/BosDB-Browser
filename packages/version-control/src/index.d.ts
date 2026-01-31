/**
 * BosDB Version Control System
 * Advanced Git-like version control for databases
 *
 * @module @bosdb/version-control
 */
export * from './core/types';
export { VersionControlManager } from './core/VersionControlManager';
export { BlameService } from './core/BlameService';
export { BisectService } from './core/BisectService';
export { PatchService } from './core/PatchService';
export { FileStorage } from './storage/FileStorage';
export { default as VersionControl } from './core/VersionControlManager';
/**
 * Create a new version control instance
 */
import { VersionControlManager } from './core/VersionControlManager';
import type { VersionControlStorage } from './core/types';
export declare function createVersionControl(database: string, storage: VersionControlStorage): VersionControlManager;
/**
 * Version information
 */
export declare const VERSION = "1.0.0";
export declare const FEATURES: readonly ["commits", "branches", "tags", "stash", "merge", "cherry-pick", "rebase", "diff", "blame", "bisect", "reflog", "patches"];
export type Feature = typeof FEATURES[number];
//# sourceMappingURL=index.d.ts.map