// Simple test page to verify VCS integration
'use client';

import { useEffect, useState } from 'react';

export default function VCSTestPage() {
    const [result, setResult] = useState<any>(null);

    const testAPI = async () => {
        // Test 1: Add a change
        const addRes = await fetch('/api/vcs/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                connectionId: 'test-connection',
                change: {
                    type: 'DATA',
                    operation: 'INSERT',
                    target: 'test_table',
                    description: 'Test from debug page',
                    query: 'INSERT INTO test_table VALUES (1)',
                    affectedRows: 1
                }
            })
        });

        const addData = await addRes.json();
        console.log('Add result:', addData);

        // Test 2: Get pending changes
        const getRes = await fetch('/api/vcs/pending?connectionId=test-connection');
        const getData = await getRes.json();
        console.log('Get result:', getData);

        setResult({ add: addData, get: getData });
    };

    useEffect(() => {
        testAPI();
    }, []);

    return (
        <div className="p-8 bg-gray-900 text-white min-h-screen">
            <h1 className="text-3xl font-bold mb-4">VCS Integration Test</h1>
            <button
                onClick={testAPI}
                className="px-4 py-2 bg-blue-600 rounded mb-4"
            >
                Run Test
            </button>
            <pre className="bg-black p-4 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
            </pre>

            <div className="mt-8">
                <h2 className="text-xl font-bold mb-2">Instructions:</h2>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Click &quot;Run Test&quot; to add a test change</li>
                    <li>Check if it appears in the result</li>
                    <li>Go to /version-control?connection=test-connection</li>
                    <li>Check &quot;Pending&quot; tab for the change</li>
                </ol>
            </div>
        </div>
    );
}
