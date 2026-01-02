import { BlameInfo, VersionControlStorage, BlameOptions, Result } from './types';
/**
 * Blame Service - Track who changed each part of the database
 */
export declare class BlameService {
    private storage;
    constructor(storage: VersionControlStorage);
    /**
     * Get blame information for a table
     */
    blameTable(tableName: string, commitId: string, options?: BlameOptions): Promise<Result<BlameInfo>>;
    /**
     * Get blame information for a specific column
     */
    blameColumn(tableName: string, columnName: string, commitId: string): Promise<Result<BlameInfo>>;
    private getCommitsAffectingTable;
    private getCommitsAffectingColumn;
    private buildBlameLines;
    /**
     * Get summary of who contributed to a table
     */
    getContributors(tableName: string, commitId: string): Promise<Result<Map<string, number>>>;
}
export default BlameService;
//# sourceMappingURL=BlameService.d.ts.map