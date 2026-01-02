"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BisectService = void 0;
/**
 * Bisect Service - Binary search to find when a bug was introduced
 */
class BisectService {
    constructor(storage) {
        this.currentSession = null;
        this.storage = storage;
    }
    /**
     * Start a bisect session
     */
    async start(goodCommitId, badCommitId) {
        try {
            if (this.currentSession) {
                return { success: false, error: 'Bisect session already active' };
            }
            // Get all commits between good and bad
            const commits = await this.getCommitRange(goodCommitId, badCommitId);
            if (commits.length === 0) {
                return { success: false, error: 'No commits between good and bad' };
            }
            // Start in the middle
            const middleIndex = Math.floor(commits.length / 2);
            this.currentSession = {
                id: this.generateBisectId(),
                goodCommits: [goodCommitId],
                badCommits: [badCommitId],
                currentCommit: commits[middleIndex].id,
                remainingCommits: commits.map((c) => c.id),
                status: 'ACTIVE',
            };
            return { success: true, data: this.currentSession };
        }
        catch (error) {
            return { success: false, error: `Bisect start failed: ${error}` };
        }
    }
    /**
     * Mark current commit as good
     */
    async markGood() {
        try {
            if (!this.currentSession) {
                return { success: false, error: 'No active bisect session' };
            }
            this.currentSession.goodCommits.push(this.currentSession.currentCommit);
            return this.nextStep();
        }
        catch (error) {
            return { success: false, error: `Mark good failed: ${error}` };
        }
    }
    /**
     * Mark current commit as bad
     */
    async markBad() {
        try {
            if (!this.currentSession) {
                return { success: false, error: 'No active bisect session' };
            }
            this.currentSession.badCommits.push(this.currentSession.currentCommit);
            return this.nextStep();
        }
        catch (error) {
            return { success: false, error: `Mark bad failed: ${error}` };
        }
    }
    /**
     * Skip current commit
     */
    async skip() {
        try {
            if (!this.currentSession) {
                return { success: false, error: 'No active bisect session' };
            }
            // Remove current commit from consideration
            this.currentSession.remainingCommits = this.currentSession.remainingCommits.filter((id) => id !== this.currentSession.currentCommit);
            return this.nextStep();
        }
        catch (error) {
            return { success: false, error: `Skip failed: ${error}` };
        }
    }
    /**
     * Reset/abort bisect session
     */
    async reset() {
        try {
            if (!this.currentSession) {
                return { success: false, error: 'No active bisect session' };
            }
            this.currentSession.status = 'ABORTED';
            this.currentSession = null;
            return { success: true, data: undefined };
        }
        catch (error) {
            return { success: false, error: `Reset failed: ${error}` };
        }
    }
    /**
     * Get current bisect session
     */
    getSession() {
        return this.currentSession;
    }
    async nextStep() {
        if (!this.currentSession) {
            return { success: false, error: 'No active session' };
        }
        // Filter remaining commits based on good/bad commits
        const remaining = await this.filterCommits(this.currentSession.remainingCommits, this.currentSession.goodCommits, this.currentSession.badCommits);
        if (remaining.length === 0) {
            // Found the first bad commit
            this.currentSession.status = 'FOUND';
            this.currentSession.firstBadCommit = this.currentSession.badCommits[this.currentSession.badCommits.length - 1];
            const session = { ...this.currentSession };
            this.currentSession = null;
            return { success: true, data: session };
        }
        if (remaining.length === 1) {
            // Only one commit left - this is the culprit
            this.currentSession.status = 'FOUND';
            this.currentSession.firstBadCommit = remaining[0];
            const session = { ...this.currentSession };
            this.currentSession = null;
            return { success: true, data: session };
        }
        // Continue bisecting - choose middle commit
        const middleIndex = Math.floor(remaining.length / 2);
        this.currentSession.currentCommit = remaining[middleIndex];
        this.currentSession.remainingCommits = remaining;
        return { success: true, data: this.currentSession };
    }
    async getCommitRange(goodCommitId, badCommitId) {
        const commits = [];
        let currentId = badCommitId;
        while (currentId && currentId !== goodCommitId) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit)
                break;
            commits.push(commit);
            currentId = commit.parentIds[0] || '';
        }
        return commits.reverse();
    }
    async filterCommits(allCommits, goodCommits, badCommits) {
        // Simplified filtering - in production would use commit graph analysis
        return allCommits.filter((id) => !goodCommits.includes(id) && !badCommits.includes(id));
    }
    generateBisectId() {
        return `bisect-${Date.now()}`;
    }
    /**
     * Estimate remaining steps
     */
    getRemainingSteps() {
        if (!this.currentSession)
            return 0;
        return Math.ceil(Math.log2(this.currentSession.remainingCommits.length));
    }
}
exports.BisectService = BisectService;
exports.default = BisectService;
//# sourceMappingURL=BisectService.js.map