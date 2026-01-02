"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorage = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * File-based storage implementation for version control
 */
class FileStorage {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.commitsDir = path.join(baseDir, 'commits');
        this.branchesDir = path.join(baseDir, 'branches');
        this.tagsDir = path.join(baseDir, 'tags');
        this.stashDir = path.join(baseDir, 'stash');
        this.reflogDir = path.join(baseDir, 'reflog');
        this.snapshotsDir = path.join(baseDir, 'snapshots');
        this.configFile = path.join(baseDir, 'config.json');
    }
    async initialize() {
        await fs.mkdir(this.commitsDir, { recursive: true });
        await fs.mkdir(this.branchesDir, { recursive: true });
        await fs.mkdir(this.tagsDir, { recursive: true });
        await fs.mkdir(this.stashDir, { recursive: true });
        await fs.mkdir(this.reflogDir, { recursive: true });
        await fs.mkdir(this.snapshotsDir, { recursive: true });
        // Only create default config if it doesn't already exist
        try {
            await fs.access(this.configFile);
        }
        catch {
            const defaultConfig = {
                HEAD: 'main',
                branches: {},
                tags: {},
                config: {},
            };
            await this.saveConfig(defaultConfig);
        }
    }
    // Commit operations
    async saveCommit(commit) {
        const filePath = path.join(this.commitsDir, `${commit.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(commit, null, 2));
    }
    async getCommit(id) {
        try {
            const filePath = path.join(this.commitsDir, `${id}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const commit = JSON.parse(content);
            // Convert timestamp strings back to Date objects
            commit.timestamp = new Date(commit.timestamp);
            commit.author.timestamp = new Date(commit.author.timestamp);
            return commit;
        }
        catch {
            return null;
        }
    }
    async getCommits(ids) {
        const commits = [];
        for (const id of ids) {
            const commit = await this.getCommit(id);
            if (commit)
                commits.push(commit);
        }
        return commits;
    }
    // Branch operations
    async saveBranch(branch) {
        const filePath = path.join(this.branchesDir, `${branch.name}.json`);
        await fs.writeFile(filePath, JSON.stringify(branch, null, 2));
    }
    async getBranch(name) {
        try {
            const filePath = path.join(this.branchesDir, `${name}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    async listBranches() {
        try {
            const files = await fs.readdir(this.branchesDir);
            const branches = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const name = file.replace('.json', '');
                    const branch = await this.getBranch(name);
                    if (branch)
                        branches.push(branch);
                }
            }
            return branches;
        }
        catch {
            return [];
        }
    }
    async deleteBranch(name) {
        const filePath = path.join(this.branchesDir, `${name}.json`);
        await fs.unlink(filePath);
    }
    // Tag operations
    async saveTag(tag) {
        const filePath = path.join(this.tagsDir, `${tag.name}.json`);
        await fs.writeFile(filePath, JSON.stringify(tag, null, 2));
    }
    async getTag(name) {
        try {
            const filePath = path.join(this.tagsDir, `${name}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const tag = JSON.parse(content);
            tag.createdAt = new Date(tag.createdAt);
            if (tag.tagger)
                tag.tagger.timestamp = new Date(tag.tagger.timestamp);
            return tag;
        }
        catch {
            return null;
        }
    }
    async listTags(filter) {
        try {
            const files = await fs.readdir(this.tagsDir);
            const tags = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const name = file.replace('.json', '');
                    const tag = await this.getTag(name);
                    if (tag && this.matchesTagFilter(tag, filter)) {
                        tags.push(tag);
                    }
                }
            }
            return tags.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        catch {
            return [];
        }
    }
    async deleteTag(name) {
        const filePath = path.join(this.tagsDir, `${name}.json`);
        await fs.unlink(filePath);
    }
    matchesTagFilter(tag, filter) {
        if (!filter)
            return true;
        if (filter.pattern && !tag.name.includes(filter.pattern))
            return false;
        if (filter.afterDate && tag.createdAt < filter.afterDate)
            return false;
        if (filter.beforeDate && tag.createdAt > filter.beforeDate)
            return false;
        if (filter.annotatedOnly && tag.type !== 'ANNOTATED')
            return false;
        return true;
    }
    // Stash operations
    async saveStash(stash) {
        const filePath = path.join(this.stashDir, `${stash.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(stash, null, 2));
    }
    async getStash(id) {
        try {
            const filePath = path.join(this.stashDir, `${id}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const stash = JSON.parse(content);
            stash.createdAt = new Date(stash.createdAt);
            stash.author.timestamp = new Date(stash.author.timestamp);
            return stash;
        }
        catch {
            return null;
        }
    }
    async listStashes() {
        try {
            const files = await fs.readdir(this.stashDir);
            const stashes = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const id = file.replace('.json', '');
                    const stash = await this.getStash(id);
                    if (stash)
                        stashes.push(stash);
                }
            }
            return stashes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        catch {
            return [];
        }
    }
    async deleteStash(id) {
        const filePath = path.join(this.stashDir, `${id}.json`);
        await fs.unlink(filePath);
    }
    // Reflog operations
    async addReflogEntry(entry) {
        const filePath = path.join(this.reflogDir, `reflog.jsonl`);
        const line = JSON.stringify(entry) + '\n';
        await fs.appendFile(filePath, line);
    }
    async getReflog(options) {
        try {
            const filePath = path.join(this.reflogDir, `reflog.jsonl`);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l);
            let entries = lines.map(line => {
                const entry = JSON.parse(line);
                entry.timestamp = new Date(entry.timestamp);
                entry.author.timestamp = new Date(entry.author.timestamp);
                return entry;
            });
            // Apply filters
            if (options?.refName) {
                entries = entries.filter(e => e.ref === options.refName);
            }
            if (options?.since) {
                entries = entries.filter(e => e.timestamp >= options.since);
            }
            if (options?.until) {
                entries = entries.filter(e => e.timestamp <= options.until);
            }
            if (options?.maxCount) {
                entries = entries.slice(-options.maxCount);
            }
            return entries.reverse();
        }
        catch {
            return [];
        }
    }
    // Snapshot operations
    async saveSnapshot(commitId, snapshot) {
        const filePath = path.join(this.snapshotsDir, `${commitId}.json`);
        await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
    }
    async getSnapshot(commitId) {
        try {
            const filePath = path.join(this.snapshotsDir, `${commitId}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const snapshot = JSON.parse(content);
            snapshot.timestamp = new Date(snapshot.timestamp);
            return snapshot;
        }
        catch {
            return null;
        }
    }
    // Config operations
    async getConfig() {
        try {
            const content = await fs.readFile(this.configFile, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return {
                HEAD: 'main',
                branches: {},
                tags: {},
                config: {},
            };
        }
    }
    async saveConfig(config) {
        await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
    }
}
exports.FileStorage = FileStorage;
exports.default = FileStorage;
//# sourceMappingURL=FileStorage.js.map