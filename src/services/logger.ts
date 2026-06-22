import pino from "pino";
import { config } from "../config.ts";

const level = config.NODE_ENV === "production" ? "info" : "debug";

export const logger = pino({
	level,
	transport:
		config.NODE_ENV === "development"
			? { target: "pino/file", options: { destination: 1 } }
			: undefined,
});

export type Logger = typeof logger;
