/**
 * New Relic Agent Configuration
 * 
 * This file configures the New Relic Node.js agent for application monitoring.
 * The agent automatically instruments Express.js and tracks performance metrics.
 * 
 * To enable New Relic monitoring:
 * 1. Set NEW_RELIC_LICENSE_KEY environment variable
 * 2. Set NEW_RELIC_APP_NAME environment variable (optional, defaults to package name)
 * 3. Set NEW_RELIC_ENABLED=true (optional, defaults to true if license key is set)
 * 
 * The agent will be disabled if NEW_RELIC_ENABLED=false or if license key is missing.
 */

'use strict';

/**
 * New Relic configuration
 * Most settings can be overridden via environment variables
 */
exports.config = {
  /**
   * Application name shown in New Relic dashboard
   * Default: package.json name or "Node Application"
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'gocomet-leaderboard-backend'],

  /**
   * License key from New Relic account
   * Required for agent to function
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY || '',

  /**
   * Enable/disable the agent
   * Set to false to disable monitoring (useful for local development)
   */
  agent_enabled: process.env.NEW_RELIC_ENABLED !== 'false' && !!process.env.NEW_RELIC_LICENSE_KEY,

  /**
   * Logging configuration
   * - 'trace': Most verbose, includes all agent activity
   * - 'debug': Debug information
   * - 'info': General information (default)
   * - 'warn': Warnings only
   * - 'error': Errors only
   * - 'fatal': Fatal errors only
   */
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: process.env.NEW_RELIC_LOG_FILE || 'stdout'
  },

  /**
   * Application environment
   * Affects data sampling and feature availability
   */
  environment: process.env.NODE_ENV || 'development',

  /**
   * Error collection
   * Automatically captures and reports errors
   */
  error_collector: {
    enabled: true,
    capture_events: true,
    max_event_samples_stored: 100
  },

  /**
   * Transaction tracer
   * Tracks slow transactions and database queries
   */
  transaction_tracer: {
    enabled: true,
    record_sql: 'obfuscated', // Options: 'raw', 'obfuscated', 'off'
    explain_threshold: 500, // Explain queries slower than 500ms
    stack_trace_threshold: 500 // Include stack traces for queries > 500ms
  },

  /**
   * Slow query logging
   * Automatically instruments MySQL queries
   */
  slow_sql: {
    enabled: true,
    max_samples: 10
  },

  /**
   * Browser monitoring
   * Tracks frontend performance (disabled for API-only backend)
   */
  browser_monitoring: {
    enable: false
  },

  /**
   * Distributed tracing
   * Tracks requests across services
   */
  distributed_tracing: {
    enabled: process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED === 'true'
  },

  /**
   * Application logging
   * Forward application logs to New Relic
   */
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000
    },
    local_decorating: {
      enabled: false
    }
  },

  /**
   * Custom attributes
   * Add custom metadata to all transactions
   */
  attributes: {
    enabled: true,
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-api-key'
    ]
  }
};
