/**
 * Core types for database version control system
 * Implements all Git-like operations for databases
 */

// ============ Core Version Control Types ============

export interface DatabaseSnapshot {
    schema: SchemaDefinition;
    data: DataSnapshot;
    timestamp: Date;
}

export interface SchemaDefinition {
    tables: Record<string, TableDefinition>;
    views?: Record<string, ViewDefinition>;
    indexes?: Record<string, IndexDefinition>;
    constraints?: Record<string, ConstraintDefinition>;
}

export interface TableDefinition {
    name: string;
    columns: ColumnDefinition[];
    primaryKey?: string[];
    foreignKeys?: ForeignKeyDefinition[];
}

export interface ColumnDefinition {
    name: string;
    type: string;
    nullable: boolean;
    default?: any;
    autoIncrement?: boolean;
}

export interface ViewDefinition {
    name: string;
    definition: string;
}

export interface IndexDefinition {
    name: string;
    table: string;
    columns: string[];
    unique: boolean;
}

export interface ConstraintDefinition {
    name: string;
    type: 'CHECK' | 'UNIQUE' | 'FOREIGN_KEY';
    definition: string;
}

export interface ForeignKeyDefinition {
    column: string;
    refTable: string;
    refColumn: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface DataSnapshot {
    tables: Record<string, TableData>;
}

export interface TableData {
    rows: Record<string, any>[];
    checksum?: string;
}

// ============ Commit & Change Types ============

export interface Commit {
    id: string;
    message: string;
    author: Author;
    timestamp: Date;
    parentIds: string[];  // Support for merge commits (multiple parents)
    treeId: string;       // Reference to database state
    changes: Change[];
    branchName?: string;  // NEW: Track which branch this commit belongs to
    signature?: CommitSignature;
    metadata?: Record<string, any>;
}

export interface Author {
    name: string;
    email: string;
    timestamp: Date;
}

export interface CommitSignature {
    signer: string;
    publicKey: string;
    signature: string;
    algorithm: 'RSA' | 'ECDSA';
    verified: boolean;
}

export type Change =
    | SchemaChange
    | DataChange
    | ViewChange
    | IndexChange
    | ConstraintChange;

export interface BaseChange {
    type: 'SCHEMA' | 'DATA' | 'VIEW' | 'INDEX' | 'CONSTRAINT';
    operation: 'CREATE' | 'ALTER' | 'DROP' | 'INSERT' | 'UPDATE' | 'DELETE';
    target: string; // table/view/index name
    description: string;
}

export interface SchemaChange extends BaseChange {
    type: 'SCHEMA';
    tableName: string;
    columnChanges?: ColumnChange[];
    tableChange?: 'CREATE' | 'DROP' | 'RENAME';
}

export interface ColumnChange {
    operation: 'ADD' | 'DROP' | 'MODIFY';
    columnName: string;
    oldDefinition?: ColumnDefinition;
    newDefinition?: ColumnDefinition;
}

export interface DataChange extends BaseChange {
    type: 'DATA';
    tableName: string;
    rowId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    affectedRows?: number;
}

export interface ViewChange extends BaseChange {
    type: 'VIEW';
    viewName: string;
    oldDefinition?: string;
    newDefinition?: string;
}

export interface IndexChange extends BaseChange {
    type: 'INDEX';
    indexName: string;
    tableName: string;
    columns?: string[];
}

export interface ConstraintChange extends BaseChange {
    type: 'CONSTRAINT';
    constraintName: string;
    oldDefinition?: string;
    newDefinition?: string;
}

// ============ Branch Types ============

export interface Branch {
    name: string;
    commitId: string;
    upstream?: string;
    protected: boolean;
    metadata?: Record<string, any>;
}

export interface BranchConfig {
    defaultBranch: string;
    protectedBranches: string[];
    autoDeleteMerged: boolean;
}

// ============ Tag Types ============

export interface Tag {
    name: string;
    commitId: string;
    type: 'LIGHTWEIGHT' | 'ANNOTATED';
    message?: string;
    tagger?: Author;
    createdAt: Date;
}

export interface TagFilter {
    pattern?: string;
    afterDate?: Date;
    beforeDate?: Date;
    annotatedOnly?: boolean;
}

// ============ Stash Types ============

export interface Stash {
    id: string;
    message: string;
    branchName: string;
    parentCommitId: string;
    changes: Change[];
    author: Author;
    createdAt: Date;
}

export interface StashOptions {
    includeUntracked?: boolean;
    keepIndex?: boolean;
    message?: string;
}

// ============ Merge Types ============

export interface MergeResult {
    success: boolean;
    commitId?: string;
    conflicts: MergeConflict[];
    strategy: MergeStrategy;
    message: string;
}

export type MergeStrategy =
    | 'RECURSIVE'
    | 'OURS'
    | 'THEIRS'
    | 'OCTOPUS'
    | 'FAST_FORWARD';

export interface MergeConflict {
    type: 'SCHEMA' | 'DATA';
    target: string; // table/column name
    description: string;
    currentValue: any;
    incomingValue: any;
    baseValue?: any; // For 3-way merge
    resolved: boolean;
    resolution?: any;
}

export interface MergeOptions {
    strategy?: MergeStrategy;
    noFastForward?: boolean;
    squash?: boolean;
    message?: string;
    allowConflicts?: boolean;
}

// ============ Cherry-Pick Types ============

export interface CherryPickResult {
    success: boolean;
    newCommitId?: string;
    conflicts: MergeConflict[];
    skipped: boolean;
}

export interface CherryPickOptions {
    noCommit?: boolean;
    mainline?: number; // For merge commits
    allowEmpty?: boolean;
}

// ============ Rebase Types ============

export interface RebaseResult {
    success: boolean;
    newHeadCommitId?: string;
    rebasedCommits: string[];
    conflicts: MergeConflict[];
    aborted: boolean;
}

export interface RebaseOptions {
    interactive?: boolean;
    onto?: string;
    preserveMerges?: boolean;
    autosquash?: boolean;
}

export interface RebaseAction {
    action: 'PICK' | 'REWORD' | 'EDIT' | 'SQUASH' | 'FIXUP' | 'DROP';
    commitId: string;
    newMessage?: string;
}

// ============ Diff Types ============

export interface Diff {
    fromCommitId: string;
    toCommitId: string;
    schemaChanges: SchemaChange[];
    dataChanges: DataChange[];
    viewChanges: ViewChange[];
    indexChanges: IndexChange[];
    summary: DiffSummary;
}

export interface DiffSummary {
    filesChanged: number;
    insertions: number;
    deletions: number;
    modifications: number;
}

export interface DiffOptions {
    contextLines?: number;
    ignoreWhitespace?: boolean;
    algorithm?: 'MYERS' | 'PATIENCE' | 'HISTOGRAM';
}

// ============ Blame Types ============

export interface BlameInfo {
    table: string;
    column?: string;
    lines: BlameLine[];
}

export interface BlameLine {
    lineNumber: number;
    content: any;
    commit: Commit;
    author: Author;
    age: number; // Days since commit
}

export interface BlameOptions {
    followRenames?: boolean;
    ignoreRevsFile?: string;
}

// ============ Bisect Types ============

export interface BisectSession {
    id: string;
    goodCommits: string[];
    badCommits: string[];
    currentCommit: string;
    remainingCommits: string[];
    status: 'ACTIVE' | 'FOUND' | 'ABORTED';
    firstBadCommit?: string;
}

export interface BisectOptions {
    testCommand?: string;
    automate?: boolean;
}

// ============ Reflog Types ============

export interface ReflogEntry {
    id: number;
    ref: string; // HEAD, branch name, etc.
    oldCommitId: string;
    newCommitId: string;
    action: ReflogAction;
    message: string;
    author: Author;
    timestamp: Date;
}

export type ReflogAction =
    | 'COMMIT'
    | 'CHECKOUT'
    | 'MERGE'
    | 'REBASE'
    | 'CHERRY_PICK'
    | 'RESET'
    | 'PULL'
    | 'CLONE';

export interface ReflogOptions {
    maxCount?: number;
    since?: Date;
    until?: Date;
    refName?: string;
}

// ============ Patch Types ============

export interface Patch {
    id: string;
    commits: Commit[];
    diffs: Diff[];
    format: 'UNIFIED' | 'CONTEXT' | 'GIT';
    content: string;
    metadata?: PatchMetadata;
}

export interface PatchMetadata {
    createdAt: Date;
    createdBy: string;
    description: string;
    baseCommitId: string;
}

export interface PatchApplyResult {
    success: boolean;
    appliedPatches: number;
    failedPatches: number;
    conflicts: MergeConflict[];
    rejectedHunks?: string[];
}

export interface PatchOptions {
    check?: boolean;
    reverse?: boolean;
    directory?: string;
}

// ============ Log & History Types ============

export interface LogOptions {
    maxCount?: number;
    skip?: number;
    since?: Date;
    until?: Date;
    author?: string;
    committer?: string;
    grep?: string; // Search commit messages
    pathFilter?: string[]; // Filter by table names
    merges?: 'ONLY' | 'EXCLUDE' | 'INCLUDE';
    firstParent?: boolean;
    graph?: boolean;
}

export interface CommitGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface GraphNode {
    commitId: string;
    commit: Commit;
    x: number;
    y: number;
    lane: number;
}

export interface GraphEdge {
    from: string;
    to: string;
    type: 'PARENT' | 'MERGE';
}

// ============ Hook Types ============

export interface Hook {
    name: HookType;
    enabled: boolean;
    script: string;
    async?: boolean;
}

export type HookType =
    | 'PRE_COMMIT'
    | 'POST_COMMIT'
    | 'PRE_MERGE'
    | 'POST_MERGE'
    | 'PRE_PUSH'
    | 'POST_PUSH';

export interface HookContext {
    hookType: HookType;
    commit?: Commit;
    branch?: Branch;
    database: string;
    metadata?: Record<string, any>;
}

export interface HookResult {
    allow: boolean;
    message?: string;
    modifiedChanges?: Change[];
}

// ============ Submodule Types ============

export interface Submodule {
    path: string;
    databaseUrl: string;
    commitId: string;
    branch?: string;
}

// ============ Worktree Types ============

export interface Worktree {
    path: string;
    branch: string;
    commitId: string;
    locked: boolean;
}

// ============ Remote Types ============

export interface Remote {
    name: string;
    url: string;
    fetchRefSpec: string;
    pushRefSpec: string;
}

// ============ Configuration Types ============

export interface VersionControlConfig {
    HEAD: string; // Current branch name or commit ID
    branches: Record<string, Branch>;
    tags: Record<string, Tag>;
    remotes?: Record<string, Remote>;
    hooks?: Hook[];
    config: RepositoryConfig;
}

export interface RepositoryConfig {
    user?: {
        name: string;
        email: string;
    };
    core?: {
        compression?: number;
        autoGc?: boolean;
        logAllRefUpdates?: boolean;
    };
    merge?: {
        defaultStrategy?: MergeStrategy;
        conflictStyle?: 'MERGE' | 'DIFF3';
    };
    push?: {
        default?: 'SIMPLE' | 'MATCHING' | 'UPSTREAM';
    };
}

// ============ Storage Types ============

export interface VersionControlStorage {
    // Core operations
    saveCommit(commit: Commit): Promise<void>;
    getCommit(id: string): Promise<Commit | null>;
    getCommits(ids: string[]): Promise<Commit[]>;

    // Branch operations
    saveBranch(branch: Branch): Promise<void>;
    getBranch(name: string): Promise<Branch | null>;
    listBranches(): Promise<Branch[]>;
    deleteBranch(name: string): Promise<void>;

    // Tag operations
    saveTag(tag: Tag): Promise<void>;
    getTag(name: string): Promise<Tag | null>;
    listTags(filter?: TagFilter): Promise<Tag[]>;
    deleteTag(name: string): Promise<void>;

    // Stash operations
    saveStash(stash: Stash): Promise<void>;
    getStash(id: string): Promise<Stash | null>;
    listStashes(): Promise<Stash[]>;
    deleteStash(id: string): Promise<void>;

    // Reflog operations
    addReflogEntry(entry: ReflogEntry): Promise<void>;
    getReflog(options?: ReflogOptions): Promise<ReflogEntry[]>;

    // State operations
    saveSnapshot(commitId: string, snapshot: DatabaseSnapshot): Promise<void>;
    getSnapshot(commitId: string): Promise<DatabaseSnapshot | null>;

    // Config operations
    getConfig(): Promise<VersionControlConfig>;
    saveConfig(config: VersionControlConfig): Promise<void>;
}

export interface ErrorResult {
    success: false;
    error: string;
    code?: string;
    details?: any;
}

export interface SuccessResult<T> {
    success: true;
    data: T;
}

export type Result<T> = SuccessResult<T> | ErrorResult;
