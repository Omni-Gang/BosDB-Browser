"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlameService = void 0;
/**
 * Blame Service - Track who changed each part of the database
 */
class BlameService {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Get blame information for a table
     */
    async blameTable(tableName, commitId, _options) {
        try {
            const commits = await this.getCommitsAffectingTable(tableName, commitId);
            const lines = await this.buildBlameLines(tableName, commits);
            const blameInfo = {
                table: tableName,
                lines,
            };
            return { success: true, data: blameInfo };
        }
        catch (error) {
            return { success: false, error: `Blame failed: ${error}` };
        }
    }
    /**
     * Get blame information for a specific column
     */
    async blameColumn(tableName, columnName, commitId) {
        try {
            const commits = await this.getCommitsAffectingColumn(tableName, columnName, commitId);
            const lines = await this.buildBlameLines(`${tableName}.${columnName}`, commits);
            const blameInfo = {
                table: tableName,
                column: columnName,
                lines,
            };
            return { success: true, data: blameInfo };
        }
        catch (error) {
            return { success: false, error: `Blame failed: ${error}` };
        }
    }
    async getCommitsAffectingTable(tableName, commitId) {
        const commits = [];
        let currentId = commitId;
        while (currentId) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit)
                break;
            // Check if this commit affects the table
            const affectsTable = commit.changes.some((change) => (change.type === 'SCHEMA' && change.target === tableName) ||
                (change.type === 'DATA' && change.tableName === tableName));
            if (affectsTable) {
                commits.push(commit);
            }
            currentId = commit.parentIds[0] || '';
        }
        return commits.reverse();
    }
    async getCommitsAffectingColumn(tableName, columnName, commitId) {
        const commits = [];
        let currentId = commitId;
        while (currentId) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit)
                break;
            // Check if this commit affects the column
            const affectsColumn = commit.changes.some((change) => {
                if (change.type === 'SCHEMA' && change.target === tableName) {
                    const schemaChange = change;
                    return schemaChange.columnChanges?.some((cc) => cc.columnName === columnName);
                }
                return false;
            });
            if (affectsColumn) {
                commits.push(commit);
            }
            currentId = commit.parentIds[0] || '';
        }
        return commits.reverse();
    }
    async buildBlameLines(_target, commits) {
        const lines = [];
        for (let i = 0; i < commits.length; i++) {
            const commit = commits[i];
            const age = Math.floor((Date.now() - commit.timestamp.getTime()) / (1000 * 60 * 60 * 24));
            const line = {
                lineNumber: i + 1,
                content: commit.changes[0]?.description || '',
                commit,
                author: commit.author,
                age,
            };
            lines.push(line);
        }
        return lines;
    }
    /**
     * Get summary of who contributed to a table
     */
    async getContributors(tableName, commitId) {
        try {
            const commits = await this.getCommitsAffectingTable(tableName, commitId);
            const contributorMap = new Map();
            for (const commit of commits) {
                const authorKey = `${commit.author.name} <${commit.author.email}>`;
                contributorMap.set(authorKey, (contributorMap.get(authorKey) || 0) + 1);
            }
            return { success: true, data: contributorMap };
        }
        catch (error) {
            return { success: false, error: `Failed to get contributors: ${error}` };
        }
    }
}
exports.BlameService = BlameService;
exports.default = BlameService;
//# sourceMappingURL=BlameService.js.map