CREATE TABLE `activityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`kind` enum('note','source','insight') NOT NULL,
	`content` mediumtext,
	`sourceUrl` varchar(2048),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`fromItemId` int NOT NULL,
	`toItemId` int NOT NULL,
	`label` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledgeLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `knowledge_links_unique` UNIQUE(`ownerId`,`fromItemId`,`toItemId`)
);
--> statement-breakpoint
CREATE TABLE `localAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`recoveryQuestion` varchar(128) NOT NULL,
	`recoveryAnswerHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `localAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `localAccounts_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `localAccounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `presentationSlides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presentationId` int NOT NULL,
	`position` int NOT NULL,
	`title` varchar(240),
	`content` mediumtext,
	`speakerNotes` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `presentationSlides_id` PRIMARY KEY(`id`),
	CONSTRAINT `presentation_slides_position_unique` UNIQUE(`presentationId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `presentations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`status` enum('draft','generating','ready','failed') NOT NULL DEFAULT 'draft',
	`presentonJobId` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `presentations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`parentId` int,
	`path` varchar(1024) NOT NULL,
	`name` varchar(255) NOT NULL,
	`kind` enum('file','directory') NOT NULL,
	`language` varchar(64),
	`content` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectFiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_files_project_path_unique` UNIQUE(`projectId`,`path`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`language` varchar(64),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`projectId` int,
	`title` varchar(240) NOT NULL,
	`description` text,
	`status` enum('todo','in_progress','done') NOT NULL DEFAULT 'todo',
	`dueAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `activityLog` ADD CONSTRAINT `activityLog_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledgeItems` ADD CONSTRAINT `knowledgeItems_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledgeLinks` ADD CONSTRAINT `knowledgeLinks_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledgeLinks` ADD CONSTRAINT `knowledgeLinks_fromItemId_knowledgeItems_id_fk` FOREIGN KEY (`fromItemId`) REFERENCES `knowledgeItems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledgeLinks` ADD CONSTRAINT `knowledgeLinks_toItemId_knowledgeItems_id_fk` FOREIGN KEY (`toItemId`) REFERENCES `knowledgeItems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `localAccounts` ADD CONSTRAINT `localAccounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `presentationSlides` ADD CONSTRAINT `presentationSlides_presentationId_presentations_id_fk` FOREIGN KEY (`presentationId`) REFERENCES `presentations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `presentations` ADD CONSTRAINT `presentations_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectFiles` ADD CONSTRAINT `projectFiles_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_log_owner_created_idx` ON `activityLog` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `knowledge_items_owner_updated_idx` ON `knowledgeItems` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `knowledge_links_to_item_idx` ON `knowledgeLinks` (`toItemId`);--> statement-breakpoint
CREATE INDEX `presentations_owner_updated_idx` ON `presentations` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `project_files_project_parent_idx` ON `projectFiles` (`projectId`,`parentId`);--> statement-breakpoint
CREATE INDEX `projects_owner_updated_idx` ON `projects` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `tasks_owner_status_idx` ON `tasks` (`ownerId`,`status`);