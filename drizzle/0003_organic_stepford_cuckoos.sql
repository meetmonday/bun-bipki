ALTER TABLE `users` ADD `updated_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `game_log_user_idx` ON `game_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `tx_from_user_idx` ON `transactions` (`from_user_id`);--> statement-breakpoint
CREATE INDEX `tx_to_user_idx` ON `transactions` (`to_user_id`);--> statement-breakpoint
CREATE INDEX `tx_created_at_idx` ON `transactions` (`created_at`);