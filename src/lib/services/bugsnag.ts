/**
 * Bugsnag Service Module
 *
 * This module provides error tracking and performance monitoring functionality using Bugsnag.
 * It initializes both the error tracking and performance monitoring services with the
 * appropriate configuration from environment variables.
 *
 * The module exports:
 * - Bugsnag: For error tracking and reporting
 * - BugsnagPerformance: For monitoring application performance metrics
 * - initializeErrorTracking: Function to initialize both services
 */

import Bugsnag from "@bugsnag/js";
import BugsnagPerformance from "@bugsnag/browser-performance";

/**
 * Initializes Bugsnag error tracking and performance monitoring services
 *
 * This function configures and starts both the error tracking and performance
 * monitoring services using the API key from environment variables.
 */
const initializeErrorTracking = () => {
  const config = {
    apiKey: import.meta.env.VITE_BUGSNAG_API_KEY,
  };

  Bugsnag.start(config);
  BugsnagPerformance.start(config);
};

export { Bugsnag, BugsnagPerformance, initializeErrorTracking };
