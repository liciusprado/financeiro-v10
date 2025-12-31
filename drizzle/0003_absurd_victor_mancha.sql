CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`fieldChanged` varchar(100),
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
