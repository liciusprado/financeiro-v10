CREATE TABLE `notifications_sent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`notification_type` varchar(50) NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`message` text,
	CONSTRAINT `notifications_sent_id` PRIMARY KEY(`id`)
);
