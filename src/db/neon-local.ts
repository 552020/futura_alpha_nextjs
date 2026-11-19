import { neonConfig } from '@neondatabase/serverless';

/**
 * Route the neon-http driver to the local proxy from docker-compose.dev.yml
 * when the connection string points at localhost. Every other host keeps the
 * driver's default endpoint, so cloud Neon behaves exactly as before.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const LOCAL_PROXY_PORT = process.env.NEON_LOCAL_PROXY_PORT ?? '4444';
const defaultFetchEndpoint = neonConfig.fetchEndpoint;

neonConfig.fetchEndpoint = (host, port, options) => {
  if (LOCAL_HOSTS.has(host)) return `http://${host}:${LOCAL_PROXY_PORT}/sql`;
  return typeof defaultFetchEndpoint === 'function'
    ? defaultFetchEndpoint(host, port, options)
    : defaultFetchEndpoint;
};
