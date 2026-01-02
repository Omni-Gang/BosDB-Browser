import { BisectSession, VersionControlStorage, Result } from './types';
/**
 * Bisect Service - Binary search to find when a bug was introduced
 */
export declare class BisectService {
    private storage;
    private currentSession;
    constructor(storage: VersionControlStorage);
    /**
     * Start a bisect session
     */
    start(goodCommitId: string, badCommitId: string): Promise<Result<BisectSession>>;
    /**
     * Mark current commit as good
     */
    markGood(): Promise<Result<BisectSession>>;
    /**
     * Mark current commit as bad
     */
    markBad(): Promise<Result<BisectSession>>;
    /**
     * Skip current commit
     */
    skip(): Promise<Result<BisectSession>>;
    /**
     * Reset/abort bisect session
     */
    reset(): Promise<Result<void>>;
    /**
     * Get current bisect session
     */
    getSession(): BisectSession | null;
    private nextStep;
    private getCommitRange;
    private filterCommits;
    private generateBisectId;
    /**
     * Estimate remaining steps
     */
    getRemainingSteps(): number;
}
export default BisectService;
//# sourceMappingURL=BisectService.d.ts.map