CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`language` enum('ar','en') NOT NULL DEFAULT 'ar',
	`theme` enum('dark','light') NOT NULL DEFAULT 'dark',
	`emailNotifications` int NOT NULL DEFAULT 1,
	`desktopNotifications` int NOT NULL DEFAULT 1,
	`agentMode` enum('guided','review','manual') NOT NULL DEFAULT 'guided',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `userPreferences` ADD CONSTRAINT `userPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;