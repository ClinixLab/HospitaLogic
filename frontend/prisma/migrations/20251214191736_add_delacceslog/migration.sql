/*
  Warnings:

  - You are about to drop the `accesslog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `accesslog` DROP FOREIGN KEY `AccessLog_user_id_fkey`;

-- DropTable
DROP TABLE `accesslog`;
