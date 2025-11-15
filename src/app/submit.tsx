"use client";

import { useState } from "react";
import { runBull } from "./action";
import { useJobStatus } from "@/hooks/useJobStatus";

function Submit() {
	const [jobId, setJobId] = useState<string | null>(null);
	const { state, progress, message, error, isConnected } = useJobStatus(jobId);

	const handleSubmit = async () => {
		const result = await runBull();
		setJobId(result.jobId as string);
	};

	const resetJob = () => {
		setJobId(null);
	};

	return (
		<div className="space-y-4">
			<button
				type="button"
				className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
				onClick={handleSubmit}
				disabled={!!jobId && state !== "completed" && state !== "failed"}
			>
				{jobId && state !== "completed" && state !== "failed"
					? "Processing..."
					: "Submit Job"}
			</button>

			{jobId && (
				<div className="mt-4 p-4 border rounded-lg bg-gray-50">
					<div className="mb-2">
						<p className="text-sm text-gray-600">
							Job ID: <span className="font-mono text-xs">{jobId}</span>
						</p>
					</div>

					{error ? (
						<div className="text-red-600 font-semibold">Error: {error}</div>
					) : (
						<>
							<div className="mb-2">
								<div className="flex justify-between mb-1">
									<span className="text-sm font-medium text-gray-700">
										{message}
									</span>
									<span className="text-sm font-medium text-gray-700">
										{progress}%
									</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-2.5">
									<div
										className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
										style={{ width: `${progress}%` }}
									/>
								</div>
							</div>

							<div className="flex items-center gap-2 text-sm">
								<span
									className={`inline-block w-2 h-2 rounded-full ${
										isConnected ? "bg-green-500" : "bg-gray-400"
									}`}
								/>
								<span className="text-gray-600">
									Status: <span className="font-semibold">{state || "waiting"}</span>
								</span>
							</div>

							{(state === "completed" || state === "failed") && (
								<button
									type="button"
									className="mt-3 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
									onClick={resetJob}
								>
									Submit Another Job
								</button>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

export default Submit;
