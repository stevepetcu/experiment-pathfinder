export const logDebug = (...message: unknown[]) => {
  if (import.meta.env.VITE_LOG_DEBUG_ENABLED === 'true') {
    console.debug(...message);
  }
};

export const logError = (...message: unknown[]) => {
  if (import.meta.env.VITE_LOG_ERROR_ENABLED === 'true') {
    console.error(...message);
  }
};
