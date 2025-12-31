CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('income','expense','investment') NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT 'blue',
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`userId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`person` enum('licius','marielly') NOT NULL,
	`plannedValue` int NOT NULL DEFAULT 0,
	`actualValue` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `entries` ADD CONSTRAINT `entries_itemId_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entries` ADD CONSTRAINT `entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;