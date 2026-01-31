import { Patch, PatchApplyResult, VersionControlStorage, PatchOptions, Result } from './types';
/**
 * Patch Service - Export and import changesets
 */
export declare class PatchService {
    private storage;
    constructor(storage: VersionControlStorage);
    /**
     * Generate a patch from a commit
     */
    generatePatch(commitId: string): Promise<Result<Patch>>;
    /**
     * Generate a patch from a range of commits
     */
    generatePatchRange(fromCommit: string, toCommit: string): Promise<Result<Patch>>;
    /**
     * Apply a patch
     */
    applyPatch(patch: Patch, options?: PatchOptions): Promise<Result<PatchApplyResult>>;
    /**
     * Export patch to formatted string
     */
    exportPatch(patch: Patch): string;
    /**
     * Import patch from formatted string
     */
    importPatch(patchContent: string): Promise<Result<Patch>>;
    private createPatchFromCommit;
    private createPatchFromCommits;
    private getCommitRange;
    private checkPatch;
    private applyPatchInternal;
    private parsePatch;
    /**
     * Generate patch statistics
     */
    getPatchStats(patch: Patch): {
        commitCount: number;
        changeCount: number;
        affectedTables: Set<string>;
    };
}
export default PatchService;
//# sourceMappingURL=PatchService.d.ts.map