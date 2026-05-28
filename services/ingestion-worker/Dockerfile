# ==========================================
# Builder Stage
# ==========================================
FROM golang:1.22-alpine AS builder

# Disable CGO for static compilation and set OS to Linux
ENV CGO_ENABLED=0 \
    GOOS=linux

WORKDIR /build

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY main.go ./

# Build the executable with optimizations (strip debug symbols and DWARF tables)
RUN go build -ldflags="-s -w" -o ingestion-worker main.go

# ==========================================
# Runner Stage
# ==========================================
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates (vital for securely connecting to HTTPS APIs like Gemini API)
RUN apk --no-cache add ca-certificates

# Copy the compiled binary from builder
COPY --from=builder /build/ingestion-worker ./

# Command to execute the worker
CMD ["./ingestion-worker"]
