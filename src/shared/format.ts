export function fmtId(id: number | string): string {
	return String(id).replace(/\B(?=(\d{3})+(?!\d))/g, "-");
}

export function parseId(raw: string): number {
	return Number(raw.replace(/-/g, ""));
}
