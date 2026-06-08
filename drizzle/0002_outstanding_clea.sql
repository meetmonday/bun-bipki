CREATE TABLE `game_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`game` text NOT NULL,
	`bet` integer NOT NULL,
	`currency` text DEFAULT 'bipki' NOT NULL,
	`choice` text,
	`win` integer NOT NULL,
	`payout` integer NOT NULL,
	`created_at` text
);
