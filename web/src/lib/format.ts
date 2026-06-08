export function fmtId(id: number | string): string {
	return String(id).replace(/\B(?=(\d{3})+(?!\d))/g, "-");
}

export function parseId(raw: string): number {
	return Number(raw.replace(/-/g, ""));
}

export function formatIdInput(value: string): string {
	const digits = value.replace(/\D/g, "");
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, "-");
}

export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(ta);
		return ok;
	}
}
