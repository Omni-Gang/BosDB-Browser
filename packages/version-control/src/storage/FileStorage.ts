import * as fs from 'fs/promises';
import * as path from 'path';
import {
    VersionControlStorage,
    Commit,
    Branch,
    Tag,
    Stash,
    ReflogEntry,
    DatabaseSnapshot,
    VersionControlConfig,
    TagFilter,
    ReflogOptions,
} from '../core/types';

/**
 * File-based storage implementation for version control
 */
export class FileStorage implements VersionControlStorage {
    private baseDir: string;
    private commitsDir: string;
    private branchesDir: string;
    private tagsDir: string;
    private stashDir: string;
    private reflogDir: string;
    private snapshotsDir: string;
    private configFile: string;

    constructor(baseDir: string) {
        this.baseDir = baseDir;
        this.commitsDir = path.join(baseDir, 'commits');
        this.branchesDir = path.join(baseDir, 'branches');
        this.tagsDir = path.join(baseDir, 'tags');
        this.stashDir = path.join(baseDir, 'stash');
        this.reflogDir = path.join(baseDir, 'reflog');
        this.snapshotsDir = path.join(baseDir, 'snapshots');
        this.configFile = path.join(baseDir, 'config.json');
    }

    async initialize(): Promise<void> {
        await fs.mkdir(this.commitsDir, { recursive: true });
        await fs.mkdir(this.branchesDir, { recursive: true });
        await fs.mkdir(this.tagsDir, { recursive: true });
        await fs.mkdir(this.stashDir, { recursive: true });
        await fs.mkdir(this.reflogDir, { recursive: true });
        await fs.mkdir(this.snapshotsDir, { recursive: true });

        // Only create default config if it doesn't already exist
        try {
            await fs.access(this.configFile);
        } catch {
            const defaultConfig: VersionControlConfig = {
                HEAD: 'main',
                branches: {},
                tags: {},
                config: {},
            };
            await this.saveConfig(defaultConfig);
        }
    }

    // Commit operations
    async saveCommit(commit: Commit): Promise<void> {
        const filePath = path.join(this.commitsDir, `${commit.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(commit, null, 2));
    }

    async getCommit(id: string): Promise<Commit | null> {
        try {
            const filePath = path.join(this.commitsDir, `${id}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const commit = JSON.parse(content);
            // Convert timestamp strings back to Date objects
            commit.timestamp = new Date(commit.timestamp);
            commit.author.timestamp = new Date(commit.author.timestamp);
            return commit;
        } catch {
            return null;
        }
    }

    async getCommits(ids: string[]): Promise<Commit[]> {
        const commits: Commit[] = [];
        for (const id of ids) {
            const commit = await this.getCommit(id);
            if (commit) commits.push(commit);
        }
        return commits;
    }

    // Branch operations
    async saveBranch(branch: Branch): Promise<void> {
        const filePath = path.join(this.branchesDir, `${branch.name}.json`);
        await fs.writeFile(filePath, JSON.stringify(branch, null, 2));
    }

    async getBranch(name: string): Promise<Branch | null> {
        try {
            const filePath = path.join(this.branchesDir, `${name}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    async listBranches(): Promise<Branch[]> {
        try {
            const files = await fs.readdir(this.branchesDir);
            const branches: Branch[] = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const name = file.replace('.json', '');
                    const branch = await this.getBranch(name);
                    if (branch) branches.push(branch);
                }
            }
            return branches;
        } catch {
            return [];
        }
    }

    async deleteBranch(name: string): Promise<void> {
        const filePath = path.join(this.branchesDir, `${name}.json`);
        await fs.unlink(filePath);
    }

    // Tag operations
    async saveTag(tag: Tag): Promise<void> {
        const filePath = path.join(this.tagsDir, `${tag.name}.json`);
        await fs.writeFile(filePath, JSON.stringify(tag, null, 2));
    }

    async getTag(name: string): Promise<Tag | null> {
        try {
            const filePath = path.join(this.tagsDir, `${name}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const tag = JSON.parse(content);
            tag.createdAt = new Date(tag.createdAt);
            if (tag.tagger) tag.tagger.timestamp = new Date(tag.tagger.timestamp);
            return tag;
        } catch {
            return null;
        }
    }

    async listTags(filter?: TagFilter): Promise<Tag[]> {
        try {
            const files = await fs.readdir(this.tagsDir);
            const tags: Tag[] = [];
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
        } catch {
            return [];
        }
    }

    async deleteTag(name: string): Promise<void> {
        const filePath = path.join(this.tagsDir, `${name}.json`);
        await fs.unlink(filePath);
    }

    private matchesTagFilter(tag: Tag, filter?: TagFilter): boolean {
        if (!filter) return true;

        if (filter.pattern && !tag.name.includes(filter.pattern)) return false;
        if (filter.afterDate && tag.createdAt < filter.afterDate) return false;
        if (filter.beforeDate && tag.createdAt > filter.beforeDate) return false;
        if (filter.annotatedOnly && tag.type !== 'ANNOTATED') return false;

        return true;
    }

    // Stash operations
    async saveStash(stash: Stash): Promise<void> {
        const filePath = path.join(this.stashDir, `${stash.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(stash, null, 2));
    }

    async getStash(id: string): Promise<Stash | null> {
        try {
            const filePath = path.join(this.stashDir, `${id}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const stash = JSON.parse(content);
            stash.createdAt = new Date(stash.createdAt);
            stash.author.timestamp = new Date(stash.author.timestamp);
            return stash;
        } catch {
            return null;
        }
    }

    async listStashes(): Promise<Stash[]> {
        try {
            const files = await fs.readdir(this.stashDir);
            const stashes: Stash[] = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const id = file.replace('.json', '');
                    const stash = await this.getStash(id);
                    if (stash) stashes.push(stash);
                }
            }
            return stashes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        } catch {
            return [];
        }
    }

    async deleteStash(id: string): Promise<void> {
        const filePath = path.join(this.stashDir, `${id}.json`);
        await fs.unlink(filePath);
    }

    // Reflog operations
    async addReflogEntry(entry: ReflogEntry): Promise<void> {
        const filePath = path.join(this.reflogDir, `reflog.jsonl`);
        const line = JSON.stringify(entry) + '\n';
        await fs.appendFile(filePath, line);
    }

    async getReflog(options?: ReflogOptions): Promise<ReflogEntry[]> {
        try {
            const filePath = path.join(this.reflogDir, `reflog.jsonl`);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l);

            let entries: ReflogEntry[] = lines.map(line => {
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
                entries = entries.filter(e => e.timestamp >= options.since!);
            }
            if (options?.until) {
                entries = entries.filter(e => e.timestamp <= options.until!);
            }
            if (options?.maxCount) {
                entries = entries.slice(-options.maxCount);
            }

            return entries.reverse();
        } catch {
            return [];
        }
    }

    // Snapshot operations
    async saveSnapshot(commitId: string, snapshot: DatabaseSnapshot): Promise<void> {
        const filePath = path.join(this.snapshotsDir, `${commitId}.json`);
        await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
    }

    async getSnapshot(commitId: string): Promise<DatabaseSnapshot | null> {
        try {
            const filePath = path.join(this.snapshotsDir, `${commitId}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const snapshot = JSON.parse(content);
            snapshot.timestamp = new Date(snapshot.timestamp);
            return snapshot;
        } catch {
            return null;
        }
    }

    // Config operations
    async getConfig(): Promise<VersionControlConfig> {
        try {
            const content = await fs.readFile(this.configFile, 'utf-8');
            return JSON.parse(content);
        } catch {
            return {
                HEAD: 'main',
                branches: {},
                tags: {},
                config: {},
            };
        }
    }

    async saveConfig(config: VersionControlConfig): Promise<void> {
        await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
    }
}

export default FileStorage;
