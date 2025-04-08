import Bugsnag from "@bugsnag/js";
import BugsnagPerformance from "@bugsnag/browser-performance";

const initializeErrorTracking = () => {
  const config = {
    apiKey: import.meta.env.VITE_BUGSNAG_API_KEY,
  };

  Bugsnag.start(config);
  BugsnagPerformance.start(config);
};

export { Bugsnag, BugsnagPerformance, initializeErrorTracking };
