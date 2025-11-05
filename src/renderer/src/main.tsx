import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeApiClient } from "./services/apiClient";
import { environmentConfig } from "./services/environmentService";
import { initializeLogging } from "./services/loggingService";
import { notificationService } from "./services/notificationService";

initializeLogging(environmentConfig.environment);
initializeApiClient(environmentConfig.api);

// Initialize notification service early to ensure background notifications work
notificationService.initialize().catch(error => {
  console.error('Failed to initialize notification service:', error);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
