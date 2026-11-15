-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('candidate', 'party', 'institution');

-- CreateEnum
CREATE TYPE "VideoLink" AS ENUM ('own_channel', 'name_in_title');

-- CreateTable
CREATE TABLE "video_channels" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ChannelKind" NOT NULL,
    "candidateId" TEXT,
    "linkedFrom" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_candidates" (
    "videoId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "link" "VideoLink" NOT NULL,

    CONSTRAINT "video_candidates_pkey" PRIMARY KEY ("videoId","candidateId")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_channels_youtubeId_key" ON "video_channels"("youtubeId");

-- CreateIndex
CREATE UNIQUE INDEX "videos_youtubeId_key" ON "videos"("youtubeId");

-- AddForeignKey
ALTER TABLE "video_channels" ADD CONSTRAINT "video_channels_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_channels" ADD CONSTRAINT "video_channels_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "video_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_candidates" ADD CONSTRAINT "video_candidates_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_candidates" ADD CONSTRAINT "video_candidates_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

