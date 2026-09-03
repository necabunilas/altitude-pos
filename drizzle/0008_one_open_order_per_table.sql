-- Enforce one active (open, non-cancelled) order per table at the database
-- level, so concurrent inserts can't create duplicate bills for a table.
CREATE UNIQUE INDEX IF NOT EXISTS `orders_one_open_per_table`
  ON `orders` (`table_id`)
  WHERE `closed_at` IS NULL AND `status` <> 'cancelled';