ALTER TABLE `order_items` ADD `status` text DEFAULT 'placed' NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `round` integer DEFAULT 1 NOT NULL;