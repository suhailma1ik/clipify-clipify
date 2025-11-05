import { useState, useCallback, useRef } from "react";
import { notificationService } from "../services/notificationService";

export type NotificationType = "success" | "error" | "info";

export interface Notification {
  message: string;
  type: NotificationType;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback(
    async (message: string, type: NotificationType = "info") => {
      // Clear any existing timeout before showing new notification
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setNotification({ message, type });

      // Send system notification asynchronously (fire-and-forget)
      (async () => {
        try {
          await notificationService.initialize();
          switch (type) {
            case "success":
              await notificationService.success("Clipify", message);
              break;
            case "error":
              await notificationService.error("Clipify", message);
              break;
            default:
              await notificationService.info("Clipify", message);
              break;
          }
        } catch (error) {
          console.error("Failed to send system notification:", error);
        }
      })();

      // Set new auto-hide timeout and store its ID
      timeoutRef.current = setTimeout(() => {
        setNotification(null);
      }, 5000);
    },
    []
  );

  const clearNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    clearNotification,
  };
};
