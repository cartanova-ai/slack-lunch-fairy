CREATE TABLE `menu_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_post_id` integer NOT NULL,
	`channel_id` text NOT NULL,
	`message_ts` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`menu_post_id`) REFERENCES `menu_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`menu_text` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menu_posts_date_unique` ON `menu_posts` (`date`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_message_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`menu_message_id`) REFERENCES `menu_messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`notify_time` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_channel_id_unique` ON `subscriptions` (`channel_id`);