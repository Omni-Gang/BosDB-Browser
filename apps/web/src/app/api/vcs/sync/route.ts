import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/store';
import { getConnectedAdapter } from '@/lib/db-utils';
import { getLastSyncTimestamp, setLastSyncTimestamp, addPendingChange } from '@/lib/vcs-storage';
import { parseQueryForChanges } from '@/lib/vcs-helper';
import { Logger } from '@bosdb/utils';

const logger = new Logger('VCSSyncAPI');

export async function POST(request: NextRequest) {
    try {
        const { connectionId } = await request.json();

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
        }

        const connection = await getConnection(connectionId);
        if (!connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        // Get the connected adapter
        let adapter;
        let adapterConnectionId;
        try {
            const result = await getConnectedAdapter(connectionId);
            adapter = result.adapter;
            adapterConnectionId = result.adapterConnectionId;
        } catch (e: any) {
            logger.error(`Database connection failed for ${connectionId}`, e);
            return NextResponse.json({ error: `Database connection failed: ${e.message}` }, { status: 500 });
        }

        // Check if adapter supports getRecentQueries
        if (!adapter.getRecentQueries) {
            return NextResponse.json({
                success: false,
                message: 'External tracking not supported by this database adapter'
            });
        }

        // Get last sync time
        const lastSyncTimestamp = await getLastSyncTimestamp(connectionId);
        try {
            logger.info(`[Sync] Fetching recent queries since ${lastSyncTimestamp.toISOString()}...`);
            const queries = await adapter.getRecentQueries(adapterConnectionId, lastSyncTimestamp);

            logger.info(`[Sync] Adapter returned ${queries.length} queries`);

            let trackedCount = 0;
            const trackedAuditIds: number[] = [];

            for (const log of queries) {
                // Log the query being processed (truncate for noise)
                const preview = log.query.substring(0, 80).replace(/\n/g, ' ').trim();
                logger.info(`[Sync] Processing: ${preview}`);

                // Parse query to see if it's a change worth tracking
                const change = parseQueryForChanges(log.query);

                if (change) {
                    logger.info(`[Sync] ✓ Matched as ${change.type}: ${change.description}`);

                    // Add to VCS as pending change with [External] marker
                    await addPendingChange(connectionId, {
                        ...change,
                        timestamp: log.executionTime.toISOString(),
                        description: `[External] ${change.description}`,
                        metadata: {
                            ...(change.metadata || {}),
                            source: 'EXTERNAL',
                            auditLogId: log.auditId
                        }
                    });

                    // Mark audit log entry for deletion ONLY after successful VCS tracking
                    if (log.auditId !== undefined) {
                        trackedAuditIds.push(log.auditId);
                    }

                    trackedCount++;
                } else {
                    logger.info(`[Sync] ✗ Skipped (not trackable)`);
                }
            }

            // Delete processed audit log entries (safe delete-after-confirm policy)
            if (trackedAuditIds.length > 0 && typeof (adapter as any).deleteAuditLogEntries === 'function') {
                logger.info(`[Sync] Deleting ${trackedAuditIds.length} audit log entries...`);
                await (adapter as any).deleteAuditLogEntries(adapterConnectionId, trackedAuditIds);
            }

            // Update last sync timestamp
            await setLastSyncTimestamp(connectionId, new Date());

            logger.info(`[Sync] Successfully tracked ${trackedCount}/${queries.length} changes`);

            return NextResponse.json({
                success: true,
                trackedCount,
                totalQueries: queries.length
            });
        } catch (error: any) {
            logger.error(`[Sync] Failed to sync external changes: ${error.message}`, error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        logger.error('Failed to sync external changes', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
