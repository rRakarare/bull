"use client";

import { runBull } from "./action";

function Submit() {
	const handleSubmit = async () => {
		await runBull();
	};

	return (
		// biome-ignore lint/a11y/useButtonType: <explanation>
		<button className="bg-red-600" onClick={handleSubmit}>
			Submit Job
		</button>
	);
}

export default Submit;
