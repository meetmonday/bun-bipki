import env from "env-var";

export const config = {
	NODE_ENV: env
		.get("NODE_ENV")
		.default("development")
		.asEnum(["production", "test", "development"]),
	BOT_TOKEN: env.get("BOT_TOKEN").required().asString(),

	DATABASE_URL: env.get("DATABASE_URL").required().asString(),

	ADMIN_IDS: env
		.get("ADMIN_IDS")
		.default("")
		.asArray(",")
		.map((id) => Number.parseInt(id.trim(), 10))
		.filter((id) => !Number.isNaN(id)),
};
