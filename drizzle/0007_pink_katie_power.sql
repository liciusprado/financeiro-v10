CREATE TABLE `investment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`external_id` varchar(100) NOT NULL,
	`link_id` varchar(100),
	`date` varchar(20) NOT NULL,
	`instrument` varchar(50),
	`quantity` varchar(50),
	`gross_value` varchar(50),
	`net_value` varchar(50),
	`operation_type` varchar(20),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investment_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webauthn_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`credential_id` varchar(200) NOT NULL,
	`public_key` text NOT NULL,
	`sign_count` int NOT NULL DEFAULT 0,
	`label` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webauthn_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `icon` varchar(50);--> statement-breakpoint
ALTER TABLE `categories` ADD `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `categories` ADD `budget_group` enum('fixed','variable','nonMonthly','needs','wants','savings') DEFAULT 'variable';--> statement-breakpoint
ALTER TABLE `entries` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `reviewRequested` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `items` ADD `dueDay` int;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `budget_method` enum('categories','groups','50-30-20','envelopes') DEFAULT 'categories';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `two_factor_enabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `two_factor_code_hash` varchar(128);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `two_factor_expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `two_factor_secret` varchar(255);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `web_authn_enabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `investment_transactions` ADD CONSTRAINT `investment_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webauthn_credentials` ADD CONSTRAINT `webauthn_credentials_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;