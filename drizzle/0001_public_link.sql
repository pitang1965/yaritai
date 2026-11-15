ALTER TABLE `items` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `pub_on` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `pub_scope` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `pub_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `pub_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `settings_pub_token_unique` ON `settings` (`pub_token`);