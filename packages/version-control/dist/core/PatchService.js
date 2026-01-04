"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchService = void 0;
/**
 * Patch Service - Export and import changesets
 */
class PatchService {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Generate a patch from a commit
     */
    async generatePatch(commitId) {
        try {
            const commit = await this.storage.getCommit(commitId);
            if (!commit) {
                return { success: false, error: 'Commit not found' };
            }
            const patch = await this.createPatchFromCommit(commit);
            return { success: true, data: patch };
        }
        catch (error) {
            return { success: false, error: `Generate patch failed: ${error}` };
        }
    }
    /**
     * Generate a patch from a range of commits
     */
    async generatePatchRange(fromCommit, toCommit) {
        try {
            const commits = await this.getCommitRange(fromCommit, toCommit);
            if (commits.length === 0) {
                return { success: false, error: 'No commits in range' };
            }
            const patch = await this.createPatchFromCommits(commits);
            return { success: true, data: patch };
        }
        catch (error) {
            return { success: false, error: `Generate patch range failed: ${error}` };
        }
    }
    /**
     * Apply a patch
     */
    async applyPatch(patch, options) {
        try {
            if (options?.check) {
                // Dry run - just check if patch can be applied
                const canApply = await this.checkPatch(patch);
                return {
                    success: true,
                    data: {
                        success: canApply,
                        appliedPatches: canApply ? patch.commits.length : 0,
                        failedPatches: canApply ? 0 : patch.commits.length,
                        conflicts: [],
                    },
                };
            }
            const result = await this.applyPatchInternal(patch, options);
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, error: `Apply patch failed: ${error}` };
        }
    }
    /**
     * Export patch to formatted string
     */
    exportPatch(patch) {
        const lines = [];
        // Header
        lines.push(`From ${patch.metadata?.baseCommitId || 'unknown'} ${new Date().toISOString()}`);
        lines.push(`From: ${patch.metadata?.createdBy || 'unknown'}`);
        lines.push(`Date: ${patch.metadata?.createdAt.toISOString() || new Date().toISOString()}`);
        lines.push(`Subject: ${patch.metadata?.description || 'No description'}`);
        lines.push('');
        // Commits
        for (const commit of patch.commits) {
            lines.push(`commit ${commit.id}`);
            lines.push(`Author: ${commit.author.name} <${commit.author.email}>`);
            lines.push(`Date: ${commit.timestamp.toISOString()}`);
            lines.push('');
            lines.push(`    ${commit.message}`);
            lines.push('');
            // Changes
            for (const change of commit.changes) {
                lines.push(`    ${change.type}: ${change.description}`);
            }
            lines.push('');
        }
        // Diffs
        for (const diff of patch.diffs) {
            lines.push(`diff --git a/${diff.fromCommitId} b/${diff.toCommitId}`);
            lines.push(`--- a/${diff.fromCommitId}`);
            lines.push(`+++ b/${diff.toCommitId}`);
            for (const change of diff.schemaChanges) {
                const prefix = change.operation === 'CREATE' ? '+' : change.operation === 'DROP' ? '-' : ' ';
                lines.push(`${prefix} ${change.description}`);
            }
            for (const change of diff.dataChanges) {
                const prefix = change.operation === 'INSERT' ? '+' : change.operation === 'DELETE' ? '-' : ' ';
                lines.push(`${prefix} ${change.description}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    /**
     * Import patch from formatted string
     */
    async importPatch(patchContent) {
        try {
            const patch = await this.parsePatch(patchContent);
            return { success: true, data: patch };
        }
        catch (error) {
            return { success: false, error: `Import patch failed: ${error}` };
        }
    }
    async createPatchFromCommit(commit) {
        const patch = {
            id: `patch-${commit.id}`,
            commits: [commit],
            diffs: [],
            format: 'UNIFIED',
            content: '',
            metadata: {
                createdAt: new Date(),
                createdBy: commit.author.name,
                description: commit.message,
                baseCommitId: commit.parentIds[0] || '',
            },
        };
        patch.content = this.exportPatch(patch);
        return patch;
    }
    async createPatchFromCommits(commits) {
        const patch = {
            id: `patch-${Date.now()}`,
            commits,
            diffs: [],
            format: 'UNIFIED',
            content: '',
            metadata: {
                createdAt: new Date(),
                createdBy: commits[0]?.author.name || 'unknown',
                description: `Patch from ${commits.length} commits`,
                baseCommitId: commits[0]?.parentIds[0] || '',
            },
        };
        patch.content = this.exportPatch(patch);
        return patch;
    }
    async getCommitRange(fromCommit, toCommit) {
        const commits = [];
        let currentId = toCommit;
        while (currentId && currentId !== fromCommit) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit)
                break;
            commits.unshift(commit);
            currentId = commit.parentIds[0] || '';
        }
        return commits;
    }
    async checkPatch(_patch) {
        // Simplified check - in production would verify all changes can be applied
        return true;
    }
    async applyPatchInternal(patch, _options) {
        let appliedPatches = 0;
        let failedPatches = 0;
        const conflicts = [];
        for (const commit of patch.commits) {
            try {
                // Apply commit changes
                await this.storage.saveCommit(commit);
                appliedPatches++;
            }
            catch (error) {
                failedPatches++;
            }
        }
        return {
            success: failedPatches === 0,
            appliedPatches,
            failedPatches,
            conflicts,
        };
    }
    async parsePatch(content) {
        // Simplified parser - in production would parse Git patch format
        const lines = content.split('\n');
        const patch = {
            id: `patch-${Date.now()}`,
            commits: [],
            diffs: [],
            format: 'UNIFIED',
            content,
        };
        return patch;
    }
    /**
     * Generate patch statistics
     */
    getPatchStats(patch) {
        const affectedTables = new Set();
        let changeCount = 0;
        for (const commit of patch.commits) {
            changeCount += commit.changes.length;
            for (const change of commit.changes) {
                affectedTables.add(change.target);
            }
        }
        return {
            commitCount: patch.commits.length,
            changeCount,
            affectedTables,
        };
    }
}
exports.PatchService = PatchService;
exports.default = PatchService;
//# sourceMappingURL=PatchService.js.map