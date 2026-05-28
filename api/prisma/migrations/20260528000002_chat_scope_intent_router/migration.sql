CREATE TYPE "ChatSessionScopeMode" AS ENUM ('ALL_COURSES', 'SELECTED_COURSES');

ALTER TABLE "chat_sessions"
ADD COLUMN "scope_mode" "ChatSessionScopeMode" NOT NULL DEFAULT 'ALL_COURSES';

UPDATE "chat_sessions"
SET "scope_mode" = 'SELECTED_COURSES'
WHERE "course_id" IS NOT NULL;

CREATE TABLE "chat_session_courses" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_session_courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_session_courses_session_id_course_id_key" ON "chat_session_courses"("session_id", "course_id");
CREATE INDEX "chat_session_courses_session_id_idx" ON "chat_session_courses"("session_id");
CREATE INDEX "chat_session_courses_course_id_idx" ON "chat_session_courses"("course_id");

ALTER TABLE "chat_session_courses"
ADD CONSTRAINT "chat_session_courses_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_session_courses"
ADD CONSTRAINT "chat_session_courses_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "chat_session_courses" ("id", "session_id", "course_id", "created_at")
SELECT
  "id" || ':' || "course_id",
  "id",
  "course_id",
  COALESCE("created_at", NOW())
FROM "chat_sessions"
WHERE "course_id" IS NOT NULL
ON CONFLICT ("session_id", "course_id") DO NOTHING;
