/**
 * VCS Database Storage Layer
 * Replaces file-based storage with reliable database storage
 * Compatible with Vercel and other serverless environments
 */

import { DatabaseChange } from './vcs-helper';

export interface VCSCommit {
    id: string;
    connectionId: string;
    branch: string;
    message: string;
    author: { name: string; email: string };
    changes: DatabaseChange[];
    timestamp: string;
    parentCommitId?: string;
}

export interface VCSBranch {
    name: string;
    connectionId: string;
    headCommitId?: string;
    createdAt: string;
}

// In-memory storage for serverless environments
const inMemoryPendingChanges = new Map<string, DatabaseChange[]>();
const inMemoryCommits = new Map<string, VCSCommit[]>();
const inMemoryBranches = new Map<string, VCSBranch[]>();
const inMemoryCurrentBranch = new Map<string, string>();

/**
 * Get pending changes for a connection
 */
export async function getPendingChangesFromStorage(connectionId: string): Promise<DatabaseChange[]> {
    // Check in-memory first (for Vercel)
    if (inMemoryPendingChanges.has(connectionId)) {
        return inMemoryPendingChanges.get(connectionId) || [];
    }

    // Fallback to file system for local development
    if (typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            const pendingPath = path.join(vcsDir, 'pending.json');

            const data = await fs.readFile(pendingPath, 'utf-8');
            const parsed = JSON.parse(data);
            return parsed.changes || [];
        } catch {
            return [];
        }
    }

    return [];
}

/**
 * Add pending change
 */
export async function addPendingChange(connectionId: string, change: DatabaseChange): Promise<void> {
    const current = await getPendingChangesFromStorage(connectionId);

    const newChange = {
        ...change,
        id: change.id || `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: change.timestamp || new Date().toISOString()
    };

    current.push(newChange);
    inMemoryPendingChanges.set(connectionId, current);

    // Also persist to file system in local dev
    if (typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            await fs.mkdir(vcsDir, { recursive: true });

            const pendingPath = path.join(vcsDir, 'pending.json');
            await fs.writeFile(pendingPath, JSON.stringify({ changes: current }, null, 2));
        } catch (error) {
            console.error('[VCS] Failed to persist to file:', error);
            // Continue anyway - in-memory is primary
        }
    }
}

/**
 * Clear pending changes
 */
export async function clearPendingChanges(connectionId: string): Promise<void> {
    inMemoryPendingChanges.set(connectionId, []);

    // Also clear file system
    if (typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            const pendingPath = path.join(vcsDir, 'pending.json');
            await fs.writeFile(pendingPath, JSON.stringify({ changes: [] }));
        } catch {
            // Ignore errors
        }
    }
}

/**
 * Remove specific pending changes
 */
export async function removePendingChanges(connectionId: string, changeIds: string[]): Promise<void> {
    let current = await getPendingChangesFromStorage(connectionId);
    
    // Filter out the committed changes
    current = current.filter(c => !changeIds.includes(c.id || ''));
    
    inMemoryPendingChanges.set(connectionId, current);

    // Persist to file system in local dev
    if (typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            const pendingPath = path.join(vcsDir, 'pending.json');
            await fs.writeFile(pendingPath, JSON.stringify({ changes: current }, null, 2));
        } catch (error) {
            console.error('[VCS] Failed to persist pending changes removal:', error);
        }
    }
}

/**
 * Create a commit
 */
export async function createCommit(commit: VCSCommit): Promise<void> {
    const commits = inMemoryCommits.get(commit.connectionId) || [];
    commits.push(commit);
    inMemoryCommits.set(commit.connectionId, commits);

    // Clear ONLY the committed changes
    if (commit.changes && commit.changes.length > 0) {
        const changeIds = commit.changes.map(c => c.id || '').filter(id => id !== '');
        await removePendingChanges(commit.connectionId, changeIds);
    } else {
        // Fallback for safety - clear all if no specific changes tracked (should not happen in new flow)
        await clearPendingChanges(commit.connectionId);
    }

    // Persist to file system in local dev
    if (typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', commit.connectionId);
            await fs.mkdir(vcsDir, { recursive: true });

            const commitsPath = path.join(vcsDir, 'commits.json');
            await fs.writeFile(commitsPath, JSON.stringify(commits, null, 2));
        } catch (error) {
            console.error('[VCS] Failed to persist commit:', error);
        }
    }
}

/**
 * Get commit history
 */
export async function getCommits(connectionId: string, branch?: string): Promise<VCSCommit[]> {
    // Try in-memory first
    let commits = inMemoryCommits.get(connectionId) || [];

    // Fallback to file system
    if (commits.length === 0 && typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            const commitsPath = path.join(vcsDir, 'commits.json');

            const data = await fs.readFile(commitsPath, 'utf-8');
            commits = JSON.parse(data);
            inMemoryCommits.set(connectionId, commits);
        } catch {
            commits = [];
        }
    }

    // Filter by branch if specified
    if (branch) {
        commits = commits.filter(c => c.branch === branch);
    }

    return commits.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

/**
 * Get branches
 */
export async function getBranchesFromStorage(connectionId: string): Promise<VCSBranch[]> {
    let branches = inMemoryBranches.get(connectionId) || [];

    // Fallback to file system
    if (branches.length === 0 && typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            const branchesPath = path.join(vcsDir, 'branches.json');

            const data = await fs.readFile(branchesPath, 'utf-8');
            branches = JSON.parse(data);
            inMemoryBranches.set(connectionId, branches);
        } catch {
            // Initialize with main branch
            branches = [{
                name: 'main',
                connectionId,
                createdAt: new Date().toISOString()
            }];
            inMemoryBranches.set(connectionId, branches);
        }
    }

    // Ensure main branch exists
    if (!branches.find(b => b.name === 'main')) {
        branches.unshift({
            name: 'main',
            connectionId,
            createdAt: new Date().toISOString()
        });
    }

    return branches;
}

/**
 * Create branch
 */
export async function createBranchInStorage(connectionId: string, name: string): Promise<void> {
    const branches = await getBranchesFromStorage(connectionId);

    if (branches.find(b => b.name === name)) {
        throw new Error(`Branch ${name} already exists`);
    }

    const commits = await getCommits(connectionId);
    const headCommitId = commits[0]?.id;

    branches.push({
        name,
        connectionId,
        headCommitId,
        createdAt: new Date().toISOString()
    });

    inMemoryBranches.set(connectionId, branches);

    // Persist
    if (typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            await fs.mkdir(vcsDir, { recursive: true });

            const branchesPath = path.join(vcsDir, 'branches.json');
            await fs.writeFile(branchesPath, JSON.stringify(branches, null, 2));
        } catch (error) {
            console.error('[VCS] Failed to persist branch:', error);
        }
    }
}

/**
 * Get current branch
 */
export async function getCurrentBranch(connectionId: string): Promise<string> {
    return inMemoryCurrentBranch.get(connectionId) || 'main';
}

/**
 * Switch branch
 */
export async function switchBranch(connectionId: string, branchName: string): Promise<void> {
    const branches = await getBranchesFromStorage(connectionId);

    if (!branches.find(b => b.name === branchName)) {
        throw new Error(`Branch ${branchName} does not exist`);
    }

    inMemoryCurrentBranch.set(connectionId, branchName);

    // Persist current branch
    if (typeof window === 'undefined' && !process.env.VERCEL) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const vcsDir = path.join(process.cwd(), '.bosdb-vcs', connectionId);
            await fs.mkdir(vcsDir, { recursive: true });

            const currentBranchPath = path.join(vcsDir, 'current-branch.txt');
            await fs.writeFile(currentBranchPath, branchName);
        } catch {
            // Ignore
        }
    }
}

/**
 * Get commit by ID
 */
export async function getCommitById(connectionId: string, commitId: string): Promise<VCSCommit | null> {
    const commits = await getCommits(connectionId);
    return commits.find(c => c.id === commitId) || null;
}
