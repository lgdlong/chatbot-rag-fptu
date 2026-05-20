export const API_BASE_URL = "http://localhost:8000";

interface RequestOptions extends RequestInit {
  json?: any;
}

async function fetchAPI(path: string, options: RequestOptions = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers);

  if (options.json) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.json);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Ensure cookies are sent and received
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = "An error occurred";
    try {
      const parsed = JSON.parse(text);
      errorMessage = parsed.error || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Check auth session
  getSession: () => fetchAPI("/api/auth/get-session"),

  // Developer Bypass Login
  devLogin: () => fetchAPI("/api/chat/dev-login", { method: "POST" }),

  // Fetch all courses
  getCourses: () => fetchAPI("/api/chat/courses"),

  // Fetch documents for a course
  getDocuments: (courseId: string) =>
    fetchAPI(`/api/chat/courses/${courseId}/documents`),

  // Upload document
  uploadDocument: async (courseId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}/api/courses/${courseId}/documents`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = "Upload failed";
      try {
        const parsed = JSON.parse(text);
        errorMessage = parsed.error || errorMessage;
      } catch {
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  // Delete document
  deleteDocument: (courseId: string, documentId: string) =>
    fetchAPI(`/api/courses/${courseId}/documents/${documentId}`, {
      method: "DELETE",
    }),

  // Get user sessions
  getChatSessions: () => fetchAPI("/api/chat/sessions"),

  // Create chat session
  createChatSession: (courseId: string) =>
    fetchAPI("/api/chat/sessions", {
      method: "POST",
      json: { courseId },
    }),

  // Get details for a chat session
  getChatSessionDetails: (sessionId: string) =>
    fetchAPI(`/api/chat/sessions/${sessionId}`),
};

// SSE Chat Streaming helper
export async function streamChat(
  sessionId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onCitations: (citations: any[]) => void,
  onError: (error: string) => void,
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, message }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        onError(errorJson.error || "Failed to connect");
      } catch {
        onError(errorText || "Server error");
      }
      return;
    }

    if (!response.body) {
      onError("Response body is null");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("event:")) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith("data:")) {
          const dataStr = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(dataStr);
            if (currentEvent === "message" || !currentEvent) {
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
            } else if (currentEvent === "citations") {
              if (parsed.citations) {
                onCitations(parsed.citations);
              }
            } else if (currentEvent === "error") {
              if (parsed.error) {
                onError(parsed.error);
              }
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", dataStr, e);
          }
        }
      }
    }
  } catch (err: any) {
    onError(err.message || "Network error");
  }
}
