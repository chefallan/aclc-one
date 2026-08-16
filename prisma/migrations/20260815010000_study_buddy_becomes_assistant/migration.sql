-- Study Buddy was built as peer matching. It is an AI assistant instead, so the
-- matching tables are replaced rather than extended.
--
-- Forward-only: this drops three tables. They held no production data — the
-- feature never shipped to a school — but the drop is still irreversible, so
-- take a backup before running this against anything you care about.

DROP TABLE IF EXISTS "study_sessions";
DROP TABLE IF EXISTS "study_buddy_matches";
DROP TABLE IF EXISTS "study_buddy_profiles";

DROP TYPE IF EXISTS "StudySessionStatus";
DROP TYPE IF EXISTS "StudyBuddyStatus";

CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_user_id_idx" ON "conversations"("user_id");
CREATE INDEX "conversations_organization_id_idx" ON "conversations"("organization_id");
CREATE INDEX "conversations_updated_at_idx" ON "conversations"("updated_at");

CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");
CREATE INDEX "chat_messages_organization_id_idx" ON "chat_messages"("organization_id");
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages"("created_at");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
