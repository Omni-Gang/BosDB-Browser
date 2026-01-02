import {
    Commit,
    Branch,
    Tag,
    Stash,
    MergeResult,
    CherryPickResult,
    RebaseResult,
    Diff,
    BlameInfo,
    BisectSession,
    ReflogEntry,
    Patch,
    PatchApplyResult,
    CommitGraph,
    VersionControlStorage,
    DatabaseSnapshot,
    Change,
    MergeOptions,
    CherryPickOptions,
    RebaseOptions,
    LogOptions,
    DiffOptions,
    BlameOptions,
    BisectOptions,
    PatchOptions,
    ReflogOptions,
    StashOptions,
    TagFilter,
    VersionControlConfig,
    Author,
    Result,
} from './types';

/**
 * Main Version Control Manager
 * Implements all Git-like operations for database version control
 */
export class VersionControlManager {
    private storage: VersionControlStorage;
    private database: string;
    private currentBranch: string = 'main';

    constructor(database: string, storage: VersionControlStorage) {
        this.database = database;
        this.storage = storage;
    }

    // ============ Initialization ============

    async initialize(): Promise<Result<void>> {
        try {
            // Check if already initialized by trying to get branches
            const existingBranches = await this.storage.listBranches();
            if (existingBranches.length > 0) {
                await this.loadHEAD();
                return { success: true, data: undefined };
            }

            // Initialize repository
            const config: VersionControlConfig = {
                HEAD: 'main',
                branches: {
                    main: {
                        name: 'main',
                        commitId: '',
                        protected: true,
                    },
                },
                tags: {},
                config: {
                    core: {
                        autoGc: true,
                        logAllRefUpdates: true,
                    },
                },
            };

            await this.storage.saveConfig(config);

            // Explicitly save the main branch object to the branches directory
            await this.storage.saveBranch({
                name: 'main',
                commitId: '',
                protected: true,
            });

            this.currentBranch = 'main'; // Sync instance state
            return { success: true, data: undefined };
        } catch (error) {
            return {
                success: false,
                error: `Failed to initialize repository: ${error}`,
            };
        }
    }

    /**
     * Load the current branch from storage config
     * Call this after getting an existing repo to sync instance state
     */
    async loadHEAD(): Promise<void> {
        try {
            const config = await this.storage.getConfig();
            this.currentBranch = config.HEAD || 'main';
        } catch {
            this.currentBranch = 'main';
        }
    }

    // ============ Core Commit Operations ============

    async commit(
        message: string,
        author: Author,
        changes: Change[],
        snapshot: DatabaseSnapshot
    ): Promise<Result<Commit>> {
        try {
            const config = await this.storage.getConfig();
            const branch = await this.storage.getBranch(this.currentBranch);

            if (!branch) {
                return { success: false, error: 'Current branch not found' };
            }

            const parentIds = branch.commitId ? [branch.commitId] : [];
            const commitId = this.generateCommitId();

            const commit: Commit = {
                id: commitId,
                message,
                author,
                timestamp: new Date(),
                parentIds,
                treeId: commitId, // Simplified: use commitId as treeId
                changes,
                branchName: this.currentBranch, // NEW: Record current branch
            };

            // Save commit and snapshot
            await this.storage.saveCommit(commit);
            await this.storage.saveSnapshot(commitId, snapshot);

            // Update branch
            branch.commitId = commitId;
            await this.storage.saveBranch(branch);

            // Add reflog entry
            await this.addReflogEntry('COMMIT', branch.name, parentIds[0] || '', commitId, `commit: ${message}`);

            return { success: true, data: commit };
        } catch (error) {
            return { success: false, error: `Commit failed: ${error}` };
        }
    }

    // ============ Branch Operations ============

    async createBranch(name: string, fromCommit?: string): Promise<Result<Branch>> {
        try {
            const branches = await this.storage.listBranches();
            if (branches.find((b) => b.name === name)) {
                return { success: false, error: `Branch ${name} already exists` };
            }

            const currentBranch = await this.storage.getBranch(this.currentBranch);
            const commitId = fromCommit || currentBranch?.commitId || '';

            const branch: Branch = {
                name,
                commitId,
                protected: false,
            };

            await this.storage.saveBranch(branch);
            return { success: true, data: branch };
        } catch (error) {
            return { success: false, error: `Failed to create branch: ${error}` };
        }
    }

    async checkout(branchName: string): Promise<Result<DatabaseSnapshot | null>> {
        try {
            const branch = await this.storage.getBranch(branchName);
            if (!branch) {
                return { success: false, error: `Branch ${branchName} not found` };
            }

            const oldBranch = this.currentBranch;
            const oldCommit = (await this.storage.getBranch(oldBranch))?.commitId || '';

            this.currentBranch = branchName;
            const config = await this.storage.getConfig();
            config.HEAD = branchName;
            await this.storage.saveConfig(config);

            await this.addReflogEntry('CHECKOUT', branchName, oldCommit, branch.commitId, `checkout: moving from ${oldBranch} to ${branchName}`);

            // Handle branches with no commits yet (empty commitId)
            if (!branch.commitId) {
                return { success: true, data: null }; // No snapshot, but checkout succeeded
            }

            const snapshot = await this.storage.getSnapshot(branch.commitId);
            // Snapshot might not exist for new branches - that's OK
            return { success: true, data: snapshot || null };
        } catch (error) {
            return { success: false, error: `Checkout failed: ${error}` };
        }
    }

    async deleteBranch(name: string, force: boolean = false): Promise<Result<void>> {
        try {
            if (name === this.currentBranch) {
                return { success: false, error: 'Cannot delete current branch' };
            }

            const branch = await this.storage.getBranch(name);
            if (!branch) {
                return { success: false, error: `Branch ${name} not found` };
            }

            if (branch.protected && !force) {
                return { success: false, error: `Branch ${name} is protected` };
            }

            await this.storage.deleteBranch(name);
            return { success: true, data: undefined };
        } catch (error) {
            return { success: false, error: `Failed to delete branch: ${error}` };
        }
    }

    async listBranches(): Promise<Result<Branch[]>> {
        try {
            const branches = await this.storage.listBranches();
            return { success: true, data: branches };
        } catch (error) {
            return { success: false, error: `Failed to list branches: ${error}` };
        }
    }

    // ============ Tag Operations ============

    async createTag(name: string, commitId: string, message?: string, tagger?: Author): Promise<Result<Tag>> {
        try {
            const existingTag = await this.storage.getTag(name);
            if (existingTag) {
                return { success: false, error: `Tag ${name} already exists` };
            }

            const tag: Tag = {
                name,
                commitId,
                type: message ? 'ANNOTATED' : 'LIGHTWEIGHT',
                message,
                tagger,
                createdAt: new Date(),
            };

            await this.storage.saveTag(tag);
            return { success: true, data: tag };
        } catch (error) {
            return { success: false, error: `Failed to create tag: ${error}` };
        }
    }

    async deleteTag(name: string): Promise<Result<void>> {
        try {
            await this.storage.deleteTag(name);
            return { success: true, data: undefined };
        } catch (error) {
            return { success: false, error: `Failed to delete tag: ${error}` };
        }
    }

    async listTags(filter?: TagFilter): Promise<Result<Tag[]>> {
        try {
            const tags = await this.storage.listTags(filter);
            return { success: true, data: tags };
        } catch (error) {
            return { success: false, error: `Failed to list tags: ${error}` };
        }
    }

    async checkoutTag(tagName: string): Promise<Result<DatabaseSnapshot>> {
        try {
            const tag = await this.storage.getTag(tagName);
            if (!tag) {
                return { success: false, error: `Tag ${tagName} not found` };
            }

            const snapshot = await this.storage.getSnapshot(tag.commitId);
            if (!snapshot) {
                return { success: false, error: 'Snapshot not found' };
            }

            await this.addReflogEntry('CHECKOUT', 'HEAD', '', tag.commitId, `checkout: checking out tag ${tagName}`);

            return { success: true, data: snapshot };
        } catch (error) {
            return { success: false, error: `Failed to checkout tag: ${error}` };
        }
    }

    // ============ Stash Operations ============

    async stash(message: string, author: Author, changes: Change[], options?: StashOptions): Promise<Result<Stash>> {
        try {
            const branch = await this.storage.getBranch(this.currentBranch);
            if (!branch) {
                return { success: false, error: 'Current branch not found' };
            }

            const stash: Stash = {
                id: this.generateStashId(),
                message: message || `WIP on ${this.currentBranch}`,
                branchName: this.currentBranch,
                parentCommitId: branch.commitId,
                changes,
                author,
                createdAt: new Date(),
            };

            await this.storage.saveStash(stash);
            return { success: true, data: stash };
        } catch (error) {
            return { success: false, error: `Stash failed: ${error}` };
        }
    }

    async stashPop(): Promise<Result<Change[]>> {
        try {
            const stashes = await this.storage.listStashes();
            if (stashes.length === 0) {
                return { success: false, error: 'No stashes found' };
            }

            const latestStash = stashes[stashes.length - 1];
            await this.storage.deleteStash(latestStash.id);

            return { success: true, data: latestStash.changes };
        } catch (error) {
            return { success: false, error: `Stash pop failed: ${error}` };
        }
    }

    async stashApply(stashId?: string): Promise<Result<Change[]>> {
        try {
            let stash: Stash | null;

            if (stashId) {
                stash = await this.storage.getStash(stashId);
            } else {
                const stashes = await this.storage.listStashes();
                stash = stashes[stashes.length - 1] || null;
            }

            if (!stash) {
                return { success: false, error: 'Stash not found' };
            }

            return { success: true, data: stash.changes };
        } catch (error) {
            return { success: false, error: `Stash apply failed: ${error}` };
        }
    }

    async listStashes(): Promise<Result<Stash[]>> {
        try {
            const stashes = await this.storage.listStashes();
            return { success: true, data: stashes };
        } catch (error) {
            return { success: false, error: `Failed to list stashes: ${error}` };
        }
    }

    // ============ Merge Operations ============

    async merge(sourceBranch: string, options?: MergeOptions): Promise<Result<MergeResult>> {
        try {
            const source = await this.storage.getBranch(sourceBranch);
            const target = await this.storage.getBranch(this.currentBranch);

            if (!source || !target) {
                return { success: false, error: 'Branch not found' };
            }

            // Get commits
            const sourceCommit = await this.storage.getCommit(source.commitId);
            const targetCommit = target.commitId ? await this.storage.getCommit(target.commitId) : null;

            if (!sourceCommit) {
                return { success: false, error: 'Source commit not found' };
            }

            // Check for fast-forward
            if (options?.noFastForward !== true) {
                const canFastForward = await this.canFastForward(target.commitId, source.commitId);
                if (canFastForward) {
                    target.commitId = source.commitId;
                    await this.storage.saveBranch(target);

                    return {
                        success: true,
                        data: {
                            success: true,
                            commitId: source.commitId,
                            conflicts: [],
                            strategy: 'FAST_FORWARD',
                            message: 'Fast-forward merge',
                        },
                    };
                }
            }

            // Perform 3-way merge
            const mergeResult = await this.performMerge(targetCommit, sourceCommit, options);

            await this.addReflogEntry('MERGE', this.currentBranch, target.commitId, mergeResult.commitId || '', `merge ${sourceBranch}: ${mergeResult.message}`);

            return { success: true, data: mergeResult };
        } catch (error) {
            return { success: false, error: `Merge failed: ${error}` };
        }
    }

    private async performMerge(
        targetCommit: Commit | null,
        sourceCommit: Commit,
        options?: MergeOptions
    ): Promise<MergeResult> {
        // Simplified merge implementation
        // In production, would implement proper 3-way merge algorithm

        const conflicts = await this.detectConflicts(targetCommit, sourceCommit);

        if (conflicts.length > 0 && !options?.allowConflicts) {
            return {
                success: false,
                conflicts,
                strategy: options?.strategy || 'RECURSIVE',
                message: 'Merge conflicts detected',
            };
        }

        // Create merge commit
        const mergeCommit: Commit = {
            id: this.generateCommitId(),
            message: options?.message || `Merge branch '${sourceCommit.id}'`,
            author: sourceCommit.author,
            timestamp: new Date(),
            parentIds: [targetCommit?.id || '', sourceCommit.id],
            treeId: sourceCommit.treeId,
            changes: sourceCommit.changes,
        };

        await this.storage.saveCommit(mergeCommit);

        return {
            success: true,
            commitId: mergeCommit.id,
            conflicts: [],
            strategy: options?.strategy || 'RECURSIVE',
            message: 'Merge successful',
        };
    }

    private async detectConflicts(commit1: Commit | null, commit2: Commit): Promise<any[]> {
        // Simplified conflict detection
        return [];
    }

    private async canFastForward(baseCommitId: string, targetCommitId: string): Promise<boolean> {
        if (!baseCommitId) return true;
        // Simplified: in production, would check if target is descendant of base
        return false;
    }

    // ============ Cherry-Pick Operation ============

    async cherryPick(commitId: string, options?: CherryPickOptions): Promise<Result<CherryPickResult>> {
        try {
            const commit = await this.storage.getCommit(commitId);
            if (!commit) {
                return { success: false, error: 'Commit not found' };
            }

            const currentBranch = await this.storage.getBranch(this.currentBranch);
            if (!currentBranch) {
                return { success: false, error: 'Current branch not found' };
            }

            // Create new commit with same changes
            const newCommit: Commit = {
                id: this.generateCommitId(),
                message: commit.message,
                author: commit.author,
                timestamp: new Date(),
                parentIds: [currentBranch.commitId],
                treeId: commit.treeId,
                changes: commit.changes,
            };

            await this.storage.saveCommit(newCommit);

            if (!options?.noCommit) {
                currentBranch.commitId = newCommit.id;
                await this.storage.saveBranch(currentBranch);
            }

            await this.addReflogEntry('CHERRY_PICK', this.currentBranch, currentBranch.commitId, newCommit.id, `cherry-pick: ${commit.message}`);

            return {
                success: true,
                data: {
                    success: true,
                    newCommitId: newCommit.id,
                    conflicts: [],
                    skipped: false,
                },
            };
        } catch (error) {
            return { success: false, error: `Cherry-pick failed: ${error}` };
        }
    }

    // ============ Rebase Operation ============

    async rebase(upstreamBranch: string, options?: RebaseOptions): Promise<Result<RebaseResult>> {
        try {
            const upstream = await this.storage.getBranch(upstreamBranch);
            const current = await this.storage.getBranch(this.currentBranch);

            if (!upstream || !current) {
                return { success: false, error: 'Branch not found' };
            }

            const commits = await this.getCommitsBetween(upstream.commitId, current.commitId);
            const rebasedCommits: string[] = [];

            for (const commit of commits) {
                const result = await this.cherryPick(commit.id, { noCommit: false });
                if (!result.success || !result.data.newCommitId) {
                    return {
                        success: false,
                        error: 'Rebase failed during cherry-pick',
                    };
                }
                rebasedCommits.push(result.data.newCommitId);
            }

            await this.addReflogEntry('REBASE', this.currentBranch, current.commitId, rebasedCommits[rebasedCommits.length - 1] || '', `rebase: onto ${upstreamBranch}`);

            return {
                success: true,
                data: {
                    success: true,
                    newHeadCommitId: rebasedCommits[rebasedCommits.length - 1],
                    rebasedCommits,
                    conflicts: [],
                    aborted: false,
                },
            };
        } catch (error) {
            return { success: false, error: `Rebase failed: ${error}` };
        }
    }

    private async getCommitsBetween(baseCommitId: string, headCommitId: string): Promise<Commit[]> {
        // Simplified: in production would traverse commit graph
        const commits: Commit[] = [];
        let currentId = headCommitId;

        while (currentId && currentId !== baseCommitId) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit) break;
            commits.unshift(commit);
            currentId = commit.parentIds[0] || '';
        }

        return commits;
    }

    // ============ Diff Operation ============

    async diff(fromCommit: string, toCommit: string, options?: DiffOptions): Promise<Result<Diff>> {
        try {
            const from = await this.storage.getCommit(fromCommit);
            const to = await this.storage.getCommit(toCommit);

            if (!from || !to) {
                return { success: false, error: 'Commit not found' };
            }

            const fromSnapshot = await this.storage.getSnapshot(from.treeId);
            const toSnapshot = await this.storage.getSnapshot(to.treeId);

            if (!fromSnapshot || !toSnapshot) {
                return { success: false, error: 'Snapshot not found' };
            }

            const diff = this.computeDiff(fromSnapshot, toSnapshot);

            return { success: true, data: diff };
        } catch (error) {
            return { success: false, error: `Diff failed: ${error}` };
        }
    }

    private computeDiff(from: DatabaseSnapshot, to: DatabaseSnapshot): Diff {
        const schemaChanges: any[] = [];
        const dataChanges: any[] = [];

        // Simplified diff computation
        // In production would compare schemas and data in detail

        return {
            fromCommitId: '',
            toCommitId: '',
            schemaChanges,
            dataChanges,
            viewChanges: [],
            indexChanges: [],
            summary: {
                filesChanged: 0,
                insertions: 0,
                deletions: 0,
                modifications: 0,
            },
        };
    }

    // ============ Reflog Operations ============

    async getReflog(options?: ReflogOptions): Promise<Result<ReflogEntry[]>> {
        try {
            const entries = await this.storage.getReflog(options);
            return { success: true, data: entries };
        } catch (error) {
            return { success: false, error: `Failed to get reflog: ${error}` };
        }
    }

    private async addReflogEntry(
        action: any,
        ref: string,
        oldCommitId: string,
        newCommitId: string,
        message: string
    ): Promise<void> {
        const config = await this.storage.getConfig();
        if (config.config.core?.logAllRefUpdates !== false) {
            const userAuthor: Author = config.config.user
                ? { ...config.config.user, timestamp: new Date() }
                : { name: 'System', email: '', timestamp: new Date() };

            const entry: ReflogEntry = {
                id: Date.now(),
                ref,
                oldCommitId,
                newCommitId,
                action,
                message,
                author: userAuthor,
                timestamp: new Date(),
            };
            await this.storage.addReflogEntry(entry);
        }
    }

    // ============ Helper Methods ============

    private generateCommitId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateStashId(): string {
        return `stash@{${Date.now()}}`;
    }

    async getCurrentBranch(): Promise<string> {
        // Always read from storage to be accurate across requests
        try {
            const config = await this.storage.getConfig();
            this.currentBranch = config.HEAD || 'main';
        } catch {
            // Keep current value if storage fails
        }
        return this.currentBranch;
    }

    async getHEAD(): Promise<Result<string>> {
        try {
            const config = await this.storage.getConfig();
            return { success: true, data: config.HEAD };
        } catch (error) {
            return { success: false, error: `Failed to get HEAD: ${error}` };
        }
    }

    async log(options?: LogOptions): Promise<Result<Commit[]>> {
        try {
            const branch = await this.storage.getBranch(this.currentBranch);
            if (!branch || !branch.commitId) {
                return { success: true, data: [] };
            }

            const commits = await this.getCommitHistory(branch.commitId, options);
            return { success: true, data: commits };
        } catch (error) {
            return { success: false, error: `Log failed: ${error}` };
        }
    }

    private async getCommitHistory(commitId: string, options?: LogOptions): Promise<Commit[]> {
        const commits: Commit[] = [];
        let currentId = commitId;
        let count = 0;
        const maxCount = options?.maxCount || 100;

        while (currentId && count < maxCount) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit) break;

            // Apply filters
            if (options?.author && commit.author.name !== options.author) {
                currentId = commit.parentIds[0] || '';
                continue;
            }

            if (options?.since && commit.timestamp < options.since) break;
            if (options?.until && commit.timestamp > options.until) {
                currentId = commit.parentIds[0] || '';
                continue;
            }

            commits.push(commit);
            count++;
            currentId = commit.parentIds[0] || '';
        }

        return commits;
    }
}

export default VersionControlManager;
