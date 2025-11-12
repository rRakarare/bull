import { type JobDefinition } from "./registry";

/**
 * Central Job Registry
 * Define all your job types here for type safety across the application
 *
 * Usage:
 * 1. Add your job type to this interface with data and result types
 * 2. Register the processor in the workers file
 * 3. Use queue.add with full type safety
 *
 * Example:
 * 'send-email': JobDefinition<
 *   { to: string; subject: string; body: string },
 *   { messageId: string }
 * >;
 */
export interface AppJobRegistry {
  'test-job': JobDefinition<
    { message: string },
    void
  >;

  // Add more job types here:
  // 'send-email': JobDefinition<
  //   { to: string; subject: string; body: string },
  //   { messageId: string }
  // >;
  // 'process-upload': JobDefinition<
  //   { fileId: string; userId: string },
  //   { processedRows: number }
  // >;
}
