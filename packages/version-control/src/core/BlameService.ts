import {
    BlameInfo,
    BlameLine,
    Commit,
    DatabaseSnapshot,
    VersionControlStorage,
    BlameOptions,
    Result,
} from './types';

/**
 * Blame Service - Track who changed each part of the database
 */
export class BlameService {
    private storage: VersionControlStorage;

    constructor(storage: VersionControlStorage) {
        this.storage = storage;
    }

    /**
     * Get blame information for a table
     */
    async blameTable(
        tableName: string,
        commitId: string,
        _options?: BlameOptions
    ): Promise<Result<BlameInfo>> {
        try {
            const commits = await this.getCommitsAffectingTable(tableName, commitId);

            const lines: BlameLine[] = await this.buildBlameLines(tableName, commits);

            const blameInfo: BlameInfo = {
                table: tableName,
                lines,
            };

            return { success: true, data: blameInfo };
        } catch (error) {
            return { success: false, error: `Blame failed: ${error}` };
        }
    }

    /**
     * Get blame information for a specific column
     */
    async blameColumn(
        tableName: string,
        columnName: string,
        commitId: string
    ): Promise<Result<BlameInfo>> {
        try {
            const commits = await this.getCommitsAffectingColumn(tableName, columnName, commitId);

            const lines: BlameLine[] = await this.buildBlameLines(`${tableName}.${columnName}`, commits);

            const blameInfo: BlameInfo = {
                table: tableName,
                column: columnName,
                lines,
            };

            return { success: true, data: blameInfo };
        } catch (error) {
            return { success: false, error: `Blame failed: ${error}` };
        }
    }

    private async getCommitsAffectingTable(
        tableName: string,
        commitId: string
    ): Promise<Commit[]> {
        const commits: Commit[] = [];
        let currentId = commitId;

        while (currentId) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit) break;

            // Check if this commit affects the table
            const affectsTable = commit.changes.some(
                (change) =>
                    (change.type === 'SCHEMA' && change.target === tableName) ||
                    (change.type === 'DATA' && (change as any).tableName === tableName)
            );

            if (affectsTable) {
                commits.push(commit);
            }

            currentId = commit.parentIds[0] || '';
        }

        return commits.reverse();
    }

    private async getCommitsAffectingColumn(
        tableName: string,
        columnName: string,
        commitId: string
    ): Promise<Commit[]> {
        const commits: Commit[] = [];
        let currentId = commitId;

        while (currentId) {
            const commit = await this.storage.getCommit(currentId);
            if (!commit) break;

            // Check if this commit affects the column
            const affectsColumn = commit.changes.some((change) => {
                if (change.type === 'SCHEMA' && change.target === tableName) {
                    const schemaChange = change as any;
                    return schemaChange.columnChanges?.some(
                        (cc: any) => cc.columnName === columnName
                    );
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

    private async buildBlameLines(
        _target: string,
        commits: Commit[]
    ): Promise<BlameLine[]> {
        const lines: BlameLine[] = [];

        for (let i = 0; i < commits.length; i++) {
            const commit = commits[i];
            const age = Math.floor(
                (Date.now() - commit.timestamp.getTime()) / (1000 * 60 * 60 * 24)
            );

            const line: BlameLine = {
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
    async getContributors(tableName: string, commitId: string): Promise<Result<Map<string, number>>> {
        try {
            const commits = await this.getCommitsAffectingTable(tableName, commitId);
            const contributorMap = new Map<string, number>();

            for (const commit of commits) {
                const authorKey = `${commit.author.name} <${commit.author.email}>`;
                contributorMap.set(authorKey, (contributorMap.get(authorKey) || 0) + 1);
            }

            return { success: true, data: contributorMap };
        } catch (error) {
            return { success: false, error: `Failed to get contributors: ${error}` };
        }
    }
}

export default BlameService;
