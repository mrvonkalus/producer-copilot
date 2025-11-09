CREATE TABLE `usageTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`usageType` enum('audioAnalysis','midiGeneration','stemSeparation') NOT NULL,
	`conversationId` int,
	`resourceId` int,
	`cost` int NOT NULL,
	`month` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usageTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','pro','pro_plus') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','trialing');--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionEndsAt` timestamp;