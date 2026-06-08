export interface RouteDef {
	method: string;
	pattern: string;
	handler: (
		req: Request,
		params: Record<string, string>,
		url: URL,
	) => Response | Promise<Response>;
}

type CompiledRoute = {
	method: string;
	regex: RegExp;
	paramNames: string[];
	handler: RouteDef["handler"];
};

export type RouteResolver = (
	method: string,
	pathname: string,
) => {
	handler: RouteDef["handler"];
	params: Record<string, string>;
} | null;

export function compileRoutes(routes: RouteDef[]): RouteResolver {
	const compiled: CompiledRoute[] = routes.map((r) => {
		const paramNames: string[] = [];
		const regexStr = r.pattern.replace(/:(\w+)/g, (_, name: string) => {
			paramNames.push(name);
			return "([^/]+)";
		});
		return {
			method: r.method,
			regex: new RegExp(`^${regexStr}$`),
			paramNames,
			handler: r.handler,
		};
	});

	return (method: string, pathname: string) => {
		for (const r of compiled) {
			if (r.method !== method) continue;
			const match = pathname.match(r.regex);
			if (!match) continue;
			const params: Record<string, string> = {};
			for (let i = 0; i < r.paramNames.length; i++) {
				const name = r.paramNames[i];
				const value = match[i + 1];
				if (name && value !== undefined) params[name] = value;
			}
			return { handler: r.handler, params };
		}
		return null;
	};
}
