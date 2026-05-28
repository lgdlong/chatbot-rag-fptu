# Database Query Guide - Chatbot RAG FPTU

This guide explains how to connect to and query the PostgreSQL database for the `chatbot-rag-fptu` project.

## Prerequisites

- Docker must be installed and running
- The local PostgreSQL container must be running
- The root `.env` file must be configured

## Rules

**READ-ONLY QUERIES ONLY**

- **ONLY** use `SELECT` queries
- **NEVER** use `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, or any other data modification query
- This guide is for debugging and inspection only

## Quick Reference

### Database Credentials

#### Guest Account (read-only)

| Field | Value |
|-------|-------|
| Host | `localhost` |
| User | `guest` |
| Password | `12345678` |
| Database | `chatbot_rag_fptu` |
| Port | `5433` |

### Connection Strings

**Guest (read-only):**

```text
postgresql://guest:12345678@localhost:5433/chatbot_rag_fptu?schema=public
```

## Connection Methods

### Using docker exec (recommended)

```bash
# Connect as guest (read-only)
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu

# Run a single query
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "YOUR_QUERY_HERE"
```

### Using a direct host connection

```bash
psql "postgresql://guest:12345678@localhost:5433/chatbot_rag_fptu?schema=public"
```

## Verify Guest Account

```bash
# Test guest connection - should return a few courses
docker exec chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, code, name, created_at FROM courses LIMIT 3;"

# Verify guest is read-only - should fail with permission denied
docker exec chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "UPDATE courses SET name = 'test' WHERE id = 'test';"
```

## Useful psql Commands

Once connected to the database, you can use these psql meta-commands:

| Command | Description |
|---------|-------------|
| `\dt` | List all tables |
| `\d table_name` | Describe table structure |
| `\du` | List all users/roles |
| `\l` | List all databases |
| `\dn` | List all schemas |
| `\q` | Exit psql |
| `\x` | Toggle expanded display |
| `\timing` | Show query execution time |

## Common Queries

### List all tables

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "\dt"
```

### List all users

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, name, email, role, created_at FROM users LIMIT 10;"
```

### List all courses

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, code, name, created_at FROM courses ORDER BY created_at DESC LIMIT 10;"
```

### List uploaded documents

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, name, file_type, status, course_id, created_at FROM documents ORDER BY created_at DESC LIMIT 10;"
```

### List chat sessions

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, title, user_id, course_id, created_at FROM chat_sessions ORDER BY created_at DESC LIMIT 10;"
```

### List chat messages

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, session_id, sender, left(content, 120) AS preview, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 10;"
```

### List document chunks

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, document_id, page_number, left(content, 120) AS preview FROM document_chunks ORDER BY page_number ASC LIMIT 10;"
```

### List lecturer requests

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT id, name, email, status, created_at FROM lecturer_requests ORDER BY created_at DESC LIMIT 10;"
```

### Count records in key tables

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'documents', COUNT(*) FROM documents
UNION ALL SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL SELECT 'document_chunks', COUNT(*) FROM document_chunks
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'lecturer_requests', COUNT(*) FROM lecturer_requests;
"
```

## Export Query Results

### CSV format

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "COPY (SELECT * FROM documents ORDER BY created_at DESC LIMIT 100) TO STDOUT WITH CSV HEADER" > documents_export.csv
```

### JSON format (using psql's built-in output)

```bash
docker exec -it chatbot-rag-postgres psql -U guest -d chatbot_rag_fptu -c "SELECT json_agg(t) FROM (SELECT * FROM courses ORDER BY created_at DESC LIMIT 10) t;" -t > courses_export.json
```

## Troubleshooting

### Container not running

```bash
# Check container status
docker ps -a --filter name=chatbot-rag-postgres

# Start the container
docker start chatbot-rag-postgres
```

### Connection refused

```bash
# Check if PostgreSQL is accepting connections inside the container
docker exec -it chatbot-rag-postgres pg_isready -U guest -d chatbot_rag_fptu
```

