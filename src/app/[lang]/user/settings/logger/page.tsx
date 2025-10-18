'use client';

import { useState, useEffect } from 'react';
import { fatLogger } from '@/lib/logger/fat-logger';
import { tinyLogger, setLoggerFilter, toggleLogger } from '@/lib/logger/tiny-logger';

// Three-state toggle values
type ToggleState = 'not-set' | 'enabled' | 'disabled';

// Logger configuration state
interface LoggerConfig {
  ENABLE_LOGGING: ToggleState;
  ENABLE_FRONTEND_LOGGING: ToggleState;
  ENABLE_BACKEND_LOGGING: ToggleState;
  ENABLE_UPLOAD_LOGGING: ToggleState;
  ENABLE_DATABASE_LOGGING: ToggleState;
  ENABLE_AUTH_LOGGING: ToggleState;
  ENABLE_ASSET_LOGGING: ToggleState;
  ENABLE_S3_LOGGING: ToggleState;
  ENABLE_ICP_UPLOAD_LOGGING: ToggleState;
  ENABLE_HOSTING_PREFERENCES: ToggleState;
  ENABLE_DASHBOARD_LOGGING: ToggleState;
  ENABLE_MEMORY_PROCESSING_LOGGING: ToggleState;
  ENABLE_RENDERING_LOGGING: ToggleState;
  ENABLE_API_RESPONSE_LOGGING: ToggleState;
  ENABLE_FOLDER_GROUPING_LOGGING: ToggleState;
  ENABLE_MEMORY_GRID_LOGGING: ToggleState;
  ENABLE_USE_EFFECT_LOGGING: ToggleState;
}

// TinyLogger examples
function demonstrateTinyLogger() {
  // plain info
  tinyLogger('app started');

  // auto-detects warn
  tinyLogger('low disk space', { tags: ['warn', 'backend', 'server:api'] });

  // explicit debug
  tinyLogger('rendered dashboard', { tags: ['debug', 'frontend', 'dashboard'] });

  // structured data
  tinyLogger('user uploaded file', {
    tags: ['info', 'upload', 'user:123', 'feature:memory'],
    data: { size: '2 MB', name: 'cat.jpg' },
  });

  // Cross-cutting concern
  tinyLogger('Upload failed, updating dashboard', {
    tags: ['warn', 'backend', 'frontend', 'upload', 'dashboard', 'error'],
    data: { uploadId: '456', error: 'File too large' },
  });

  // User-specific logging
  tinyLogger('User profile updated', {
    tags: ['info', 'backend', 'user:123', 'profile', 'database'],
    data: { changes: ['email', 'avatar'] },
  });
}

export default function LoggerTestPage() {
  // Test tinyLogger on page load
  useEffect(() => {
    console.log('=== TinyLogger Examples ===');
    demonstrateTinyLogger();
  }, []);

  const [testResults, setTestResults] = useState<string[]>([]);
  const [loggerConfig, setLoggerConfig] = useState<LoggerConfig>({
    ENABLE_LOGGING: 'not-set',
    ENABLE_FRONTEND_LOGGING: 'not-set',
    ENABLE_BACKEND_LOGGING: 'not-set',
    ENABLE_UPLOAD_LOGGING: 'not-set',
    ENABLE_DATABASE_LOGGING: 'not-set',
    ENABLE_AUTH_LOGGING: 'not-set',
    ENABLE_ASSET_LOGGING: 'not-set',
    ENABLE_S3_LOGGING: 'not-set',
    ENABLE_ICP_UPLOAD_LOGGING: 'not-set',
    ENABLE_HOSTING_PREFERENCES: 'not-set',
    ENABLE_DASHBOARD_LOGGING: 'not-set',
    ENABLE_MEMORY_PROCESSING_LOGGING: 'not-set',
    ENABLE_RENDERING_LOGGING: 'not-set',
    ENABLE_API_RESPONSE_LOGGING: 'not-set',
    ENABLE_FOLDER_GROUPING_LOGGING: 'not-set',
    ENABLE_MEMORY_GRID_LOGGING: 'not-set',
    ENABLE_USE_EFFECT_LOGGING: 'not-set',
  });

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('logger-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setLoggerConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to parse saved logger config:', error);
      }
    }
  }, []);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('logger-config', JSON.stringify(loggerConfig));
  }, [loggerConfig]);

  const updateConfig = (key: keyof LoggerConfig, value: ToggleState) => {
    setLoggerConfig(prev => ({ ...prev, [key]: value }));
  };

  const cycleToggleState = (key: keyof LoggerConfig) => {
    const currentState = loggerConfig[key];
    const nextState: ToggleState =
      currentState === 'not-set' ? 'enabled' : currentState === 'enabled' ? 'disabled' : 'not-set';
    updateConfig(key, nextState);
  };

  // Three-step toggle component
  const ThreeStepToggle = ({
    state,
    onChange,
    label,
    description,
  }: {
    state: ToggleState;
    onChange: () => void;
    label: string;
    description: string;
  }) => {
    const getStateConfig = (state: ToggleState) => {
      switch (state) {
        case 'not-set':
          return {
            bgColor: 'bg-gray-300',
            text: 'Default',
            textColor: 'text-gray-600',
            icon: '⚪',
          };
        case 'enabled':
          return {
            bgColor: 'bg-green-500',
            text: 'ON',
            textColor: 'text-white',
            icon: '🟢',
          };
        case 'disabled':
          return {
            bgColor: 'bg-red-500',
            text: 'OFF',
            textColor: 'text-white',
            icon: '🔴',
          };
      }
    };

    const config = getStateConfig(state);

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-gray-600">{description}</div>
        </div>
        <button
          onClick={onChange}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${config.bgColor} ${config.textColor} hover:opacity-80`}
        >
          <span className="text-sm">{config.icon}</span>
          <span className="text-sm font-medium">{config.text}</span>
        </button>
      </div>
    );
  };

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBasicLogging = () => {
    addResult('Testing basic logging...');
    addResult(`Master switch: ${loggerConfig.ENABLE_LOGGING}`);

    fatLogger.debug('Debug message', 'fe', { test: 'data' });
    fatLogger.info('Info message', 'fe', { test: 'data' });
    fatLogger.warn('Warning message', 'fe', { test: 'data' });
    fatLogger.error('Error message', 'fe', { test: 'data' });

    addResult('Basic logging tests completed - check console');
  };

  const testServiceLogging = () => {
    addResult('Testing service-specific logging...');

    const uploadLog = fatLogger.service('upload', 'fe');
    const dbLog = fatLogger.service('database', 'be');
    const authLog = fatLogger.service('auth', 'be');
    const appLog = fatLogger.service('app', 'fe');

    uploadLog.debug('Debug with service', { test: 'upload data' });
    dbLog.info('Info with service', { test: 'database data' });
    authLog.warn('Warning with service', { test: 'auth data' });
    appLog.error('Error with service', { test: 'app data' });

    addResult('Service logging tests completed - check console');
  };

  const testSpecializedLoggers = () => {
    addResult('Testing specialized loggers...');

    const uploadLog = fatLogger.service('upload', 'fe');
    const dbLog = fatLogger.service('database', 'be');
    const authLog = fatLogger.service('auth', 'be');

    uploadLog.debug('Upload debug message', { file: 'test.jpg' });
    dbLog.info('Database info message', { query: 'SELECT * FROM users' });
    authLog.warn('Auth warning message', { userId: '123' });
    fatLogger.error('App error message', 'fe', { error: 'Something went wrong' });

    addResult('Specialized logger tests completed - check console');
  };

  const testHostingPreferencesLogger = () => {
    addResult('Testing hosting preferences fatLogger...');

    const hostingLog = fatLogger.service('hosting-preferences', 'fe');

    hostingLog.debug('Hosting preferences debug', {
      backendHosting: 'vercel',
      databaseHosting: ['neon'],
      blobHosting: ['s3'],
    });

    hostingLog.info('Hosting preferences updated', {
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

  const testConfigurationLogging = () => {
    addResult('Testing configuration-based logging...');
    addResult(
      `Current config: Master=${loggerConfig.ENABLE_LOGGING}, Frontend=${loggerConfig.ENABLE_FRONTEND_LOGGING}, Backend=${loggerConfig.ENABLE_BACKEND_LOGGING}`
    );

    // Test different service contexts
    const dashboardLog = fatLogger.service('dashboard', 'fe');
    const dbLog = fatLogger.service('database', 'be');
    const uploadLog = fatLogger.service('upload', 'be');
    const hostingLog = fatLogger.service('hosting-preferences', 'fe');

    dashboardLog.debug('Frontend context test', { test: 'Frontend logging' });
    dbLog.debug('Backend context test', { test: 'Backend logging' });
    uploadLog.debug('Upload service test', { test: 'Upload logging' });
    hostingLog.debug('Hosting preferences test', { test: 'Hosting logging' });

    addResult('Configuration-based logging tests completed - check console');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Logger Configuration & Test Page</h1>

      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click the toggle buttons to cycle through three states:</li>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>
              <strong>⚪ Default</strong> - Uses hardcoded value from fat-fatLogger.ts
            </li>
            <li>
              <strong>🟢 ON</strong> - Override to enable logging
            </li>
            <li>
              <strong>🔴 OFF</strong> - Override to disable logging
            </li>
          </ul>
          <li>Settings are automatically saved to localStorage</li>
          <li>Open browser console (F12 → Console tab)</li>
          <li>Click the test buttons to verify logging</li>
          <li>Changes take effect immediately</li>
        </ol>
      </div>

      {/* Logger Configuration */}
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Logger Configuration</h2>

        {/* Master Switch */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-3">Master Switch</h3>
          <p className="text-sm text-red-600 mb-4">Controls all logging - when OFF, no logs will appear</p>
          <ThreeStepToggle
            state={loggerConfig.ENABLE_LOGGING}
            onChange={() => cycleToggleState('ENABLE_LOGGING')}
            label="Master Logging Control"
            description="Default: Uses hardcoded value from fat-fatLogger.ts"
          />
        </div>

        {/* Core Services */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Core Services</h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'ENABLE_FRONTEND_LOGGING', label: 'Frontend Components', desc: 'Frontend component interactions' },
              { key: 'ENABLE_BACKEND_LOGGING', label: 'Backend API', desc: 'Backend API and processing' },
              { key: 'ENABLE_UPLOAD_LOGGING', label: 'Upload Process', desc: 'File upload routing and processing' },
              { key: 'ENABLE_DATABASE_LOGGING', label: 'Database', desc: 'Database operations' },
              { key: 'ENABLE_AUTH_LOGGING', label: 'Authentication', desc: 'Authentication flows' },
              { key: 'ENABLE_ASSET_LOGGING', label: 'Asset Processing', desc: 'Asset processing and thumbnails' },
              { key: 'ENABLE_S3_LOGGING', label: 'S3 Storage', desc: 'S3 presigned URLs and storage' },
              { key: 'ENABLE_ICP_UPLOAD_LOGGING', label: 'ICP Upload', desc: 'ICP upload and canister interactions' },
            ].map(({ key, label, desc }) => (
              <ThreeStepToggle
                key={key}
                state={loggerConfig[key as keyof LoggerConfig]}
                onChange={() => cycleToggleState(key as keyof LoggerConfig)}
                label={label}
                description={desc}
              />
            ))}
          </div>
        </div>

        {/* Feature Flags */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Feature Flags</h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                key: 'ENABLE_HOSTING_PREFERENCES',
                label: 'Hosting Preferences',
                desc: 'Hosting preference changes and routing',
              },
              { key: 'ENABLE_DASHBOARD_LOGGING', label: 'Dashboard', desc: 'Dashboard state and API calls' },
              {
                key: 'ENABLE_MEMORY_PROCESSING_LOGGING',
                label: 'Memory Processing',
                desc: 'Memory processing and folder grouping',
              },
              { key: 'ENABLE_RENDERING_LOGGING', label: 'Component Rendering', desc: 'Component rendering logs' },
              { key: 'ENABLE_API_RESPONSE_LOGGING', label: 'API Responses', desc: 'API response status and data logs' },
              {
                key: 'ENABLE_FOLDER_GROUPING_LOGGING',
                label: 'Folder Grouping',
                desc: 'Folder grouping and memory processing',
              },
              { key: 'ENABLE_MEMORY_GRID_LOGGING', label: 'Memory Grid', desc: 'MemoryGrid component rendering' },
              { key: 'ENABLE_USE_EFFECT_LOGGING', label: 'useEffect Hooks', desc: 'useEffect hook logs' },
            ].map(({ key, label, desc }) => (
              <ThreeStepToggle
                key={key}
                state={loggerConfig[key as keyof LoggerConfig]}
                onChange={() => cycleToggleState(key as keyof LoggerConfig)}
                label={label}
                description={desc}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const allEnabled: LoggerConfig = {
                ENABLE_LOGGING: 'enabled',
                ENABLE_FRONTEND_LOGGING: 'enabled',
                ENABLE_BACKEND_LOGGING: 'enabled',
                ENABLE_UPLOAD_LOGGING: 'enabled',
                ENABLE_DATABASE_LOGGING: 'enabled',
                ENABLE_AUTH_LOGGING: 'enabled',
                ENABLE_ASSET_LOGGING: 'enabled',
                ENABLE_S3_LOGGING: 'enabled',
                ENABLE_ICP_UPLOAD_LOGGING: 'enabled',
                ENABLE_HOSTING_PREFERENCES: 'enabled',
                ENABLE_DASHBOARD_LOGGING: 'enabled',
                ENABLE_MEMORY_PROCESSING_LOGGING: 'enabled',
                ENABLE_RENDERING_LOGGING: 'enabled',
                ENABLE_API_RESPONSE_LOGGING: 'enabled',
                ENABLE_FOLDER_GROUPING_LOGGING: 'enabled',
                ENABLE_MEMORY_GRID_LOGGING: 'enabled',
                ENABLE_USE_EFFECT_LOGGING: 'enabled',
              };
              setLoggerConfig(allEnabled);
            }}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Enable All
          </button>
          <button
            onClick={() => {
              const allDisabled: LoggerConfig = {
                ENABLE_LOGGING: 'disabled',
                ENABLE_FRONTEND_LOGGING: 'disabled',
                ENABLE_BACKEND_LOGGING: 'disabled',
                ENABLE_UPLOAD_LOGGING: 'disabled',
                ENABLE_DATABASE_LOGGING: 'disabled',
                ENABLE_AUTH_LOGGING: 'disabled',
                ENABLE_ASSET_LOGGING: 'disabled',
                ENABLE_S3_LOGGING: 'disabled',
                ENABLE_ICP_UPLOAD_LOGGING: 'disabled',
                ENABLE_HOSTING_PREFERENCES: 'disabled',
                ENABLE_DASHBOARD_LOGGING: 'disabled',
                ENABLE_MEMORY_PROCESSING_LOGGING: 'disabled',
                ENABLE_RENDERING_LOGGING: 'disabled',
                ENABLE_API_RESPONSE_LOGGING: 'disabled',
                ENABLE_FOLDER_GROUPING_LOGGING: 'disabled',
                ENABLE_MEMORY_GRID_LOGGING: 'disabled',
                ENABLE_USE_EFFECT_LOGGING: 'disabled',
              };
              setLoggerConfig(allDisabled);
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Disable All
          </button>
          <button
            onClick={() => {
              const defaultConfig: LoggerConfig = {
                ENABLE_LOGGING: 'not-set',
                ENABLE_FRONTEND_LOGGING: 'not-set',
                ENABLE_BACKEND_LOGGING: 'not-set',
                ENABLE_UPLOAD_LOGGING: 'not-set',
                ENABLE_DATABASE_LOGGING: 'not-set',
                ENABLE_AUTH_LOGGING: 'not-set',
                ENABLE_ASSET_LOGGING: 'not-set',
                ENABLE_S3_LOGGING: 'not-set',
                ENABLE_ICP_UPLOAD_LOGGING: 'not-set',
                ENABLE_HOSTING_PREFERENCES: 'not-set',
                ENABLE_DASHBOARD_LOGGING: 'not-set',
                ENABLE_MEMORY_PROCESSING_LOGGING: 'not-set',
                ENABLE_RENDERING_LOGGING: 'not-set',
                ENABLE_API_RESPONSE_LOGGING: 'not-set',
                ENABLE_FOLDER_GROUPING_LOGGING: 'not-set',
                ENABLE_MEMORY_GRID_LOGGING: 'not-set',
                ENABLE_USE_EFFECT_LOGGING: 'not-set',
              };
              setLoggerConfig(defaultConfig);
            }}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Reset to Defaults
          </button>
        </div>

        {/* TinyLogger Test Actions */}
        <div className="mt-6 p-4 border rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">TinyLogger Tests</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                console.log('=== TinyLogger Examples ===');
                demonstrateTinyLogger();
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Test TinyLogger
            </button>
            <button
              onClick={() => {
                console.log('=== Only Frontend Logs ===');
                setLoggerFilter(['frontend']);
                demonstrateTinyLogger();
              }}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Filter: Frontend Only
            </button>
            <button
              onClick={() => {
                console.log('=== Only Backend Logs ===');
                setLoggerFilter(['backend']);
                demonstrateTinyLogger();
              }}
              className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
            >
              Filter: Backend Only
            </button>
            <button
              onClick={() => {
                console.log('=== Only Dashboard Logs ===');
                setLoggerFilter(['dashboard']);
                demonstrateTinyLogger();
              }}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Filter: Dashboard Only
            </button>
            <button
              onClick={() => {
                console.log('=== Logger Disabled ===');
                toggleLogger(false);
                demonstrateTinyLogger();
                toggleLogger(true);
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Test: Disabled
            </button>
            <button
              onClick={() => {
                console.log('=== Reset Filter ===');
                setLoggerFilter([]);
                demonstrateTinyLogger();
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Reset Filter
            </button>
          </div>
        </div>
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

        <button
          onClick={testConfigurationLogging}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Configuration
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
        <h2 className="text-lg font-semibold mb-2">How It Works:</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>Runtime Configuration:</strong> The logger now reads settings from localStorage instead of hardcoded
            values. Changes in this UI take effect immediately without code changes.
          </p>
          <p>
            <strong>Persistence:</strong> Your settings are automatically saved to localStorage and restored when you
            reload the page.
          </p>
          <p>
            <strong>Fallback:</strong> If localStorage is unavailable or corrupted, the logger falls back to default
            values defined in <code className="bg-gray-100 px-1 rounded">src/nextjs/src/lib/logger/fat-fatLogger.ts</code>
          </p>
          <p>
            <strong>Server-Side:</strong> On the server (SSR), the logger always uses default values since localStorage
            is not available.
          </p>
        </div>
      </div>
    </div>
  );
}
