"use strict";
/**
 * BosDB Version Control System
 * Advanced Git-like version control for databases
 *
 * @module @bosdb/version-control
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURES = exports.VERSION = exports.VersionControl = exports.FileStorage = exports.PatchService = exports.BisectService = exports.BlameService = exports.VersionControlManager = void 0;
exports.createVersionControl = createVersionControl;
// Export all types
__exportStar(require("./core/types"), exports);
// Export core manager
var VersionControlManager_1 = require("./core/VersionControlManager");
Object.defineProperty(exports, "VersionControlManager", { enumerable: true, get: function () { return VersionControlManager_1.VersionControlManager; } });
// Export specialized services
var BlameService_1 = require("./core/BlameService");
Object.defineProperty(exports, "BlameService", { enumerable: true, get: function () { return BlameService_1.BlameService; } });
var BisectService_1 = require("./core/BisectService");
Object.defineProperty(exports, "BisectService", { enumerable: true, get: function () { return BisectService_1.BisectService; } });
var PatchService_1 = require("./core/PatchService");
Object.defineProperty(exports, "PatchService", { enumerable: true, get: function () { return PatchService_1.PatchService; } });
// Export storage implementations
var FileStorage_1 = require("./storage/FileStorage");
Object.defineProperty(exports, "FileStorage", { enumerable: true, get: function () { return FileStorage_1.FileStorage; } });
// Re-export default
var VersionControlManager_2 = require("./core/VersionControlManager");
Object.defineProperty(exports, "VersionControl", { enumerable: true, get: function () { return __importDefault(VersionControlManager_2).default; } });
/**
 * Create a new version control instance
 */
const VersionControlManager_3 = require("./core/VersionControlManager");
function createVersionControl(database, storage) {
    return new VersionControlManager_3.VersionControlManager(database, storage);
}
/**
 * Version information
 */
exports.VERSION = '1.0.0';
exports.FEATURES = [
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
];
//# sourceMappingURL=index.js.map