-- Database Schema for Parallel Voting App
-- Created: 2026
-- MySQL 8.0+ compatible
 
-- Disable foreign key checks temporarily
SET foreign_key_checks = 0;
 
-- Drop existing tables if they exist
DROP TABLE IF EXISTS `Votes`;
DROP TABLE IF EXISTS `Candidate`;
DROP TABLE IF EXISTS `Election`;
DROP TABLE IF EXISTS `User`;
DROP TABLE IF EXISTS `Otp`;
 
-- Re-enable foreign key checks
SET foreign_key_checks = 1;
 
-- Users table
CREATE TABLE `User` (
  `userId` int NOT NULL AUTO_INCREMENT,
  `vin` varchar(20) NOT NULL UNIQUE COMMENT 'Voter Identification Number',
  `fullname` varchar(80) NOT NULL,
  `email` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL COMMENT 'Hashed password',
  `role` enum('voter','admin') DEFAULT 'voter' COMMENT 'User role',
  `isActive` tinyint(1) DEFAULT 1 COMMENT 'Account status',
  `emailVerified` tinyint(1) DEFAULT 0 COMMENT 'Email verification status',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  KEY `idx_email` (`email`),
  KEY `idx_vin` (`vin`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts table';
 
-- Elections table
CREATE TABLE `Election` (
  `electionId` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `description` text,
  `type` enum('general','local','special') DEFAULT 'general' COMMENT 'Election type',
  `status` enum('upcoming','active','ended','cancelled') DEFAULT 'upcoming',
  `startTime` datetime NOT NULL,
  `endTime` datetime NOT NULL,
  `maxVotesPerVoter` int DEFAULT 1 COMMENT 'Maximum votes allowed per voter',
  `allowCandidateRegistration` tinyint(1) DEFAULT 0,
  `showRealTimeResults` tinyint(1) DEFAULT 1,
  `totalVoters` int DEFAULT 0 COMMENT 'Total registered voters',
  `totalVotesCast` int DEFAULT 0 COMMENT 'Total votes cast',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`electionId`),
  KEY `idx_status` (`status`),
  KEY `idx_startTime` (`startTime`),
  KEY `idx_endTime` (`endTime`),
  KEY `idx_type` (`type`),
  CONSTRAINT `chk_endTime_after_startTime` CHECK (`endTime` > `startTime`),
  CONSTRAINT `chk_maxVotes_positive` CHECK (`maxVotesPerVoter` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Elections table';
 
-- Candidates table
CREATE TABLE `Candidate` (
  `candidateId` int NOT NULL AUTO_INCREMENT,
  `electionId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `party` varchar(100),
  `platform` text,
  `photoUrl` varchar(255),
  `position` varchar(50) DEFAULT NULL COMMENT 'Specific position (Barangay Captain, Councilor, SK Chairman, SK Councilor)',
  `voteCount` int DEFAULT 0 COMMENT 'Total votes received',
  `isActive` tinyint(1) DEFAULT 1 COMMENT 'Candidate status',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`candidateId`),
  KEY `idx_electionId` (`electionId`),
  KEY `idx_name` (`name`),
  KEY `idx_voteCount` (`voteCount`),
  KEY `idx_position` (`position`),
  FOREIGN KEY (`electionId`) REFERENCES `Election` (`electionId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Candidates table';
 
-- Votes table
CREATE TABLE `Votes` (
  `voteId` int NOT NULL AUTO_INCREMENT,
  `electionId` int NOT NULL,
  `candidateId` int NOT NULL,
  `userId` int NOT NULL,
  `votedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress` varchar(45),
  `userAgent` text,
  `isVerified` tinyint(1) DEFAULT 1 COMMENT 'Vote verification status',
  PRIMARY KEY (`voteId`),
  UNIQUE KEY `unique_user_election` (`userId`, `electionId`) COMMENT 'Prevent duplicate voting',
  KEY `idx_electionId` (`electionId`),
  KEY `idx_candidateId` (`candidateId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_votedAt` (`votedAt`),
  FOREIGN KEY (`electionId`) REFERENCES `Election` (`electionId`) ON DELETE CASCADE,
  FOREIGN KEY (`candidateId`) REFERENCES `Candidate` (`candidateId`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Votes table';
 
-- OTP table for email verification
CREATE TABLE `Otp` (
  `otpId` int NOT NULL AUTO_INCREMENT,
  `email` varchar(50) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `type` enum('registration','password_reset','email_verification') DEFAULT 'email_verification',
  `expiresAt` datetime NOT NULL,
  `isUsed` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otpId`),
  KEY `idx_email` (`email`),
  KEY `idx_otp` (`otp`),
  KEY `idx_expiresAt` (`expiresAt`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTP verification table';
 
-- Create indexes for better performance
CREATE INDEX idx_elections_active ON Election(status, startTime, endTime);
CREATE INDEX idx_candidates_election ON Candidate(electionId, isActive);
CREATE INDEX idx_votes_election_user ON Votes(electionId, userId);
CREATE INDEX idx_votes_candidate ON Votes(candidateId, votedAt);
 
-- Create view for election results
CREATE VIEW `ElectionResults` AS
SELECT 
  e.electionId,
  e.title,
  e.status,
  c.candidateId,
  c.name as candidateName,
  c.party,
  c.voteCount,
  ROUND((c.voteCount / e.totalVotesCast) * 100, 2) as votePercentage,
  RANK() OVER (PARTITION BY e.electionId ORDER BY c.voteCount DESC) as rank
FROM Election e
LEFT JOIN Candidate c ON e.electionId = c.electionId
WHERE e.status IN ('active', 'ended')
ORDER BY e.electionId, c.voteCount DESC;
 
-- Create view for voter statistics
CREATE VIEW `VoterStatistics` AS
SELECT 
  e.electionId,
  e.title,
  e.totalVoters,
  e.totalVotesCast,
  ROUND((e.totalVotesCast / e.totalVoters) * 100, 2) as turnoutPercentage,
  COUNT(DISTINCT v.userId) as uniqueVoters,
  e.startTime,
  e.endTime
FROM Election e
LEFT JOIN Votes v ON e.electionId = v.electionId
GROUP BY e.electionId, e.title, e.totalVoters, e.totalVotesCast, e.startTime, e.endTime;
 
-- Insert default admin user (password: admin123)
INSERT INTO `User` (`vin`, `fullname`, `email`, `password`, `role`, `emailVerified`) 
VALUES ('ADMIN001', 'System Administrator', 'admin@voting.app', '$2b$10$rOzJqQjQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'admin', 1);
 
-- Sample election data (for testing)
INSERT INTO `Election` (`title`, `description`, `type`, `status`, `startTime`, `endTime`, `maxVotesPerVoter`) 
VALUES 
('Barangay Election 2026', 'Barangay-level election for Barangay Captain and Councilors', 'local', 'upcoming', '2026-05-15 07:00:00', '2026-05-15 15:00:00', 8),
('SK Chairman Election 2026', 'Sangguniang Kabataan Chairman election for youth representation', 'special', 'upcoming', '2026-05-15 07:00:00', '2026-05-15 15:00:00', 1),
('SK Councilors Election 2026', 'Sangguniang Kabataan Councilors election for youth representation', 'special', 'upcoming', '2026-05-15 07:00:00', '2026-05-15 15:00:00', 7);
 
-- Sample candidates (for testing)
INSERT INTO `Candidate` (`electionId`, `name`, `description`, `party`, `position`) 
VALUES 
-- Barangay Election candidates (Captain + 7 Councilors)
(1, 'Juan Dela Cruz', 'Experienced community leader with 10+ years service', 'Partido ng Barangay', 'Barangay Captain'),
(1, 'Maria Santos', 'Education advocate and youth development champion', 'Barangay Progressive Party', 'Barangay Councilor'),
(1, 'Carlos Reyes', 'Infrastructure and public services expert', 'Citizens Action Party', 'Barangay Councilor'),
(1, 'Elena Garcia', 'Healthcare and senior citizens welfare advocate', 'Community First Party', 'Barangay Councilor'),
(1, 'Antonio "Tony" Santos', 'Youth empowerment and education reform advocate', 'Youth Alliance Party', 'Barangay Councilor'),
(1, 'Patricia "Pat" Reyes', 'Sports development and skills training champion', 'Kabataan First Movement', 'Barangay Councilor'),
(1, 'Marco "Mark" Villanueva', 'Youth sports development and recreation programs', 'Youth Sports Party', 'Barangay Councilor'),
(1, 'Sarah "Say" Lim', 'Education and scholarship programs advocate', 'Kabataan Edu-First', 'Barangay Councilor'),
-- SK Chairman Election candidates
(2, 'Ricky "Ric" Torres', 'Environmental protection and climate action', 'Green Youth Movement', 'SK Chairman'),
(2, 'Anna "Anne" Cruz', 'Women empowerment and gender equality', 'Young Women\'s Alliance', 'SK Chairman'),
-- SK Councilors Election candidates
(3, 'Dennis "Den" Santos', 'Technology and digital literacy for youth', 'Tech Youth Philippines', 'SK Councilor'),
(3, 'Liza "Li" Garcia', 'Health and wellness programs for young people', 'Healthy Youth Party', 'SK Councilor'),
(3, 'James "Jim" Reyes', 'Arts and culture development advocate', 'Creative Youth Movement', 'SK Councilor'),
(3, 'Roberto "Bert" Mendoza', 'Agricultural development and rural youth programs', 'Kabataan Farmers Alliance', 'SK Councilor'),
(3, 'Catherine "Cathy" Flores', 'Senior citizens welfare and elderly care programs', 'Elderly Care Youth Party', 'SK Councilor'),
(3, 'Michael "Mike" Tan', 'Business and entrepreneurship development for youth', 'Young Entrepreneurs Party', 'SK Councilor');
 
-- Create trigger to update vote count when a vote is cast
DELIMITER $$
CREATE TRIGGER `update_vote_count` 
AFTER INSERT ON `Votes`
FOR EACH ROW
BEGIN
    UPDATE `Candidate` 
    SET `voteCount` = `voteCount` + 1 
    WHERE `candidateId` = NEW.`candidateId`;
 
    UPDATE `Election` 
    SET `totalVotesCast` = `totalVotesCast` + 1 
    WHERE `electionId` = NEW.`electionId`;
END$$
DELIMITER ;
 
-- Create trigger to update vote count when a vote is deleted
DELIMITER $$
CREATE TRIGGER `update_vote_count_delete` 
AFTER DELETE ON `Votes`
FOR EACH ROW
BEGIN
    UPDATE `Candidate` 
    SET `voteCount` = GREATEST(`voteCount` - 1, 0) 
    WHERE `candidateId` = OLD.`candidateId`;
 
    UPDATE `Election` 
    SET `totalVotesCast` = GREATEST(`totalVotesCast` - 1, 0) 
    WHERE `electionId` = OLD.`electionId`;
END$$
DELIMITER ;
 
-- Create stored procedure for getting election results
DELIMITER $$
CREATE PROCEDURE `GetElectionResults`(IN election_id INT)
BEGIN
    SELECT 
        c.candidateId,
        c.name,
        c.party,
        c.voteCount,
        ROUND((c.voteCount / e.totalVotesCast) * 100, 2) as percentage,
        RANK() OVER (ORDER BY c.voteCount DESC) as rank
    FROM Candidate c
    JOIN Election e ON c.electionId = e.electionId
    WHERE c.electionId = election_id
    ORDER BY c.voteCount DESC;
END$$
DELIMITER ;
 
-- Create stored procedure for checking if user voted
DELIMITER $$
CREATE PROCEDURE `CheckUserVote`(IN user_id INT, IN election_id INT)
BEGIN
    SELECT 
        CASE 
            WHEN EXISTS(SELECT 1 FROM Votes WHERE userId = user_id AND electionId = election_id) 
            THEN 1 
            ELSE 0 
        END as hasVoted;
END$$
DELIMITER ;