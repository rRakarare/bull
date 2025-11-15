import { Queue } from "bullmq";
import { redis } from "@/db/redis/config";
import { NextRequest } from "next/server";

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
      const queue = new Queue("main", { connection: redis });

      try {
        // Get the job
        const job = await queue.getJob(jobId);

        if (!job) {
          const data = JSON.stringify({ error: "Job not found" });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
          await queue.close();
          return;
        }

        // Send initial state
        const initialState = await job.getState();
        const initialProgress = job.progress || { progress: 0, message: "Starting..." };
        const initialData = JSON.stringify({
          state: initialState,
          progress: typeof initialProgress === "object" ? initialProgress.progress : 0,
          message:
            typeof initialProgress === "object"
              ? initialProgress.message
              : "Starting...",
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
          await queue.close();
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
            const progress = currentJob.progress || {
              progress: 0,
              message: "Processing...",
            };

            const data = JSON.stringify({
              state,
              progress: typeof progress === "object" ? progress.progress : progress,
              message:
                typeof progress === "object" ? progress.message : "Processing...",
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
              await queue.close();
            }
          } catch (error) {
            console.error("Error polling job:", error);
            clearInterval(pollInterval);
            const errorData = JSON.stringify({
              error: "Failed to fetch job status",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
            await queue.close();
          }
        }, 500); // Poll every 500ms

        // Clean up on client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(pollInterval);
          controller.close();
          queue.close();
        });
      } catch (error) {
        console.error("SSE error:", error);
        const errorData = JSON.stringify({
          error: "Internal server error",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
        await queue.close();
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
