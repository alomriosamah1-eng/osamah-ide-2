ALTER TABLE `localAccounts` DROP INDEX `localAccounts_email_unique`;--> statement-breakpoint
ALTER TABLE `localAccounts` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `localAccounts` ADD `accountKey` varchar(64);--> statement-breakpoint
UPDATE `localAccounts` SET `accountKey` = UUID() WHERE `accountKey` IS NULL;--> statement-breakpoint
ALTER TABLE `localAccounts` MODIFY COLUMN `accountKey` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `localAccounts` ADD CONSTRAINT `localAccounts_accountKey_unique` UNIQUE(`accountKey`);
