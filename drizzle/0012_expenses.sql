CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spent_on` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
