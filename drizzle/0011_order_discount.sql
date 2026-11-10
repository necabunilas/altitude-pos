ALTER TABLE `orders` ADD `discount_type` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_party` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_id_no` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_cents` integer DEFAULT 0 NOT NULL;