import { useEffect, useState, useRef } from "react";

export type JobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused";

export interface JobStatus {
  state: JobState | null;
  progress: number;
  message: string;
  error: string | null;
  isConnected: boolean;
}

export function useJobStatus(jobId: string | null): JobStatus {
  const [status, setStatus] = useState<JobStatus>({
    state: null,
    progress: 0,
    message: "Waiting to start...",
    error: null,
    isConnected: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!jobId) {
      setStatus({
        state: null,
        progress: 0,
        message: "Waiting to start...",
        error: null,
        isConnected: false,
      });
      return;
    }

    const connectSSE = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`/api/jobs/${jobId}/subscribe`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        setStatus((prev) => ({ ...prev, isConnected: true }));
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            setStatus((prev) => ({
              ...prev,
              error: data.error,
              isConnected: false,
            }));
            eventSource.close();
            return;
          }

          setStatus({
            state: data.state,
            progress: data.progress ?? 0,
            message: data.message ?? "Processing...",
            error: null,
            isConnected: true,
          });

          // Close connection when job is completed or failed
          if (data.state === "completed" || data.state === "failed") {
            console.log(`Job ${data.state}, closing SSE connection`);
            eventSource.close();
          }
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource.close();

        setStatus((prev) => ({
          ...prev,
          error: "Failed to connect after multiple attempts",
          isConnected: false,
        }));
      };
    };

    connectSSE();

    // Cleanup on unmount or jobId change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [jobId]);

  return status;
}
