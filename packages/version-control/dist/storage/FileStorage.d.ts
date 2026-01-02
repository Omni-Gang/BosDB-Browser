import { VersionControlStorage, Commit, Branch, Tag, Stash, ReflogEntry, DatabaseSnapshot, VersionControlConfig, TagFilter, ReflogOptions } from '../core/types';
/**
 * File-based storage implementation for version control
 */
export declare class FileStorage implements VersionControlStorage {
    private baseDir;
    private commitsDir;
    private branchesDir;
    private tagsDir;
    private stashDir;
    private reflogDir;
    private snapshotsDir;
    private configFile;
    constructor(baseDir: string);
    initialize(): Promise<void>;
    saveCommit(commit: Commit): Promise<void>;
    getCommit(id: string): Promise<Commit | null>;
    getCommits(ids: string[]): Promise<Commit[]>;
    saveBranch(branch: Branch): Promise<void>;
    getBranch(name: string): Promise<Branch | null>;
    listBranches(): Promise<Branch[]>;
    deleteBranch(name: string): Promise<void>;
    saveTag(tag: Tag): Promise<void>;
    getTag(name: string): Promise<Tag | null>;
    listTags(filter?: TagFilter): Promise<Tag[]>;
    deleteTag(name: string): Promise<void>;
    private matchesTagFilter;
    saveStash(stash: Stash): Promise<void>;
    getStash(id: string): Promise<Stash | null>;
    listStashes(): Promise<Stash[]>;
    deleteStash(id: string): Promise<void>;
    addReflogEntry(entry: ReflogEntry): Promise<void>;
    getReflog(options?: ReflogOptions): Promise<ReflogEntry[]>;
    saveSnapshot(commitId: string, snapshot: DatabaseSnapshot): Promise<void>;
    getSnapshot(commitId: string): Promise<DatabaseSnapshot | null>;
    getConfig(): Promise<VersionControlConfig>;
    saveConfig(config: VersionControlConfig): Promise<void>;
}
export default FileStorage;
//# sourceMappingURL=FileStorage.d.ts.map