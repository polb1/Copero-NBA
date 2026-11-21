-- Tablas de Better Auth (user, session, account, verification) y guest, generadas desde src/db/schema.ts
-- con drizzle-kit export. IF NOT EXISTS: en remoto ya existen y esta migración no las toca.

CREATE TABLE IF NOT EXISTS `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `guest` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`claimed_by` text,
	`claimed_at` integer,
	FOREIGN KEY (`claimed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE TABLE IF NOT EXISTS `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);

CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);

CREATE INDEX IF NOT EXISTS `session_userId_idx` ON `session` (`user_id`);

CREATE INDEX IF NOT EXISTS `account_userId_idx` ON `account` (`user_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_account_provider_account` ON `account` (`provider_id`,`account_id`);

CREATE INDEX IF NOT EXISTS `verification_identifier_idx` ON `verification` (`identifier`);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_verification_identifier_value` ON `verification` (`identifier`,`value`);

CREATE INDEX IF NOT EXISTS `idx_guest_claimed_by` ON `guest` (`claimed_by`);
