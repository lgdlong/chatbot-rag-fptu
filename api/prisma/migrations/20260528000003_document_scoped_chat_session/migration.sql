ALTER TYPE "ChatSessionScopeMode" ADD VALUE IF NOT EXISTS 'SELECTED_DOCUMENTS';

CREATE TABLE "chat_session_documents" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_session_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_session_documents_session_id_document_id_key" ON "chat_session_documents"("session_id", "document_id");
CREATE INDEX "chat_session_documents_session_id_idx" ON "chat_session_documents"("session_id");
CREATE INDEX "chat_session_documents_document_id_idx" ON "chat_session_documents"("document_id");

ALTER TABLE "chat_session_documents"
ADD CONSTRAINT "chat_session_documents_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_session_documents"
ADD CONSTRAINT "chat_session_documents_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
