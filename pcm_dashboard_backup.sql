/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.6-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: pcm_dashboard
-- ------------------------------------------------------
-- Server version	11.8.6-MariaDB-5ubuntu0.1 from Ubuntu

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `daily_progress`
--

DROP TABLE IF EXISTS `daily_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_progress` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `prog_date` date DEFAULT NULL,
  `scope` varchar(255) NOT NULL,
  `qty` decimal(12,2) DEFAULT NULL,
  `team` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_progress`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `daily_progress` WRITE;
/*!40000 ALTER TABLE `daily_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_progress` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `drawings`
--

DROP TABLE IF EXISTS `drawings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `drawings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `drawing_no` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `line_no` varchar(255) DEFAULT NULL,
  `line_service` varchar(255) DEFAULT NULL,
  `material_spec` varchar(255) DEFAULT NULL,
  `size_range` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `sheet` varchar(255) DEFAULT NULL,
  `rev` varchar(255) NOT NULL DEFAULT '0',
  `total_dia_inch` decimal(10,2) DEFAULT NULL,
  `total_joints` int(10) unsigned DEFAULT NULL,
  `scan_path` varchar(255) DEFAULT NULL,
  `distributed_to` varchar(255) DEFAULT NULL,
  `distribution_date` date DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `drawings_project_id_foreign` (`project_id`),
  CONSTRAINT `drawings_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drawings`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `drawings` WRITE;
/*!40000 ALTER TABLE `drawings` DISABLE KEYS */;
INSERT INTO `drawings` VALUES
(1,1,'2428-M-15-MPP-AB-SHT1','Main Process Piping Isometric Sheet 1','MPP-AB',NULL,NULL,NULL,'MPP',NULL,'0',NULL,NULL,NULL,NULL,NULL,'active','2026-10-12 04:51:18','2026-10-12 19:54:55');
/*!40000 ALTER TABLE `drawings` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` varchar(255) NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `hse_logs`
--

DROP TABLE IF EXISTS `hse_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `hse_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `log_date` date DEFAULT NULL,
  `kind` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `action_taken` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hse_logs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `hse_logs` WRITE;
/*!40000 ALTER TABLE `hse_logs` DISABLE KEYS */;
INSERT INTO `hse_logs` VALUES
(6,'2026-10-12','TBM','Daily Tool-box Talk: Penggunaan APD & Keselamatan Pengelasan Pipa','Semua personil diinspeksi APD lengkap dan izin kerja (PTW) diverifikasi.','closed','2026-10-12 19:09:18','2026-10-12 19:09:18'),
(7,'2026-10-11','INSPECTION','Pemeriksaan Tabung Gas Asetilen & Oksigen Workshop','Flashback arrestor terpasang dengan baik.','closed','2026-10-12 19:09:18','2026-10-12 19:09:18');
/*!40000 ALTER TABLE `hse_logs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `inspections`
--

DROP TABLE IF EXISTS `inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspections` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `joint_id` bigint(20) unsigned DEFAULT NULL,
  `kind` varchar(255) NOT NULL,
  `result` varchar(255) DEFAULT NULL,
  `defect_type` varchar(255) DEFAULT NULL,
  `report_no` varchar(255) DEFAULT NULL,
  `insp_date` date DEFAULT NULL,
  `inspector` varchar(255) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inspections_joint_id_foreign` (`joint_id`),
  CONSTRAINT `inspections_joint_id_foreign` FOREIGN KEY (`joint_id`) REFERENCES `joints` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspections`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `inspections` WRITE;
/*!40000 ALTER TABLE `inspections` DISABLE KEYS */;
/*!40000 ALTER TABLE `inspections` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` smallint(5) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `joints`
--

DROP TABLE IF EXISTS `joints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `joints` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawing_no` varchar(255) NOT NULL,
  `line_no` varchar(255) DEFAULT NULL,
  `spool_no` varchar(255) DEFAULT NULL,
  `seq` int(10) unsigned DEFAULT NULL,
  `item_a` varchar(255) DEFAULT NULL,
  `spec_a` varchar(255) DEFAULT NULL,
  `item_b` varchar(255) DEFAULT NULL,
  `spec_b` varchar(255) DEFAULT NULL,
  `size_in` decimal(8,2) DEFAULT NULL,
  `shop_field` varchar(255) NOT NULL DEFAULT 'Shop',
  `joint_type` varchar(255) DEFAULT NULL,
  `method` varchar(255) DEFAULT NULL,
  `wps` varchar(255) DEFAULT NULL,
  `welder` varchar(255) DEFAULT NULL,
  `fit_date` date DEFAULT NULL,
  `weld_date` date DEFAULT NULL,
  `visual` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'FITUP_OK',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `joints`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `joints` WRITE;
/*!40000 ALTER TABLE `joints` DISABLE KEYS */;
INSERT INTO `joints` VALUES
(1,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,1,'Flange SO-RF','A105','Pipe','A106-B',2.00,'Shop','SW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(2,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,2,'Pipe','A106-B','Elbow 90 LR','A234 WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 06:21:56'),
(3,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,3,'Elbow 90 LR','A234-WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(4,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,4,'Pipe','A106-B','Elbow 90 LR','A234-WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(5,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,5,'Elbow 90 LR','A234-WPB','Elbow 90 LR','A234-WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(6,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,6,'Elbow 90 LR','A234-WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(7,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,7,'Pipe','A106-B','Flange SO-RF','A105',2.00,'Shop','SW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(8,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,8,'Flange SO-RF','A105','Pipe','A106-B',2.00,'Shop','SW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(9,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,9,'Pipe','A106-B','Elbow 45 LR','A234 WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(10,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,10,'Elbow 45 LR','A234 WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(11,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,11,'Pipe','A106-B','Elbow 45 LR','A234 WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(12,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,12,'Elbow 45 LR','A234 WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(13,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,13,'Pipe','A106-B','Elbow 90 LR','A234 WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(14,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,14,'Elbow 90 LR','A234 WPB','Equal Tee','A234 WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(15,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,15,'Equal Tee','A234 WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-06','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(16,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,16,'Equal Tee','A234 WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05',NULL,'','WELDED','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(17,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,17,'Pipe','A106-B','Pipe','A106-B',2.00,'Field','BW','GTAW',NULL,'W-007',NULL,NULL,'','WELDED','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(18,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,18,'Pipe','A106-B','Equal Tee','A234 WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-07','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(19,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,19,'Equal Tee','A234 WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-07','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(20,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,20,'Pipe','A106-B','Elbow 90 LR','A234-WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-07','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(21,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,21,'Elbow 90 LR','A234-WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-07','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(22,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,22,'Pipe','A106-B','Flange SO-RF','A105',2.00,'Shop','SW','GTAW',NULL,'W-005','2026-07-05','2026-07-07','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(23,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,23,'Equal Tee','A234 WPB','Elbow 90 LR','A234-WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-07','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(24,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,24,'Elbow 90 LR','A234-WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-07','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(25,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,25,'Pipe','A106-B','Pipe','A106-B',2.00,'Field','BW','GTAW',NULL,'W-007',NULL,NULL,'','WELDED','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(26,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,26,'Pipe','A106-B','Pipe','A106-B',2.00,'Field','BW','GTAW',NULL,'W-007',NULL,NULL,'','WELDED','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(27,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,27,'Pipe','A106-B','Elbow 90 LR','A234-WPB',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-08','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18'),
(28,'2428-M-15-MPP-AB-SHT1','MPP-AB',NULL,28,'Elbow 90 LR','A234-WPB','Pipe','A106-B',2.00,'Shop','BW','GTAW',NULL,'W-005','2026-07-05','2026-07-08','PASS','VISUAL_OK','2026-10-12 04:51:18','2026-10-12 04:51:18');
/*!40000 ALTER TABLE `joints` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES
(1,'0001_01_01_000000_create_users_table',1),
(2,'0001_01_01_000001_create_cache_table',1),
(3,'0001_01_01_000002_create_jobs_table',1),
(4,'2026_10_12_114147_create_personal_access_tokens_table',1),
(5,'2026_10_12_114212_create_projects_table',1),
(6,'2026_10_12_114213_create_drawings_table',1),
(7,'2026_10_12_114214_create_joints_table',1),
(8,'2026_10_12_114215_create_stock_moves_table',1),
(9,'2026_10_12_114216_create_inspections_table',1),
(10,'2026_10_12_114217_create_test_packages_table',1),
(11,'2026_10_12_114218_create_hse_logs_table',1),
(12,'2026_10_12_114219_create_scopes_table',1),
(13,'2026_10_12_114220_create_daily_progress_table',1),
(14,'2026_10_12_114844_add_role_to_users_table',1),
(15,'2026_10_12_200000_add_frontend_contract_fields',2),
(16,'2026_10_13_023134_add_title_to_drawings_table',3),
(17,'2026_10_13_025658_add_piping_iso_fields_to_drawings_table',4);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES
(1,'App\\Models\\User',1,'pcm','f17fda150f4eb8b21f93e838ffd2cbbfc45663a0474105553297262102dc05f7','[\"*\"]','2026-10-12 04:51:42',NULL,'2026-10-12 04:51:42','2026-10-12 04:51:42'),
(2,'App\\Models\\User',3,'pcm','26e1a87139159e077a00cd5d153dc7ea87de3f2355f2ed1fc2cb501a22d4e046','[\"*\"]','2026-10-12 04:51:42',NULL,'2026-10-12 04:51:42','2026-10-12 04:51:42'),
(3,'App\\Models\\User',1,'pcm','533cf7e7a2d006c7e4e3b0d4d645616baef105b98c90982ab0194bc9a6709414','[\"*\"]',NULL,NULL,'2026-10-12 05:52:01','2026-10-12 05:52:01'),
(4,'App\\Models\\User',1,'pcm','daf4146a7b9d5e1edae6e0689894b960cad305d54af7541ac83a4e1f7a31ddde','[\"*\"]','2026-10-12 05:53:07',NULL,'2026-10-12 05:53:07','2026-10-12 05:53:07'),
(5,'App\\Models\\User',1,'pcm','bb0f96a439009ee195f426b2558d3d0f77a1fd6ea6730e91aab20d53525996b5','[\"*\"]',NULL,NULL,'2026-10-12 06:21:41','2026-10-12 06:21:41'),
(6,'App\\Models\\User',3,'pcm','9d3039041850b259318db9067f0ea1193b0b5a15391f8a029389e410450cfd5d','[\"*\"]',NULL,NULL,'2026-10-12 06:21:42','2026-10-12 06:21:42'),
(7,'App\\Models\\User',5,'pcm','65da07b92e37594efdf9d60d16762bf0cee3359f5ea996ba96ffd253f6fd31ed','[\"*\"]',NULL,NULL,'2026-10-12 06:21:42','2026-10-12 06:21:42'),
(8,'App\\Models\\User',6,'pcm','128df7da8cb897a4b05a79c91d1e47706199a6fd6f72cd226f9b95b1e689c26e','[\"*\"]',NULL,NULL,'2026-10-12 06:21:42','2026-10-12 06:21:42'),
(9,'App\\Models\\User',7,'pcm','41e7d43e50380cf8e87232ad7062af8542064bf31e82b16ae671ad2404278bef','[\"*\"]',NULL,NULL,'2026-10-12 06:21:43','2026-10-12 06:21:43'),
(10,'App\\Models\\User',4,'pcm','4f46515edf80a149c966d02e41804ecc395a58a7c5ebd523b87502879ee7732a','[\"*\"]',NULL,NULL,'2026-10-12 06:21:44','2026-10-12 06:21:44'),
(11,'App\\Models\\User',2,'pcm','4ca67a997aa9f33f62169388a6b6667371351bb8f93fe913fbe9ed478c63fa42','[\"*\"]',NULL,NULL,'2026-10-12 06:21:44','2026-10-12 06:21:44'),
(12,'App\\Models\\User',1,'pcm','597507cc821e1298fe21c3d41303a3496f4b3e90067c89c498d99def03efff42','[\"*\"]',NULL,NULL,'2026-10-12 06:21:53','2026-10-12 06:21:53'),
(13,'App\\Models\\User',3,'pcm','f8ffe6c78897e739ba61bcb0de8d4acb757aa8ab85181bf5cb1deccbe64d3c5a','[\"*\"]','2026-10-12 06:21:56',NULL,'2026-10-12 06:21:54','2026-10-12 06:21:56'),
(14,'App\\Models\\User',5,'pcm','e663777a5ea689c9b2216488dd4f2a491d7bec8e83d2eb084452c56320d61fce','[\"*\"]','2026-10-12 06:21:56',NULL,'2026-10-12 06:21:54','2026-10-12 06:21:56'),
(15,'App\\Models\\User',6,'pcm','f2c2ff04d42dc385ac658f3890bac8b29046d87796f7590a47c5fc34bb20eaab','[\"*\"]','2026-10-12 06:21:56',NULL,'2026-10-12 06:21:55','2026-10-12 06:21:56'),
(16,'App\\Models\\User',7,'pcm','936b58c16885b424e4f69c7c0cc7d826536f9736d678ed8eddbbd04a920e9848','[\"*\"]','2026-10-12 06:21:56',NULL,'2026-10-12 06:21:56','2026-10-12 06:21:56'),
(17,'App\\Models\\User',4,'pcm','023bd3900b4906c87981cd35aaae57b02ae1721f18c8a22d9b64fd12651fd2ca','[\"*\"]','2026-10-12 06:21:56',NULL,'2026-10-12 06:21:56','2026-10-12 06:21:56'),
(18,'App\\Models\\User',4,'pcm','2de2279834a545e26ce0c1dbc19f652dc55da00565f6e4b3a0e6fd84c50211ac','[\"*\"]','2026-10-12 06:22:16',NULL,'2026-10-12 06:22:16','2026-10-12 06:22:16'),
(19,'App\\Models\\User',1,'pcm','932842643aafc382c63aeb491d2f43ce8980dcffa82094d0e43fb531f7078b04','[\"*\"]','2026-10-12 06:22:16',NULL,'2026-10-12 06:22:16','2026-10-12 06:22:16'),
(20,'App\\Models\\User',1,'pcm','6002e21ce6e5dcfa33f5b90848fea19d0a8bd2331ff4e353d3b9760b1c8437fb','[\"*\"]','2026-10-12 06:26:54',NULL,'2026-10-12 06:26:54','2026-10-12 06:26:54'),
(21,'App\\Models\\User',3,'pcm','cc930af012958503f350389d3eabe685993056e6db7d64eea8d333c6a5a7faf6','[\"*\"]',NULL,NULL,'2026-10-12 06:26:54','2026-10-12 06:26:54'),
(22,'App\\Models\\User',5,'pcm','e1b5c2bad7f341f23333e0e5c6383000bb10c294369d2822359b049ef030e6e4','[\"*\"]',NULL,NULL,'2026-10-12 06:26:54','2026-10-12 06:26:54'),
(23,'App\\Models\\User',5,'pcm','4fa631ba99dbab49414971392a742338405512d7492980650e3a76c715df0292','[\"*\"]','2026-10-12 06:27:18',NULL,'2026-10-12 06:27:18','2026-10-12 06:27:18'),
(24,'App\\Models\\User',1,'pcm','151495ccdd1bdaa3e6f1f413d15253f338a2310c9c319ff38177a3a4b85bad37','[\"*\"]','2026-10-12 06:28:17',NULL,'2026-10-12 06:28:17','2026-10-12 06:28:17'),
(25,'App\\Models\\User',3,'pcm','3014ed2552dbedfa98e5f74e9cbf83925fd110f4448386444121fc8007c42452','[\"*\"]','2026-10-12 06:28:18',NULL,'2026-10-12 06:28:18','2026-10-12 06:28:18'),
(26,'App\\Models\\User',5,'pcm','c599625246b9d1ce0917ab4392f022a588fcfd09813e4467c549c5daae0270be','[\"*\"]','2026-10-12 06:28:18',NULL,'2026-10-12 06:28:18','2026-10-12 06:28:18'),
(27,'App\\Models\\User',6,'pcm','522c54e071dd475d75550b0c03509d7116cc6043e20a3b160f5b973556e33610','[\"*\"]','2026-10-12 06:28:18',NULL,'2026-10-12 06:28:18','2026-10-12 06:28:18'),
(28,'App\\Models\\User',7,'pcm','1e01b981cc1a1d8a54120e219e4f25aa620bc15b58080f23765d7c0440a7d134','[\"*\"]','2026-10-12 06:28:19',NULL,'2026-10-12 06:28:19','2026-10-12 06:28:19'),
(29,'App\\Models\\User',4,'pcm','6ee25cfec886274d0f2519a0fd36ffb56cde43a98c6f527649a6e91955e6b58c','[\"*\"]','2026-10-12 06:28:20',NULL,'2026-10-12 06:28:20','2026-10-12 06:28:20'),
(30,'App\\Models\\User',1,'pcm','c9be90508414589895831aace907ceb59700280e9c5f58c82467f3555ec4db8c','[\"*\"]','2026-10-12 06:29:31',NULL,'2026-10-12 06:29:31','2026-10-12 06:29:31'),
(31,'App\\Models\\User',3,'pcm','2dec77a1d101f65880754ceafd0ccbab38b38c0e5be46fe5a39da7a96956274b','[\"*\"]','2026-10-12 06:29:31',NULL,'2026-10-12 06:29:31','2026-10-12 06:29:31'),
(32,'App\\Models\\User',5,'pcm','f1bfe647a561d97d879caf920ab9df10a9bfbf242d5841b50f1bd3859110e38a','[\"*\"]','2026-10-12 06:29:32',NULL,'2026-10-12 06:29:32','2026-10-12 06:29:32'),
(33,'App\\Models\\User',6,'pcm','945824b928712a6eb4a9c4bc009e370ad382e01f77e50465df009e5dcab129a4','[\"*\"]','2026-10-12 06:29:32',NULL,'2026-10-12 06:29:32','2026-10-12 06:29:32'),
(34,'App\\Models\\User',7,'pcm','803e9538b0bc1dbc4684e0373f4da1d97b759f62321e6f4b43534a8e9fdde510','[\"*\"]','2026-10-12 06:29:33',NULL,'2026-10-12 06:29:33','2026-10-12 06:29:33'),
(35,'App\\Models\\User',4,'pcm','9de602ecd210fe9a97e5a21ed5fa396e6899b2261266d2d8de1a48b3330730a0','[\"*\"]','2026-10-12 06:29:33',NULL,'2026-10-12 06:29:33','2026-10-12 06:29:33'),
(36,'App\\Models\\User',1,'pcm','736808d65401b8022b2233833d401550cb8f9b42582366b98cbde4068f2efe13','[\"*\"]','2026-10-12 06:30:24',NULL,'2026-10-12 06:30:24','2026-10-12 06:30:24'),
(37,'App\\Models\\User',1,'pcm','f02c47c96c338c26c3768d4544cf3448517b16fbd1867e6984e768475f02abcf','[\"*\"]','2026-10-12 06:30:24',NULL,'2026-10-12 06:30:24','2026-10-12 06:30:24'),
(38,'App\\Models\\User',3,'pcm','56d03792a49b6dca2ed0c3aca656a1c8e4163fd1ea526ab54f75e9b9f52b691a','[\"*\"]','2026-10-12 06:30:25',NULL,'2026-10-12 06:30:25','2026-10-12 06:30:25'),
(39,'App\\Models\\User',5,'pcm','90edd914bab6a3bfab4f476688b79ceeca2355ad3b371d48638c633b82e43a75','[\"*\"]','2026-10-12 06:30:25',NULL,'2026-10-12 06:30:25','2026-10-12 06:30:25'),
(40,'App\\Models\\User',6,'pcm','ad9c5ef62649f11b8d8b8f7d9cca399c2f0bd0ac6c3a2c0c73da521f426d5633','[\"*\"]','2026-10-12 06:30:26',NULL,'2026-10-12 06:30:26','2026-10-12 06:30:26'),
(41,'App\\Models\\User',7,'pcm','0af4c65a5a1dd177cf69f9eed933dc74b353cc059c36153916b89042c536ef42','[\"*\"]',NULL,NULL,'2026-10-12 06:30:27','2026-10-12 06:30:27'),
(42,'App\\Models\\User',4,'pcm','bd4d4d41aaa5842425a85bb109a2e6972b4370bcdc1ccfe291dbc39e64e16e8b','[\"*\"]','2026-10-12 06:30:27',NULL,'2026-10-12 06:30:27','2026-10-12 06:30:27'),
(43,'App\\Models\\User',1,'pcm','161d571c0071b83001128f88c260356c1becac19bfc7019094bbcab0adc3a0bd','[\"*\"]','2026-10-12 08:34:24',NULL,'2026-10-12 08:34:24','2026-10-12 08:34:24'),
(44,'App\\Models\\User',1,'pcm','b7de2eeedebea1c5dc5bcc5e5246a3e2f0a08ae8761592578f07b5f546020228','[\"*\"]','2026-10-12 08:34:24',NULL,'2026-10-12 08:34:24','2026-10-12 08:34:24'),
(45,'App\\Models\\User',3,'pcm','d5aa6f0b25eb387eb31cfdffd012e6756fe337ae3eb6cb27591ac4fa55224670','[\"*\"]','2026-10-12 08:34:25',NULL,'2026-10-12 08:34:25','2026-10-12 08:34:25'),
(46,'App\\Models\\User',5,'pcm','b21e2d6e5ff8e0cb03be9610eabcec1a25a961227c9b2bd52f391439ff9c59e1','[\"*\"]','2026-10-12 08:34:25',NULL,'2026-10-12 08:34:25','2026-10-12 08:34:25'),
(47,'App\\Models\\User',6,'pcm','08dce151fad5eceaf693b0d472218567479631946a5600e62b12b45dcc9935fd','[\"*\"]','2026-10-12 08:34:26',NULL,'2026-10-12 08:34:26','2026-10-12 08:34:26'),
(48,'App\\Models\\User',7,'pcm','4e96680bb25da24d4405e4312a90800d8ae85dd1de50cb3ae12c131998848209','[\"*\"]','2026-10-12 08:34:26',NULL,'2026-10-12 08:34:26','2026-10-12 08:34:26'),
(49,'App\\Models\\User',4,'pcm','295b1f86c5631a18fc98f2e1a53608b21e67351ea0fedacb23de7a463b015a7e','[\"*\"]','2026-10-12 08:34:26',NULL,'2026-10-12 08:34:26','2026-10-12 08:34:26'),
(50,'App\\Models\\User',1,'pcm','b5d4056484a56c3e5c3e2c377f5e80df3f24ccd577debcc99f3aa12a6cf68522','[\"*\"]','2026-10-12 08:34:32',NULL,'2026-10-12 08:34:32','2026-10-12 08:34:32'),
(51,'App\\Models\\User',1,'pcm','c5050596361ea097c4f4fecb3f2c3fc451f718c200d8ca1aae35ba0f25338ec3','[\"*\"]','2026-10-12 08:34:33',NULL,'2026-10-12 08:34:33','2026-10-12 08:34:33'),
(52,'App\\Models\\User',3,'pcm','c1f9d16b2ba927351a62c1d639741dd6d1a2af1a56774a351d741b1fff34ab4f','[\"*\"]','2026-10-12 08:34:33',NULL,'2026-10-12 08:34:33','2026-10-12 08:34:33'),
(53,'App\\Models\\User',5,'pcm','d25a9ab151c2a4aaa8c7eb236c966480e6da3cf106cd9b4a4f480a9f88bbfb90','[\"*\"]','2026-10-12 08:34:34',NULL,'2026-10-12 08:34:34','2026-10-12 08:34:34'),
(54,'App\\Models\\User',6,'pcm','279c93cab7d851b05c8afaa9b27fc32e97946292601249ba8844f3fe423349a9','[\"*\"]','2026-10-12 08:34:34',NULL,'2026-10-12 08:34:34','2026-10-12 08:34:34'),
(55,'App\\Models\\User',7,'pcm','22c73fc67eb9cb4d1aee92e6bdec083923b4a782eb886404f000773265b4868a','[\"*\"]','2026-10-12 08:34:35',NULL,'2026-10-12 08:34:35','2026-10-12 08:34:35'),
(56,'App\\Models\\User',4,'pcm','587fdceb1e8381b89a1ca5df643469f81506e868aa41509a007a1220521d26b3','[\"*\"]','2026-10-12 08:34:35',NULL,'2026-10-12 08:34:35','2026-10-12 08:34:35'),
(57,'App\\Models\\User',1,'pcm','89bf03d55a24b7eb8d03310b6137fb9e76557c6a0181d672ae85dc544d07a829','[\"*\"]','2026-10-12 08:35:30',NULL,'2026-10-12 08:35:30','2026-10-12 08:35:30'),
(58,'App\\Models\\User',3,'pcm','4cededceb4c66c50243e5651f32db687aded31f64bedfbe29cfa60a1641bdea6','[\"*\"]','2026-10-12 20:50:01',NULL,'2026-10-12 08:48:40','2026-10-12 20:50:01'),
(59,'App\\Models\\User',1,'pcm','3255d89d5ffcb3900100b08bcb01499387d55d09386478c281b77f0f555a36ae','[\"*\"]',NULL,NULL,'2026-10-12 09:19:44','2026-10-12 09:19:44'),
(60,'App\\Models\\User',1,'pcm','7a8041e11958762790a5ed2a64e5f3704b785627bb64cb773024b5891fde51b5','[\"*\"]','2026-10-12 09:26:28',NULL,'2026-10-12 09:19:57','2026-10-12 09:26:28'),
(61,'App\\Models\\User',1,'pcm','476dbc293ee840601f7fe3f3e5767c174de448d283f48c97337e112754a8da59','[\"*\"]','2026-10-12 09:36:12',NULL,'2026-10-12 09:34:12','2026-10-12 09:36:12'),
(62,'App\\Models\\User',1,'pcm','5fa25ec1c51ec027dcf0f7da64f95524b2edafc86b1cb36269a91d312cb5997c','[\"*\"]','2026-10-12 09:36:56',NULL,'2026-10-12 09:36:56','2026-10-12 09:36:56'),
(63,'App\\Models\\User',1,'pcm','7a60788fc7940904be97b263f25b591bf8c489784d7e229c2213a094597d49c5','[\"*\"]','2026-10-12 09:39:19',NULL,'2026-10-12 09:37:49','2026-10-12 09:39:19'),
(64,'App\\Models\\User',1,'pcm','6a8d5d312fc6b06b928e8854e76305ee84bf9a87d262bcac8965fb1f669f4032','[\"*\"]','2026-10-12 18:10:39',NULL,'2026-10-12 18:10:39','2026-10-12 18:10:39'),
(65,'App\\Models\\User',1,'pcm','8d9c969d0376e99fdabbf95eb5a7fba93e7c57567c765a70fda61a063db127a6','[\"*\"]',NULL,NULL,'2026-10-12 18:11:09','2026-10-12 18:11:09'),
(66,'App\\Models\\User',1,'pcm','5d501153711a153695e96873391e5d95d353a3435fbd699609e0073f1359f0d2','[\"*\"]','2026-10-12 18:17:50',NULL,'2026-10-12 18:11:20','2026-10-12 18:17:50'),
(67,'App\\Models\\User',1,'pcm','0301d3c70df5299284640a757c4f288e755344d6c8a0b81d03d809a6c6c7f670','[\"*\"]','2026-10-12 19:00:01',NULL,'2026-10-12 19:00:00','2026-10-12 19:00:01'),
(68,'App\\Models\\User',1,'pcm','6a4d3fca7c85a83467184ec69802b5f621cc705401c29981b0381553eba51376','[\"*\"]','2026-10-12 19:04:40',NULL,'2026-10-12 19:00:41','2026-10-12 19:04:40'),
(69,'App\\Models\\User',1,'pcm','085b525d8aad7c504ff69def4349f2df1bcc4353c5606131840689a3973c7362','[\"*\"]','2026-10-12 20:00:22',NULL,'2026-10-12 19:10:22','2026-10-12 20:00:22'),
(70,'App\\Models\\User',1,'pcm','f399c747a40c7c89430a93e9990428fb8d1950cc345815b958201fc37ebfe3cc','[\"*\"]','2026-10-12 19:16:17',NULL,'2026-10-12 19:16:16','2026-10-12 19:16:17'),
(71,'App\\Models\\User',1,'pcm','43b9007bf846fb49954654a561522b59537db1528a99eeba56798f74ea0b2964','[\"*\"]','2026-10-12 19:17:24',NULL,'2026-10-12 19:17:24','2026-10-12 19:17:24'),
(72,'App\\Models\\User',1,'pcm','24cbaa1d318335277906ad4a6fe8e8d9a133367a65d0f4078676ffadf5a3105e','[\"*\"]','2026-10-12 19:17:24',NULL,'2026-10-12 19:17:24','2026-10-12 19:17:24'),
(73,'App\\Models\\User',3,'pcm','243b2f1555d0b6e492de018b047c3a4b1dd8eeb97e276c7360b5d90be3509c91','[\"*\"]','2026-10-12 19:17:25',NULL,'2026-10-12 19:17:25','2026-10-12 19:17:25'),
(74,'App\\Models\\User',5,'pcm','4d49723fb2386d3d51f04acc58d28e5af39e8bebbb90ad573fcd01355d9abe5e','[\"*\"]','2026-10-12 19:17:26',NULL,'2026-10-12 19:17:26','2026-10-12 19:17:26'),
(75,'App\\Models\\User',6,'pcm','d08515a8fdecf4e05a4aa0cb848088becd5bd91c355d2934722f69b9192b5878','[\"*\"]','2026-10-12 19:17:26',NULL,'2026-10-12 19:17:26','2026-10-12 19:17:26'),
(76,'App\\Models\\User',7,'pcm','30162c99b685034d518d93907d231d437cf892017f93feed200e78373a5dd8d2','[\"*\"]','2026-10-12 19:17:27',NULL,'2026-10-12 19:17:27','2026-10-12 19:17:27'),
(77,'App\\Models\\User',4,'pcm','27fcc6282ba83a88ca7b1c5a58d6d9e7597465bf071d8135c1868372566a3280','[\"*\"]','2026-10-12 19:17:27',NULL,'2026-10-12 19:17:27','2026-10-12 19:17:27'),
(78,'App\\Models\\User',2,'pcm','217dad61e3ed36d8588e2c3cff5b014586fd6417d1fbd1428668e20fc92a448f','[\"*\"]','2026-10-12 19:44:31',NULL,'2026-10-12 19:44:31','2026-10-12 19:44:31'),
(79,'App\\Models\\User',2,'pcm','cedf1d2ef46515b9cb144a95374271e426817d1dc0946863920673faff4dde52','[\"*\"]','2026-10-12 19:47:28',NULL,'2026-10-12 19:47:28','2026-10-12 19:47:28'),
(80,'App\\Models\\User',2,'pcm','6040eb78f487f7e4ec32010694e4f95ccc63848e91f187f32fe89111d273a1a6','[\"*\"]','2026-10-12 19:47:59',NULL,'2026-10-12 19:47:59','2026-10-12 19:47:59'),
(81,'App\\Models\\User',1,'pcm','450c97962f92620ce81e29d7b3892ad77d8bff837440d9d9438bfae9c52a5ea8','[\"*\"]','2026-10-12 19:48:00',NULL,'2026-10-12 19:48:00','2026-10-12 19:48:00'),
(82,'App\\Models\\User',1,'pcm','1fa900652bbfa83917df52e90fc7b0e59d973ec589a6c0126274d56f3e71603f','[\"*\"]','2026-10-12 19:48:00',NULL,'2026-10-12 19:48:00','2026-10-12 19:48:00'),
(83,'App\\Models\\User',3,'pcm','c9226b922ffddf11f99eedeb4ad598b7ade946a95dea55ecbdd3f973b19e5749','[\"*\"]','2026-10-12 19:48:00',NULL,'2026-10-12 19:48:00','2026-10-12 19:48:00'),
(84,'App\\Models\\User',5,'pcm','fa2c9e8e74205de2806e80010a28174513aca54eeab0d0c9e5c24241292d7116','[\"*\"]','2026-10-12 19:48:01',NULL,'2026-10-12 19:48:01','2026-10-12 19:48:01'),
(85,'App\\Models\\User',6,'pcm','37f594c8a806d4eb5f54df729385233a7a5d33f27139af9a85a208f18400603e','[\"*\"]','2026-10-12 19:48:01',NULL,'2026-10-12 19:48:01','2026-10-12 19:48:01'),
(86,'App\\Models\\User',7,'pcm','7dbfa4b85d3ab6fcc90b3f49acc9b54a56e5acfa3452e1bfed11f452351b3b06','[\"*\"]','2026-10-12 19:48:01',NULL,'2026-10-12 19:48:01','2026-10-12 19:48:01'),
(87,'App\\Models\\User',4,'pcm','88309fd0aa77a5fbf1c6b0e3fcdeb03e137ecb46e7b51c370850b89d1746afe4','[\"*\"]','2026-10-12 19:48:02',NULL,'2026-10-12 19:48:02','2026-10-12 19:48:02'),
(88,'App\\Models\\User',2,'pcm','e74e2d46e893d04c8ed4be08f43075e8fc83675c9b3606ea07a4b5cd843c66b4','[\"*\"]','2026-10-12 20:00:16',NULL,'2026-10-12 20:00:16','2026-10-12 20:00:16'),
(89,'App\\Models\\User',1,'pcm','1973725a2ce329ecc1f523e49f5ecc7cdbe3ae36bde0223015cea8d989e9a872','[\"*\"]','2026-10-12 20:00:16',NULL,'2026-10-12 20:00:16','2026-10-12 20:00:16'),
(90,'App\\Models\\User',1,'pcm','0a7f5371055bdb42847def2c0926f05cfaf3875b318b54e161a0e28313546f29','[\"*\"]','2026-10-12 20:00:17',NULL,'2026-10-12 20:00:17','2026-10-12 20:00:17'),
(91,'App\\Models\\User',3,'pcm','4c94ea335ac4077088a30b08fbf232f25305f0d7b557132236fd55abd244fe7d','[\"*\"]','2026-10-12 20:00:17',NULL,'2026-10-12 20:00:17','2026-10-12 20:00:17'),
(92,'App\\Models\\User',5,'pcm','4a2bf982bef04abfa8bfff851b3433dd501288f23d207c3d4866d1ed300b87dc','[\"*\"]','2026-10-12 20:00:18',NULL,'2026-10-12 20:00:18','2026-10-12 20:00:18'),
(93,'App\\Models\\User',6,'pcm','2e62be37faa0e5359f6c55ff7f8a47415d1f91f92077aca5de327a0f19278b6e','[\"*\"]','2026-10-12 20:00:19',NULL,'2026-10-12 20:00:18','2026-10-12 20:00:19'),
(94,'App\\Models\\User',7,'pcm','65b1c8ce6bc28bf3008aa5f941cb62b8851f2760da285a3141d5e68ab06bbede','[\"*\"]','2026-10-12 20:00:19',NULL,'2026-10-12 20:00:19','2026-10-12 20:00:19'),
(95,'App\\Models\\User',4,'pcm','9843af9b7c653b6699ed489c80c97c53cad150058e915a78c9fdbac78223544e','[\"*\"]','2026-10-12 20:00:20',NULL,'2026-10-12 20:00:20','2026-10-12 20:00:20'),
(96,'App\\Models\\User',2,'pcm','6c6537e9b32d16d188baa332099ed857474eb4a0804834fac15b9fb03fbf1a39','[\"*\"]','2026-10-12 20:07:18',NULL,'2026-10-12 20:07:18','2026-10-12 20:07:18'),
(97,'App\\Models\\User',2,'pcm','bad0c4881393a1d6202b4971b7d6e48b5a1ce23a20f79e27340194279a3ab17a','[\"*\"]','2026-10-12 20:07:29',NULL,'2026-10-12 20:07:29','2026-10-12 20:07:29'),
(98,'App\\Models\\User',1,'pcm','c06afa095781586e572ec0c4c85586e86ca2da34580877d1f2f54227b7c68d3a','[\"*\"]','2026-10-12 20:07:29',NULL,'2026-10-12 20:07:29','2026-10-12 20:07:29'),
(99,'App\\Models\\User',1,'pcm','bb5ae771cb63dead11eeb25d212e97db4a9212646d8a66d8fdbc179f621ae1c6','[\"*\"]','2026-10-12 20:07:30',NULL,'2026-10-12 20:07:30','2026-10-12 20:07:30'),
(100,'App\\Models\\User',3,'pcm','240c4340d1148fc9ce19ef53b7a7089b928a78dd9169772579618774b879919d','[\"*\"]','2026-10-12 20:07:31',NULL,'2026-10-12 20:07:31','2026-10-12 20:07:31'),
(101,'App\\Models\\User',5,'pcm','5dcd37960b59c42c0d3b7f358cf8892e5631e509d7b8f294531cfa26c84fb217','[\"*\"]','2026-10-12 20:07:31',NULL,'2026-10-12 20:07:31','2026-10-12 20:07:31'),
(102,'App\\Models\\User',6,'pcm','6bb9d66534e5b3da25ca4fc7e4e0e679395a74dc1eff87635e9066f163c2dda2','[\"*\"]','2026-10-12 20:07:32',NULL,'2026-10-12 20:07:32','2026-10-12 20:07:32'),
(103,'App\\Models\\User',7,'pcm','b3f3984d9ca169307418b38936397071969b5709289bbbfd055c20b1cf481465','[\"*\"]','2026-10-12 20:07:32',NULL,'2026-10-12 20:07:32','2026-10-12 20:07:32'),
(104,'App\\Models\\User',4,'pcm','9c9e4e90d31f2c3616b313bdf35d340c7bd06da9bd91259f12646bad641dc0ab','[\"*\"]','2026-10-12 20:07:33',NULL,'2026-10-12 20:07:33','2026-10-12 20:07:33'),
(105,'App\\Models\\User',2,'pcm','9aa076c809c60cf4f974050f7956b3f16a84855a04cc3849caf9a978f0615ed1','[\"*\"]','2026-10-12 20:47:30',NULL,'2026-10-12 20:47:30','2026-10-12 20:47:30'),
(106,'App\\Models\\User',2,'pcm','1f6eacb5ef8b9473ba83c673524c442c7c29444b3f64de3f729adbe89287abdb','[\"*\"]','2026-10-12 20:49:28',NULL,'2026-10-12 20:49:28','2026-10-12 20:49:28'),
(107,'App\\Models\\User',1,'pcm','04e9392134cdf16d26bae425beb2a1fb5d33bc40d297301022d06efb1a2b8da0','[\"*\"]','2026-10-12 20:49:29',NULL,'2026-10-12 20:49:29','2026-10-12 20:49:29'),
(108,'App\\Models\\User',1,'pcm','e488947be05c3ae35afef33692ed2d109cc668ad2fdf899752c11d973e617191','[\"*\"]','2026-10-12 20:49:29',NULL,'2026-10-12 20:49:29','2026-10-12 20:49:29'),
(109,'App\\Models\\User',3,'pcm','51f4622b4ab5f3bb80abcd62aae5805cb325e3e6103087789cf973ed19a9ddb1','[\"*\"]','2026-10-12 20:49:30',NULL,'2026-10-12 20:49:30','2026-10-12 20:49:30'),
(110,'App\\Models\\User',5,'pcm','944973dd5c563799a755c7ca3c9306e3f8ff39737c0f0d66310ff91199678190','[\"*\"]','2026-10-12 20:49:30',NULL,'2026-10-12 20:49:30','2026-10-12 20:49:30'),
(111,'App\\Models\\User',6,'pcm','a45371b4185073bfadb30583091779e98f1713a124861869babe517b516d50a3','[\"*\"]','2026-10-12 20:49:30',NULL,'2026-10-12 20:49:30','2026-10-12 20:49:30'),
(112,'App\\Models\\User',7,'pcm','1c3feab91bfc45a4e28669ff2302b0f53dd63cb1a0d674238f47f951689ad285','[\"*\"]','2026-10-12 20:49:31',NULL,'2026-10-12 20:49:31','2026-10-12 20:49:31'),
(113,'App\\Models\\User',4,'pcm','8423fc21f5e5a5088755979929529b73686b9677a911fb0abb103d0efab0cff3','[\"*\"]','2026-10-12 20:49:31',NULL,'2026-10-12 20:49:31','2026-10-12 20:49:31'),
(114,'App\\Models\\User',2,'pcm','63bd7580cd709137d020f327df59088ba31a129349f9f55bdd29b3e2c436cb01','[\"*\"]','2026-10-12 20:52:31',NULL,'2026-10-12 20:50:12','2026-10-12 20:52:31'),
(115,'App\\Models\\User',1,'pcm','81e857b3e24b56a80de8f907ba2ce33d6b7e181770c8a46a86bbb012a0ea81af','[\"*\"]','2026-10-12 20:53:01',NULL,'2026-10-12 20:52:58','2026-10-12 20:53:01'),
(116,'App\\Models\\User',2,'pcm','592f6a525599c021242854037fe4523637be6a96e915da23606ef35ae773b0a8','[\"*\"]','2026-10-12 21:03:35',NULL,'2026-10-12 20:53:11','2026-10-12 21:03:35'),
(117,'App\\Models\\User',2,'pcm','46e52aedb45fdd03d20329772895c22b84492c734aab4eaa2cd6223ab21621db','[\"*\"]','2026-10-12 21:01:28',NULL,'2026-10-12 21:01:28','2026-10-12 21:01:28'),
(118,'App\\Models\\User',1,'pcm','b64a97f7c2db1fe7f6b17c9b55af79675fff63c9e4bb4b788aa20583466122f4','[\"*\"]','2026-10-12 21:01:29',NULL,'2026-10-12 21:01:29','2026-10-12 21:01:29'),
(119,'App\\Models\\User',1,'pcm','3e7519fe1fb87c721f3b53e85bbb00ad5a8dafd69fcb98c95d59dc0c74f01105','[\"*\"]','2026-10-12 21:01:30',NULL,'2026-10-12 21:01:30','2026-10-12 21:01:30'),
(120,'App\\Models\\User',3,'pcm','4902c304abb29227af7fb5ca1178ff30f58f93144ce83eb718ababfff13646c9','[\"*\"]','2026-10-12 21:01:30',NULL,'2026-10-12 21:01:30','2026-10-12 21:01:30'),
(121,'App\\Models\\User',5,'pcm','26b8e932c962927269ef6a276476380c01f8cda232c9749c18294db5ec24e55a','[\"*\"]','2026-10-12 21:01:31',NULL,'2026-10-12 21:01:31','2026-10-12 21:01:31'),
(122,'App\\Models\\User',6,'pcm','0a886c6d68e5ce650ecdb54a7d64e6858da61b405701590dddcf1cf1729e83b3','[\"*\"]','2026-10-12 21:01:31',NULL,'2026-10-12 21:01:31','2026-10-12 21:01:31'),
(123,'App\\Models\\User',7,'pcm','0ebe0f3996d98efcc26d67a6c2a6bd8232b8fc778409f988dd7eedddfa63a460','[\"*\"]','2026-10-12 21:01:32',NULL,'2026-10-12 21:01:32','2026-10-12 21:01:32'),
(124,'App\\Models\\User',4,'pcm','38ae21e77828018b4a05cfe06bfc47a3d534121f983ae0a36448897c342e9c94','[\"*\"]','2026-10-12 21:01:32',NULL,'2026-10-12 21:01:32','2026-10-12 21:01:32'),
(125,'App\\Models\\User',7,'pcm','4af5e2fbfe1de70bedd0075fd68e7d3ca7f378eb354f4477b557bbb5842e1d90','[\"*\"]','2026-10-12 21:07:35',NULL,'2026-10-12 21:03:38','2026-10-12 21:07:35'),
(126,'App\\Models\\User',2,'pcm','24786cda54eaa5b31708bac35b44bfd6cf67a13886e0550bb72fcbe226a62a18','[\"*\"]','2026-10-12 21:08:28',NULL,'2026-10-12 21:08:28','2026-10-12 21:08:28'),
(127,'App\\Models\\User',1,'pcm','a071924ccd861200d900e08fe1e6c20f5005c94b9be1fda417ef0e532804aaa5','[\"*\"]','2026-10-12 21:08:29',NULL,'2026-10-12 21:08:29','2026-10-12 21:08:29'),
(128,'App\\Models\\User',1,'pcm','8d0540e6106cde0707722e558dfb35e4b6a48d1b685366cd94eaec5e0d18eff0','[\"*\"]','2026-10-12 21:08:29',NULL,'2026-10-12 21:08:29','2026-10-12 21:08:29'),
(129,'App\\Models\\User',3,'pcm','514bcc8cf493707fe8b23c15d9a73d1c623478cbffeb015e36ca42ed5284cb6e','[\"*\"]','2026-10-12 21:08:30',NULL,'2026-10-12 21:08:30','2026-10-12 21:08:30'),
(130,'App\\Models\\User',5,'pcm','b3dc6ce383e472545ccea8de18edcc5409234496ab0fded6bff6b30d288d02ae','[\"*\"]','2026-10-12 21:08:30',NULL,'2026-10-12 21:08:30','2026-10-12 21:08:30'),
(131,'App\\Models\\User',6,'pcm','86d8e3a91fded58ef40ef7c86f721617f34c6fbb3b9d2f1cff3a5d3cef84b7d3','[\"*\"]','2026-10-12 21:08:31',NULL,'2026-10-12 21:08:31','2026-10-12 21:08:31'),
(132,'App\\Models\\User',7,'pcm','2e2cb4f94faefc04e9f4574811963c674accf5fdc824db64d0a7c1c7205c899f','[\"*\"]','2026-10-12 21:08:31',NULL,'2026-10-12 21:08:31','2026-10-12 21:08:31'),
(133,'App\\Models\\User',4,'pcm','1c01fb411eb37fe17b67edf6abc397b82c69822c9b7fbd3f5d5a3e74009c54fb','[\"*\"]','2026-10-12 21:08:31',NULL,'2026-10-12 21:08:31','2026-10-12 21:08:31'),
(134,'App\\Models\\User',2,'pcm','0006c4cc955f6333fe159f982a6ddee73e053f237a853411cb1d5ddaaa4c28c5','[\"*\"]','2026-10-12 21:09:26',NULL,'2026-10-12 21:09:18','2026-10-12 21:09:26'),
(135,'App\\Models\\User',2,'pcm','411ce574c55e64b1e844b175487a80d2df683fb41321a6fc840f3ed304d3505a','[\"*\"]','2026-10-12 21:10:43',NULL,'2026-10-12 21:10:42','2026-10-12 21:10:43'),
(136,'App\\Models\\User',7,'pcm','dbd2d2c2e2058da078757b46f093da93d86fc3909baa69dd18a254fff3e140c9','[\"*\"]','2026-10-12 21:11:09',NULL,'2026-10-12 21:11:09','2026-10-12 21:11:09'),
(137,'App\\Models\\User',2,'pcm','478bdb9e5ee154d27ba4ccdba49d0b5b50e0e71626f432270b9f75fab6ab5507','[\"*\"]','2026-10-12 21:11:50',NULL,'2026-10-12 21:11:50','2026-10-12 21:11:50'),
(138,'App\\Models\\User',1,'pcm','62f0e23752126b0e2bde20482abd613711712a21bf2ca29c55a3126ff2e31ea9','[\"*\"]','2026-10-12 21:11:51',NULL,'2026-10-12 21:11:51','2026-10-12 21:11:51'),
(139,'App\\Models\\User',1,'pcm','00bf04f0a2355189e18c81ee1142294db0affd729acca28452183f178ea65152','[\"*\"]','2026-10-12 21:11:51',NULL,'2026-10-12 21:11:51','2026-10-12 21:11:51'),
(140,'App\\Models\\User',3,'pcm','237948cb4f56431c3cc7acc6c0422f1066f28f082c8602a90046f3a733d118f5','[\"*\"]','2026-10-12 21:11:51',NULL,'2026-10-12 21:11:51','2026-10-12 21:11:51'),
(141,'App\\Models\\User',5,'pcm','03646f50e54428de07ba23d4b6021fd0a72595b8ea38866ebf6dc25eb57a69d8','[\"*\"]','2026-10-12 21:11:52',NULL,'2026-10-12 21:11:52','2026-10-12 21:11:52'),
(142,'App\\Models\\User',6,'pcm','6359a7b544d0023add7c03ac158eb064f7e1f320d89cc432f369f0f9cdf74dd9','[\"*\"]','2026-10-12 21:11:52',NULL,'2026-10-12 21:11:52','2026-10-12 21:11:52'),
(143,'App\\Models\\User',7,'pcm','10f0c83d21048c96048ce91cbf1e206c2e9bb7afb08f430ec8566bedd64826c6','[\"*\"]','2026-10-12 21:11:53',NULL,'2026-10-12 21:11:52','2026-10-12 21:11:53'),
(144,'App\\Models\\User',4,'pcm','ac763c282bf38b5bf9ffdae50b968d99409f0e01a522e93364c7068afeb9eed7','[\"*\"]','2026-10-12 21:11:53',NULL,'2026-10-12 21:11:53','2026-10-12 21:11:53'),
(145,'App\\Models\\User',1,'pcm','9173e3bb1077b58302c0db6f0dda4bff2f13ed783a6499a09edca50bb61ceadb','[\"*\"]','2026-10-12 21:14:19',NULL,'2026-10-12 21:14:19','2026-10-12 21:14:19'),
(146,'App\\Models\\User',2,'pcm','8749f207b419df304bb69edd89fc6f4d3aa3c0ee20efd1f7baa4b6ffc5459de0','[\"*\"]','2026-10-12 21:20:19',NULL,'2026-10-12 21:20:19','2026-10-12 21:20:19'),
(147,'App\\Models\\User',1,'pcm','999cb3fb706509dcd2a425ed3074aa01ca320ed3ee825328468208f417e30c38','[\"*\"]','2026-10-12 21:20:20',NULL,'2026-10-12 21:20:20','2026-10-12 21:20:20'),
(148,'App\\Models\\User',1,'pcm','6d732baf65a88bc07300d3a70381de4e7cf138196c1cb7f4f5fd93cf76582e55','[\"*\"]','2026-10-12 21:20:20',NULL,'2026-10-12 21:20:20','2026-10-12 21:20:20'),
(149,'App\\Models\\User',3,'pcm','ac1a1fe05a9acd0af3a0697c400c68af05af8e153cc60335dd09e35d48719649','[\"*\"]','2026-10-12 21:20:21',NULL,'2026-10-12 21:20:21','2026-10-12 21:20:21'),
(150,'App\\Models\\User',5,'pcm','316e574cf20dc3c3e0f85b4c4f591fa96447d1598387a927f8850fa74494fe1a','[\"*\"]','2026-10-12 21:20:21',NULL,'2026-10-12 21:20:21','2026-10-12 21:20:21'),
(151,'App\\Models\\User',6,'pcm','501e0bb9c30b6d02f9137f799ad05db40bf475766dfa8873735667a7fb829335','[\"*\"]','2026-10-12 21:20:22',NULL,'2026-10-12 21:20:22','2026-10-12 21:20:22'),
(152,'App\\Models\\User',7,'pcm','f06e2447498a99a28aa720092d8e09625d1f12fcb97643b1bafab2793054b75b','[\"*\"]','2026-10-12 21:20:22',NULL,'2026-10-12 21:20:22','2026-10-12 21:20:22'),
(153,'App\\Models\\User',4,'pcm','8e4d8104e889870f3353180658169c37e53393532bf7ebd0abe22ed7b2a41845','[\"*\"]','2026-10-12 21:20:22',NULL,'2026-10-12 21:20:22','2026-10-12 21:20:22'),
(154,'App\\Models\\User',2,'pcm','f885a23450430efeff41ea3fec0a3169d2a2abeaa32ec8b7d971ca144a37bad4','[\"*\"]','2026-10-12 21:22:42',NULL,'2026-10-12 21:22:42','2026-10-12 21:22:42'),
(155,'App\\Models\\User',1,'pcm','02d47119c6c12ddff62d0669a97593b8ff5ab880f54666ae15f3f1d8364bdd53','[\"*\"]','2026-10-12 21:22:43',NULL,'2026-10-12 21:22:43','2026-10-12 21:22:43'),
(156,'App\\Models\\User',1,'pcm','243ab290b5c9920876907a3cb258d04772acc0893b5a2ba1229a69159647d742','[\"*\"]','2026-10-12 21:22:44',NULL,'2026-10-12 21:22:44','2026-10-12 21:22:44'),
(157,'App\\Models\\User',3,'pcm','9292728e8b5ce2ce2cde4c67aa52cc816d72c77f42986d8fb7886ac960472240','[\"*\"]','2026-10-12 21:22:44',NULL,'2026-10-12 21:22:44','2026-10-12 21:22:44'),
(158,'App\\Models\\User',5,'pcm','aa59c86d34b77bc1557d099aecf2bf7875cb467d9b7114bc9213175704af90ba','[\"*\"]','2026-10-12 21:22:44',NULL,'2026-10-12 21:22:44','2026-10-12 21:22:44'),
(159,'App\\Models\\User',6,'pcm','9b8c0da0537c28f9955aa6089649599cd98e7be616d03526b9b481c338ceeb8b','[\"*\"]','2026-10-12 21:22:45',NULL,'2026-10-12 21:22:45','2026-10-12 21:22:45'),
(160,'App\\Models\\User',7,'pcm','b2a0e270f1fe66df86706d9b5606f90568071a6b8d95c2740dc425d999249a00','[\"*\"]','2026-10-12 21:22:45',NULL,'2026-10-12 21:22:45','2026-10-12 21:22:45'),
(161,'App\\Models\\User',4,'pcm','9d7a9bf125a7c71237abd22c270b0faba8135ebfb992b1efa82801b726a7ab7e','[\"*\"]','2026-10-12 21:22:46',NULL,'2026-10-12 21:22:46','2026-10-12 21:22:46'),
(162,'App\\Models\\User',2,'pcm','5cdcb832c38677ad37751ba19e8f76f0b4a9dc57a37f46318fcf3f9ae70f0da4','[\"*\"]','2026-10-12 21:25:00',NULL,'2026-10-12 21:25:00','2026-10-12 21:25:00'),
(163,'App\\Models\\User',1,'pcm','1dac427b69d3c5f9727a47d2f17024d37cd1090d8e7e392af62248f05af859ef','[\"*\"]','2026-10-12 21:25:00',NULL,'2026-10-12 21:25:00','2026-10-12 21:25:00'),
(164,'App\\Models\\User',1,'pcm','e823e5c0ec4337aa9903692c5162eead62d6f0f8313dda140a0f8a98485ea8be','[\"*\"]','2026-10-12 21:25:01',NULL,'2026-10-12 21:25:01','2026-10-12 21:25:01'),
(165,'App\\Models\\User',3,'pcm','01ae4f2859715c62131cc783b93e4f3194fa4bf5aec5e69afa3a95d82aaabcfc','[\"*\"]','2026-10-12 21:25:01',NULL,'2026-10-12 21:25:01','2026-10-12 21:25:01'),
(166,'App\\Models\\User',5,'pcm','855b8a5176e49f98d84cb1199b129d512f484cfa4c62f482885a5bb831554d30','[\"*\"]','2026-10-12 21:25:01',NULL,'2026-10-12 21:25:01','2026-10-12 21:25:01'),
(167,'App\\Models\\User',6,'pcm','89fc370b163e01053632231d034cb0ccdc350369ce1850448037d6368851e1b6','[\"*\"]','2026-10-12 21:25:02',NULL,'2026-10-12 21:25:02','2026-10-12 21:25:02'),
(168,'App\\Models\\User',7,'pcm','025bbe83f4162315fe3b1e40d001f3716f1acfae7bd669725aea41d65fca33cf','[\"*\"]','2026-10-12 21:25:02',NULL,'2026-10-12 21:25:02','2026-10-12 21:25:02'),
(169,'App\\Models\\User',4,'pcm','90342090a4f64ac327e78e4d22437c0a2dec3a2aec8f46f1e350e2b0ed9e4543','[\"*\"]','2026-10-12 21:25:03',NULL,'2026-10-12 21:25:03','2026-10-12 21:25:03'),
(170,'App\\Models\\User',2,'pcm','f123ca52dd1420197078eadf76017f43d6a1fe3d060c2e4e252ede693d3cde91','[\"*\"]','2026-10-12 21:28:35',NULL,'2026-10-12 21:28:35','2026-10-12 21:28:35'),
(171,'App\\Models\\User',1,'pcm','ef302e482a72eb0ececa46a447471c30ea2fd2ef5c9d9413e5f76c728e0303e6','[\"*\"]','2026-10-12 21:28:36',NULL,'2026-10-12 21:28:36','2026-10-12 21:28:36'),
(172,'App\\Models\\User',1,'pcm','6a55561bc555609253fa00f32b93547585445f4c855e65cc3de57b45f8d5ef8f','[\"*\"]','2026-10-12 21:28:36',NULL,'2026-10-12 21:28:36','2026-10-12 21:28:36'),
(173,'App\\Models\\User',3,'pcm','86ba364106f2a9bd99efc5d196cf0ab5e6f4713dd1d7aedbff23dbd59f1bb972','[\"*\"]','2026-10-12 21:28:37',NULL,'2026-10-12 21:28:37','2026-10-12 21:28:37'),
(174,'App\\Models\\User',5,'pcm','6ce05a67b890455c210db444dac4957be47069a2a20cd5d2a5d8435ff3d7fb10','[\"*\"]','2026-10-12 21:28:37',NULL,'2026-10-12 21:28:37','2026-10-12 21:28:37'),
(175,'App\\Models\\User',6,'pcm','0d1521d8ee50b5b7d6bebd3cc556f5e1a55201d28af04ca369615f01f02c6a5b','[\"*\"]','2026-10-12 21:28:38',NULL,'2026-10-12 21:28:38','2026-10-12 21:28:38'),
(176,'App\\Models\\User',7,'pcm','fd73d4c04414fe2fb4efee03f6f27621b40c479c4203a6cfb9f51f9c17cd728a','[\"*\"]','2026-10-12 21:28:38',NULL,'2026-10-12 21:28:38','2026-10-12 21:28:38'),
(177,'App\\Models\\User',4,'pcm','efa33d725e4413636e321581c97c08f641aabe23401ebfb70e78e9ebaa3ae811','[\"*\"]','2026-10-12 21:28:39',NULL,'2026-10-12 21:28:39','2026-10-12 21:28:39'),
(178,'App\\Models\\User',2,'pcm','94557fbd902d648654255775d7a46f04d26a05fbde3696678bc8294e69d53ba1','[\"*\"]','2026-10-12 21:34:01',NULL,'2026-10-12 21:34:01','2026-10-12 21:34:01'),
(179,'App\\Models\\User',1,'pcm','b985a1a18ebd7ce6ae2a9614ecd9b86d416fcace56c01319cadbe2e8f8c37a5b','[\"*\"]','2026-10-12 21:34:01',NULL,'2026-10-12 21:34:01','2026-10-12 21:34:01'),
(180,'App\\Models\\User',1,'pcm','1f55cf3b7f902c07e39a792fad2619aafb313be05c0ad88c23bc8472fde6078a','[\"*\"]','2026-10-12 21:34:02',NULL,'2026-10-12 21:34:02','2026-10-12 21:34:02'),
(181,'App\\Models\\User',3,'pcm','be99a8bf086caf3f61ecdf1f2f7942e45c71b4124c17bb5214f4c9061db1aafd','[\"*\"]','2026-10-12 21:34:03',NULL,'2026-10-12 21:34:03','2026-10-12 21:34:03'),
(182,'App\\Models\\User',5,'pcm','2f6ee37c80fb95ab2444a85c25b2b5c9f388f7034374ae8e5444db5352016e60','[\"*\"]','2026-10-12 21:34:03',NULL,'2026-10-12 21:34:03','2026-10-12 21:34:03'),
(183,'App\\Models\\User',6,'pcm','daf366612e45086f8de89b7d7c305353b1ef3da7b9e1b34139d18fd5d72e1747','[\"*\"]','2026-10-12 21:34:03',NULL,'2026-10-12 21:34:03','2026-10-12 21:34:03'),
(184,'App\\Models\\User',7,'pcm','94bb777f1faba0e837c9f76cbc954592d31f0a120ff0301085c060afa07fddd4','[\"*\"]','2026-10-12 21:34:04',NULL,'2026-10-12 21:34:04','2026-10-12 21:34:04'),
(185,'App\\Models\\User',4,'pcm','f59ccf3e8dc23b6c434819240e2b8befa7b3af94a6435e4efa5a21fd563d6c2f','[\"*\"]','2026-10-12 21:34:04',NULL,'2026-10-12 21:34:04','2026-10-12 21:34:04'),
(186,'App\\Models\\User',2,'pcm','0f9a6b3fd55e76236870233040c6036dbe0f66ebb793c0a414343be2f279ee9f','[\"*\"]','2026-10-12 21:36:40',NULL,'2026-10-12 21:36:40','2026-10-12 21:36:40'),
(187,'App\\Models\\User',1,'pcm','9be73396942e4e63efca4476e2d31820cb5248bb6a5ec0ce6fab0de181062b65','[\"*\"]','2026-10-12 21:36:40',NULL,'2026-10-12 21:36:40','2026-10-12 21:36:40'),
(188,'App\\Models\\User',1,'pcm','96c2e3d74f93b76f02eab7f0373310d637eadd985768b76cac5266de8d52f3c1','[\"*\"]','2026-10-12 21:36:41',NULL,'2026-10-12 21:36:41','2026-10-12 21:36:41'),
(189,'App\\Models\\User',3,'pcm','2fc3118890c5d0784217175e2b6ba48ede25b0f7908403efa42fcfda30eedc13','[\"*\"]','2026-10-12 21:36:41',NULL,'2026-10-12 21:36:41','2026-10-12 21:36:41'),
(190,'App\\Models\\User',5,'pcm','4a0ee364c8a10a48e64bfba93c5e8473aa50d153a142ea6c42e71707635ea66b','[\"*\"]','2026-10-12 21:36:42',NULL,'2026-10-12 21:36:42','2026-10-12 21:36:42'),
(191,'App\\Models\\User',6,'pcm','aec63a91ce7dfac095cba06d30cb23e22e575c501752276cbbc7361580037e38','[\"*\"]','2026-10-12 21:36:42',NULL,'2026-10-12 21:36:42','2026-10-12 21:36:42'),
(192,'App\\Models\\User',7,'pcm','9ca7a8b9736164e3f0cfd8bf47826e9d433e8fce120de4d93d4af359dc67f57e','[\"*\"]','2026-10-12 21:36:42',NULL,'2026-10-12 21:36:42','2026-10-12 21:36:42'),
(193,'App\\Models\\User',4,'pcm','359b77ab7563b110a353a26ea791909a94cb4270533db35e6fd75403ead2b661','[\"*\"]','2026-10-12 21:36:43',NULL,'2026-10-12 21:36:43','2026-10-12 21:36:43');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `client` varchar(255) DEFAULT NULL,
  `job_no` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES
(1,'PCM Piping (dari Excel)','Contoh','2428','2026-10-12 04:51:18','2026-10-12 04:51:18');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `scopes`
--

DROP TABLE IF EXISTS `scopes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `scopes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(255) NOT NULL,
  `unit` varchar(255) DEFAULT NULL,
  `contract_qty` decimal(14,2) DEFAULT NULL,
  `cumulative_qty` decimal(14,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scopes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `scopes` WRITE;
/*!40000 ALTER TABLE `scopes` DISABLE KEYS */;
INSERT INTO `scopes` VALUES
(1,'A1.1. Carbon Steel Piping','DI',37783.91,0.00,'2026-10-12 04:51:18','2026-10-12 21:36:43'),
(2,'A1.2. Alloy Steel Piping (P11, P22)','DI',3613.87,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(3,'A1.3. Alloy Steel Piping (P91)','DI',5568.13,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(4,'A1.4. Stainless Steel Piping','DI',5488.60,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(5,'B1.1. Carbon Steel Piping -AG','DI',64986.13,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(6,'B1.2. Alloy Steel Piping (P11, P22) -AG','DI',4607.89,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(7,'B1.3. Alloy Steel Piping (P91) -AG','DI',7930.47,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(8,'B1.4. Stainless Steel Piping -AG','DI',21039.07,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(9,'B2. Bolting and Threading -AG','DI',25142.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(10,'B3. Pipe Field Installation at Site - UG','DI',190.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(11,'B3. Pipe Support Fabrication & Installation','TON',220.40,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(12,'B4. Hanger Support Installation','TON',284.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(13,'B6. Temporary Piping (Chemical Cleaning/Steam Blowing)','DI',7275.49,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(14,'B7. Commissioning Support','M/D',2000.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(15,'D1.1 UPVC Pipe -Socket joint using solvent cement (AG)','DI',378.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(16,'D1.2 UPVC Pipe -Socket joint using solvent cement (UG)','DI',390.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(17,'D2.1 UPVC Pipe -Bolting and Threading (AG)','DI',1142.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18'),
(18,'D2.2 UPVC Pipe -Bolting and Threading (UG)','DI',1781.00,0.00,'2026-10-12 04:51:18','2026-10-12 04:51:18');
/*!40000 ALTER TABLE `scopes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES
('2DT5kujV822xzuNanPGKYio2XFaSqWBaDRXgqfgk',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJ2bHVDOTNTZVRNaVI4YlZmRWN2ZmlocmdJS1hzdVZJRVN5MWpsS3FGIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791860843),
('3cvja5mIcE7KE72d88jUH0ADt95IYh6N5le9dgKi',NULL,'127.0.0.1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJKQkZzY2djSndRV1I3Z040NHJzWjV4a0twUGFqM0dMQjYzTlNDUXJLIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791856799),
('3l5vLyP7LK5nRzAOq17Fq0K1DqID4b3ZrtNSXlw4',NULL,'127.0.0.1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJtWnZOM2NmZko0WEtIa3U5RlhSNUFMMTlDakxmNEoyN2Q5TTlNd3lZIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2xvY2FsaG9zdDo4MDAxXC9sb2dpbiIsInJvdXRlIjoibG9naW4ucGFnZSJ9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791865894),
('5tgep5ZmV7EgGYz2stIltlDt5tmtVkFrl17vTMr2',NULL,'127.0.0.1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJDUVdJbkVIS1VMQ0RLeUpPY0NhMG00M0pHVXdXU2JoVVFvckNyajZLIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791857775),
('7ftZWVBwXLXLuFoCoUbVN52SE1NyiIFJdFFKvbXp',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJOTklUQzlURlVUYVN1cHQzT3BrOVB6V3JwSHF1Qkt1MnhXczhySnJGIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791860820),
('9ligsXKaCN3HMbLLHbOMMzPyzzbW8fFWAwfhOuI1',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJWa1UwdWN2UlBZZEc2ZmNaeUVkNUw2eHY3bDl3U2NWNTVOUXR1WkF2IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791865214),
('Bj3fApVFQ0FITyMx431D1OpjzC7AkHjj1IZHCUSA',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJ4WXpnMGl1NEdpM0c5RkVGZmQyd1R2bUNyZ3lZTjBJNGVuWnU5Y0o0IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxXC9sb2dpbiIsInJvdXRlIjoibG9naW4ucGFnZSJ9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791864077),
('BrdDJF5zMQk2AZojwqAq0uCU0b4BUSlWaCkeMLq0',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJHY2FpeW5ZQ1Y3VG1Na3FqUnpIWG1XbVZwMWNDU0FBYnFTQUZibzNhIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791866033),
('buDjv4dyIanWJ7U9LAdxJJWGAF7Xc6qh6At6Tq8A',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJwQW5mOVI1dnlJaHZGRTRQSFVEc3J2dkNRTmhmVm9SUENnaHJ2aGhqIiwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==',1791860810),
('C8H9di6wk7EPNezImEUoeub2pEYFaJWcKVV6Ayd5',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiI4Vm1SR0c1b3ZvWVkyZTV6QUxzSEJTWTN3Vm93b1pEb0V5WXc3ZzZxIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791863232),
('CGg6m4MPAJsr8jIK5DxASHwjX9aSvRq1eFxDjdXP',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJ5UWJHQmZUbnFHQjYzNlVqd1J6UnlhWmE2bVpsSWhYMHdCWHBsRlBuIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791857237),
('E33UYpHbAvDAnqdRuMff1C4ofRui3HhtvljTmYhL',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJSMm5oaEduUk9uV2RQS05WM3c1V1RDYXY2cWVIcGRWazdwdFh5OXFhIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791865207),
('EZXnnCYgfmIx0sDSbL4J2RHVWTp2YT6eKYh3DqmO',NULL,'127.0.0.1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJ0RVNKODg4SVBLUUYzb0tsWldoNXJkcHhOcHllalV2RmdSV2ttREV3IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791856839),
('H9WbJdYRXj8pk4n7vssS4yPea75cUNH9OGm6FE7F',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJGM3N2RUYxYUtwT1BXdGh0Zm9rZHc0Szk2TnJXaFo1N3ZIYVVOa2NIIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791863236),
('HWfPwziFCsAxMdY59VIl0bvYSndNytwJm1p3dwf7',NULL,'127.0.0.1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36','eyJfdG9rZW4iOiI3ZkYxZUNQZ3NqeUx0bEQ2eWNMaEo0MGtpU2RLQVhSMlZzU3FxVElNIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791857421),
('k1fl175eAJNNajLh3AeYbqbb7aodJknx0ksMYRJo',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJJN3RjZ3FsdlhqdnVPMXVsaTlDRFlySEhJVTVKaDlQMFM4bmNwbXB5IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791857407),
('kDjPGRCj0I7DMJHDzeAdautqokpTqMAqxY9dxtPg',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJVMHdaaUhKT1J4Z3lTUUlZMUF0WjJIN0hLWVdaZktvS2JITm04SEhJIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791864501),
('M04j9rCe2U3dztJ7nfnDns4fYfD7zmvYFLa3H9Bc',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiI4VzV3RzQ3amM3dmNxUHVLU1BhVVlPdW50bUw5Qkd2OGMwMmdzZXdIIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxXC9sb2dpblwvZW5naW5lZXIiLCJyb3V0ZSI6ImxvZ2luLnBhZ2UifSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==',1791864083),
('OEcH6uSRVF4BhRU9tt0uZp5ucCGB1RHHZoIQhWBc',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJoVkgwNVdvSjdIWlJGWDlycm1FTW96TXJtSUdFa0Uxc3MxaEo2NWRNIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791857227),
('Sds5NegB1nFTTGLDzzUWvGy777YkqEKROTZ6WQIY',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJCbUJ5SFJKbThtNE5jekVJNTJ5dzBMbXRmRUl4a3d3c2hJRjNjVTZWIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791857245),
('SM55ei03gmetCuPh6Q7ruhMR72lbRqyJ2Sle8JC8',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJpUXNhUzlLYzJoZFBCcnloR3dLZEhMZHpPUFRlTk5vN0FqUDhIWUs4IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791857859),
('snOmAYcd3pLCzSTtooLw7ZHGwhNCHCkTfAzSkTVJ',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiI3emtLYU40MDAzSlJXNWhOcndhcFFWT3F6UFhYbGFTUXdBS3F4TG56IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791859666),
('W5DjbGJc31jzPkn1fSFj1I64p94DFurSuQCJKJAw',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJheG5Lb3VKNElySFBXV25zdkpRa1VSemhQQkNQRlBSY3diNjBnMUNxIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791863225),
('wCX90iP5Uxn9roB3PyYbsFpdyUgFaLHaPXIM0wbh',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJDS01lQVV5UWRpOWlnb0NRVG5rbWNNcFlJTkhpb1ljYnA4SXFzbll4IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791866232),
('WUCII9zQg2YLV8CF54WkMkI9bDUEqg6TJ0TQwd9H',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJzb3RvYUN3aG5idFZXdzFkelE5alAydkFTSERqNDN5bzNWMVRLTEgwIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791863625),
('XdQyEsDh2P02duwqKWDWu269GSgkF301YO21ylwn',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiJacUtCS2xYblNucEczY0lUTW1hcnJBZkhkamFrTjZ6clBWZmdMZDMwIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791859671),
('yTOGuixe6siy8cQzBad33kS4yjMoMkPmUDdb5feu',NULL,'127.0.0.1','curl/8.18.0','eyJfdG9rZW4iOiI3OHVodGhFY3VqelhGMUNqU0VzZFZGVWx5T0VvN3A1Wk15VnhFck9WIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAxIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791863254);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `stock_moves`
--

DROP TABLE IF EXISTS `stock_moves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_moves` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `move_date` date DEFAULT NULL,
  `kind` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `spec` varchar(255) DEFAULT NULL,
  `size` varchar(255) DEFAULT NULL,
  `qty` decimal(12,2) DEFAULT NULL,
  `unit` varchar(255) DEFAULT NULL,
  `requestor` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `heat_no` varchar(255) DEFAULT NULL,
  `po_no` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_moves`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `stock_moves` WRITE;
/*!40000 ALTER TABLE `stock_moves` DISABLE KEYS */;
INSERT INTO `stock_moves` VALUES
(1,NULL,'IN','Pipe test',NULL,NULL,10.00,'pcs',NULL,NULL,NULL,NULL,'2026-10-12 04:51:42','2026-10-12 04:51:42'),
(10,'2026-10-10','IN','Seamless Pipe 2 inch Sch 40','ASTM A106 Gr. B','2\"',120.00,'m',NULL,'Gudang Utama','H-982','PO-2428-001','2026-10-12 19:09:18','2026-10-12 19:09:18'),
(11,'2026-10-11','IN','Elbow 90 LR 2 inch Sch 40','ASTM A234 WPB','2\"',45.00,'pcs',NULL,'Gudang Utama','H-983','PO-2428-002','2026-10-12 19:09:18','2026-10-12 19:09:18');
/*!40000 ALTER TABLE `stock_moves` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `test_packages`
--

DROP TABLE IF EXISTS `test_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_packages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pkg_no` varchar(255) NOT NULL,
  `system_name` varchar(255) DEFAULT NULL,
  `line_no` varchar(255) DEFAULT NULL,
  `test_kind` varchar(255) NOT NULL DEFAULT 'Hydro',
  `test_pressure_bar` decimal(10,2) DEFAULT NULL,
  `holding_time_min` int(10) unsigned DEFAULT NULL,
  `schedule_date` date DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'planned',
  `punch_list_open` int(10) unsigned DEFAULT NULL,
  `blinds` text DEFAULT NULL,
  `blinds_installed` tinyint(1) DEFAULT NULL,
  `reinstated` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_packages`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `test_packages` WRITE;
/*!40000 ALTER TABLE `test_packages` DISABLE KEYS */;
INSERT INTO `test_packages` VALUES
(7,'TP-01-HYDRO','Cooling Water System Line 101/102','CW-2428-01','Hydrostatic Test',15.50,60,'2026-10-20','READY_FOR_TEST',0,NULL,NULL,0,'2026-10-12 19:09:18','2026-10-12 19:09:18');
/*!40000 ALTER TABLE `test_packages` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'construction',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'Manager','manager@pcm.local',NULL,'$2y$12$xT569xJHjhAQujkf8I1zOe9uiFv2SVWGWbaj9wVm.ACI9sB02d7fK',NULL,'2026-10-12 04:51:16','2026-10-12 04:51:16','manager'),
(2,'Engineer','engineer@pcm.local',NULL,'$2y$12$sTcEdquh/ZMOFPP6J87czeAlE5ZoxMHdfQupbMUBjonc9BCiMpomK',NULL,'2026-10-12 04:51:16','2026-10-12 04:51:16','engineer'),
(3,'Material','material@pcm.local',NULL,'$2y$12$Vn6OsiIOGiHgVqScSIKXU.aD7.hldIMVg733ycg8h6R3RXBceNtRG',NULL,'2026-10-12 04:51:17','2026-10-12 04:51:17','material'),
(4,'Construction','construction@pcm.local',NULL,'$2y$12$eNA9UBZhMr0BLlUimMgJT.izmn6lJOLocbpnj5KKsn8lkTm7IXmwO',NULL,'2026-10-12 04:51:17','2026-10-12 04:51:17','construction'),
(5,'Qaqc','qaqc@pcm.local',NULL,'$2y$12$R7VAJ9T2.2bX2kxr.2WKauhAw.mD7C3uIhJ2TqUa4TSqafmXcnX3C',NULL,'2026-10-12 04:51:17','2026-10-12 04:51:17','qaqc'),
(6,'Testpackage','testpackage@pcm.local',NULL,'$2y$12$7OYSjKmsGFl5cSmaIRqH6uyExEcsj.EHmB9hYzTlXs9pubCpPJHFC',NULL,'2026-10-12 04:51:18','2026-10-12 04:51:18','testpackage'),
(7,'Hse','hse@pcm.local',NULL,'$2y$12$f68n3DbGGf8sY5UCVZJxr.SpAvMW7Qlk6J1mk289XmS3u3jKpMFbm',NULL,'2026-10-12 04:51:18','2026-10-12 04:51:18','hse');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-13 11:47:12
