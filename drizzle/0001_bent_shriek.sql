CREATE TABLE `chat_members` (
	`chat_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text,
	PRIMARY KEY(`chat_id`, `user_id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `daily_reward_streak` integer DEFAULT 0 NOT NULL;