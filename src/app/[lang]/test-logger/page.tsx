'use client';

import { useState } from 'react';
import { fatLogger } from '@/lib/logger';

export default function LoggerTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBasicLogging = () => {
    addResult('Testing basic logging...');

    fatLogger.debug('Debug message', 'fe', { test: 'data' });
    fatLogger.info('Info message', 'fe', { test: 'data' });
    fatLogger.warn('Warning message', 'fe', { test: 'data' });
    fatLogger.error('Error message', 'fe', { test: 'data' });

    addResult('Basic logging tests completed - check console');
  };

  const testServiceLogging = () => {
    addResult('Testing service-specific logging...');

    fatLogger.debug('Debug with service', 'fe', { test: 'upload data' });
    fatLogger.info('Info with service', 'fe', { test: 'database data' });
    fatLogger.warn('Warning with service', 'fe', { test: 'auth data' });
    fatLogger.error('Error with service', 'fe', { test: 'app data' });

    addResult('Service logging tests completed - check console');
  };

  const testSpecializedLoggers = () => {
    addResult('Testing specialized loggers...');

    fatLogger.debug('Upload debug message', 'fe', { file: 'test.jpg' });
    fatLogger.info('Database info message', 'fe', { query: 'SELECT * FROM users' });
    fatLogger.warn('Auth warning message', 'fe', { userId: '123' });
    fatLogger.error('App error message', 'fe', { error: 'Something went wrong' });

    addResult('Specialized logger tests completed - check console');
  };

  const testHostingPreferencesLogger = () => {
    addResult('Testing hosting preferences fatLogger...');

    fatLogger.debug('Hosting preferences debug', 'fe', {
      backendHosting: 'vercel',
      databaseHosting: ['neon'],
      blobHosting: ['s3'],
    });

    fatLogger.info('Hosting preferences updated', 'fe', {
      previous: { backendHosting: 'vercel' },
      new: { backendHosting: 'icp' },
    });

    addResult('Hosting preferences logger tests completed - check console');
  };

  const testComplexObjects = () => {
    addResult('Testing complex object logging...');

    const complexObject = {
      user: {
        id: '123',
        name: 'Test User',
        preferences: {
          theme: 'dark',
          language: 'en',
        },
      },
      memory: {
        id: '456',
        title: 'Test Memory',
        assets: [
          { id: '1', type: 'image' },
          { id: '2', type: 'video' },
        ],
      },
    };

    fatLogger.debug('Complex object test', 'fe', complexObject);
    fatLogger.info('Nested object test', 'fe', { data: complexObject });

    addResult('Complex object tests completed - check console');
  };

  const testErrorLogging = () => {
    addResult('Testing error logging...');

    try {
      throw new Error('Test error for logging');
    } catch (error) {
      fatLogger.error('Caught test error', 'fe', error instanceof Error ? error : new Error(String(error)));
    }

    fatLogger.error('Manual error test', 'fe', new Error('Manual test error'));

    addResult('Error logging tests completed - check console');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Logger Test Page</h1>

      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open browser console (F12 → Console tab)</li>
          <li>Click the test buttons below</li>
          <li>Check console for logger output</li>
          <li>
            Toggle <code className="bg-gray-100 px-1 rounded">ENABLE_LOGGING</code> in{' '}
            <code className="bg-gray-100 px-1 rounded">src/nextjs/src/lib/fatLogger.ts</code>
          </li>
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={testBasicLogging} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Test Basic Logging
        </button>

        <button onClick={testServiceLogging} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Test Service Logging
        </button>

        <button
          onClick={testSpecializedLoggers}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Specialized Loggers
        </button>

        <button
          onClick={testHostingPreferencesLogger}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Test Hosting Preferences Logger
        </button>

        <button onClick={testComplexObjects} className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600">
          Test Complex Objects
        </button>

        <button onClick={testErrorLogging} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Test Error Logging
        </button>
      </div>

      <div className="mb-4">
        <button onClick={clearResults} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          Clear Results
        </button>
      </div>

      <div className="bg-gray-50 border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 italic">No tests run yet. Click a test button above.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Logger Configuration:</h2>
        <p className="text-sm mb-2">
          Current logger settings are in{' '}
          <code className="bg-gray-100 px-1 rounded">src/nextjs/src/lib/fatLogger.ts</code>
        </p>
        <ul className="text-sm space-y-1">
          <li>
            <code className="bg-gray-100 px-1 rounded">ENABLE_LOGGING</code> - Master switch for all logging
          </li>
          <li>
            <code className="bg-gray-100 px-1 rounded">ENABLE_UI_LOGGING</code> - Frontend component logging
          </li>
          <li>
            <code className="bg-gray-100 px-1 rounded">ENABLE_BACKEND_LOGGING</code> - Backend API logging
          </li>
          <li>
            <code className="bg-gray-100 px-1 rounded">ENABLE_UPLOAD_LOGGING</code> - Upload process logging
          </li>
          <li>
            <code className="bg-gray-100 px-1 rounded">ENABLE_DATABASE_LOGGING</code> - Database operation logging
          </li>
          <li>
            <code className="bg-gray-100 px-1 rounded">ENABLE_AUTH_LOGGING</code> - Authentication logging
          </li>
          <li>
            <code className="bg-gray-100 px-1 rounded">ENABLE_HOSTING_PREFERENCES</code> - Hosting preferences logging
          </li>
        </ul>
      </div>
    </div>
  );
}
