import { queue, type JobProgressData } from "@/bullmq/jobs";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get the job
        const job = await queue.getJob(jobId);

        if (!job) {
          const data = JSON.stringify({ error: "Job not found" });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
          return;
        }

        // Send initial state
        const initialState = await job.getState();
        const progressData = (job.progress as JobProgressData) || {
          progress: 0,
          message: "Starting...",
        };
        const initialData = JSON.stringify({
          state: initialState,
          progress: progressData.progress,
          message: progressData.message,
        });
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

        // If job is already completed or failed, close immediately
        if (initialState === "completed" || initialState === "failed") {
          if (initialState === "failed") {
            const failedData = JSON.stringify({
              state: "failed",
              error: job.failedReason,
            });
            controller.enqueue(encoder.encode(`data: ${failedData}\n\n`));
          }
          controller.close();
          return;
        }

        // Poll for job updates
        const pollInterval = setInterval(async () => {
          try {
            const currentJob = await queue.getJob(jobId);
            if (!currentJob) {
              clearInterval(pollInterval);
              controller.close();
              await queue.close();
              return;
            }

            const state = await currentJob.getState();
            const progressData = (currentJob.progress as JobProgressData) || {
              progress: 0,
              message: "Processing...",
            };

            const data = JSON.stringify({
              state,
              progress: progressData.progress,
              message: progressData.message,
            });

            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Stop polling if job is completed or failed
            if (state === "completed" || state === "failed") {
              if (state === "failed") {
                const failedData = JSON.stringify({
                  state: "failed",
                  error: currentJob.failedReason,
                });
                controller.enqueue(encoder.encode(`data: ${failedData}\n\n`));
              }
              clearInterval(pollInterval);
              controller.close();
            }
          } catch (error) {
            console.error("Error polling job:", error);
            clearInterval(pollInterval);
            const errorData = JSON.stringify({
              error: "Failed to fetch job status",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        }, 500); // Poll every 500ms

        // Clean up on client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(pollInterval);
          controller.close();
        });
      } catch (error) {
        console.error("SSE error:", error);
        const errorData = JSON.stringify({
          error: "Internal server error",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
