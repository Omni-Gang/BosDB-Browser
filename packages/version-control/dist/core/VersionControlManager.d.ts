import { Commit, Branch, Tag, Stash, MergeResult, CherryPickResult, RebaseResult, Diff, ReflogEntry, VersionControlStorage, DatabaseSnapshot, Change, MergeOptions, CherryPickOptions, RebaseOptions, LogOptions, DiffOptions, ReflogOptions, StashOptions, TagFilter, Author, Result } from './types';
/**
 * Main Version Control Manager
 * Implements all Git-like operations for database version control
 */
export declare class VersionControlManager {
    private storage;
    private database;
    private currentBranch;
    constructor(database: string, storage: VersionControlStorage);
    initialize(): Promise<Result<void>>;
    /**
     * Load the current branch from storage config
     * Call this after getting an existing repo to sync instance state
     */
    loadHEAD(): Promise<void>;
    commit(message: string, author: Author, changes: Change[], snapshot: DatabaseSnapshot): Promise<Result<Commit>>;
    createBranch(name: string, fromCommit?: string): Promise<Result<Branch>>;
    checkout(branchName: string): Promise<Result<DatabaseSnapshot | null>>;
    deleteBranch(name: string, force?: boolean): Promise<Result<void>>;
    listBranches(): Promise<Result<Branch[]>>;
    createTag(name: string, commitId: string, message?: string, tagger?: Author): Promise<Result<Tag>>;
    deleteTag(name: string): Promise<Result<void>>;
    listTags(filter?: TagFilter): Promise<Result<Tag[]>>;
    checkoutTag(tagName: string): Promise<Result<DatabaseSnapshot>>;
    stash(message: string, author: Author, changes: Change[], _options?: StashOptions): Promise<Result<Stash>>;
    stashPop(): Promise<Result<Change[]>>;
    stashApply(stashId?: string): Promise<Result<Change[]>>;
    listStashes(): Promise<Result<Stash[]>>;
    merge(sourceBranch: string, options?: MergeOptions): Promise<Result<MergeResult>>;
    private performMerge;
    private detectConflicts;
    private canFastForward;
    cherryPick(commitId: string, options?: CherryPickOptions): Promise<Result<CherryPickResult>>;
    rebase(upstreamBranch: string, _options?: RebaseOptions): Promise<Result<RebaseResult>>;
    private getCommitsBetween;
    diff(fromCommit: string, toCommit: string, _options?: DiffOptions): Promise<Result<Diff>>;
    private computeDiff;
    getReflog(options?: ReflogOptions): Promise<Result<ReflogEntry[]>>;
    private addReflogEntry;
    private generateCommitId;
    private generateStashId;
    getCurrentBranch(): Promise<string>;
    getHEAD(): Promise<Result<string>>;
    log(options?: LogOptions): Promise<Result<Commit[]>>;
    private getCommitHistory;
}
export default VersionControlManager;
//# sourceMappingURL=VersionControlManager.d.ts.map