CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_user_id` integer,
	`to_user_id` integer,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`username` text,
	`start_parameter` text,
	`language_code` text,
	`bipki` integer DEFAULT 0 NOT NULL,
	`megabipki` integer DEFAULT 0 NOT NULL,
	`last_daily_bonus` text,
	`created_at` text
);
