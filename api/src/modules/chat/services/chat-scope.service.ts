import { prisma } from "../../auth/services/db.service.js";
import { ChatSessionScopeMode } from "@prisma/client";

export type ScopedCourse = {
  id: string;
  code: string;
  name: string;
};

export type ScopedDocument = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  courseId: string;
  course: ScopedCourse;
  createdAt: Date;
};

export type ResolvedChatScope = {
  scopeMode: ChatSessionScopeMode;
  courseIds: string[];
  documentIds: string[];
  scopedCourses: ScopedCourse[];
  scopedDocuments: ScopedDocument[];
};

type SessionScopeSource = {
  courseId?: string | null;
  scopeMode?: ChatSessionScopeMode | string | null;
  scopedCourses?: Array<{
    courseId: string;
    course?: ScopedCourse | null;
  }>;
  scopedDocuments?: Array<{
    documentId: string;
    document?: ScopedDocument | null;
  }>;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function orderedScopedCourses(courseIds: string[], courses: ScopedCourse[]) {
  const byId = new Map(courses.map((course) => [course.id, course]));
  return courseIds.map((courseId) => byId.get(courseId)).filter((course): course is ScopedCourse => Boolean(course));
}

function orderedScopedDocuments(documentIds: string[], documents: ScopedDocument[]) {
  const byId = new Map(documents.map((document) => [document.id, document]));
  return documentIds
    .map((documentId) => byId.get(documentId))
    .filter((document): document is ScopedDocument => Boolean(document));
}

export async function resolveAccessibleChatCourseIds(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return [];
  }

  const courses = await prisma.course.findMany({
    where: {
      documents: {
        some: {
          status: "COMPLETED",
        },
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return courses.map((course) => course.id);
}

export async function resolveAccessibleChatDocuments(userId: string) {
  const accessibleCourseIds = await resolveAccessibleChatCourseIds(userId);

  if (accessibleCourseIds.length === 0) {
    return [];
  }

  return prisma.document.findMany({
    where: {
      status: "COMPLETED",
      courseId: {
        in: accessibleCourseIds,
      },
    },
    select: {
      id: true,
      name: true,
      fileType: true,
      status: true,
      courseId: true,
      createdAt: true,
      course: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function resolveAccessibleChatDocumentIds(userId: string) {
  const documents = await resolveAccessibleChatDocuments(userId);
  return documents.map((document) => document.id);
}

export async function resolveChatScope(
  session: SessionScopeSource,
  userId: string,
): Promise<ResolvedChatScope> {
  const accessibleCourseIds = await resolveAccessibleChatCourseIds(userId);
  const accessibleCourseIdSet = new Set(accessibleCourseIds);
  const accessibleDocuments = await resolveAccessibleChatDocuments(userId);
  const accessibleDocumentIdSet = new Set(accessibleDocuments.map((document) => document.id));
  const accessibleCourseRows = await prisma.course.findMany({
    where: {
      id: {
        in: accessibleCourseIds,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
  const accessibleCourseMap = new Map(accessibleCourseRows.map((course) => [course.id, course]));

  const selectedDocumentIds = unique(session.scopedDocuments?.map((item) => item.documentId) ?? []).filter((documentId) =>
    accessibleDocumentIdSet.has(documentId),
  );
  const selectedCourseIds = unique([
    ...(session.scopedCourses?.map((item) => item.courseId) ?? []),
    session.courseId ?? "",
  ]).filter((courseId) => accessibleCourseIdSet.has(courseId));

  const hasDocumentScope =
    session.scopeMode === ChatSessionScopeMode.SELECTED_DOCUMENTS || selectedDocumentIds.length > 0;

  if (hasDocumentScope) {
    const scopedDocuments = orderedScopedDocuments(selectedDocumentIds, accessibleDocuments);
    const scopeCourseIds = unique(scopedDocuments.map((document) => document.courseId)).filter((courseId) =>
      accessibleCourseIdSet.has(courseId),
    );

    return {
      scopeMode: ChatSessionScopeMode.SELECTED_DOCUMENTS,
      courseIds: scopeCourseIds,
      documentIds: selectedDocumentIds,
      scopedCourses: orderedScopedCourses(scopeCourseIds, accessibleCourseRows),
      scopedDocuments,
    };
  }

  const scopeMode =
    session.scopeMode === ChatSessionScopeMode.SELECTED_COURSES || selectedCourseIds.length > 0
      ? ChatSessionScopeMode.SELECTED_COURSES
      : ChatSessionScopeMode.ALL_COURSES;

  const scopeCourseIds =
    scopeMode === ChatSessionScopeMode.SELECTED_COURSES
      ? selectedCourseIds
      : accessibleCourseIds;

  if (scopeCourseIds.length === 0) {
    return {
      scopeMode,
      courseIds: [],
      documentIds: [],
      scopedCourses: [],
      scopedDocuments: [],
    };
  }

  const courseRows = scopeCourseIds.map((courseId) => accessibleCourseMap.get(courseId)).filter((course): course is ScopedCourse => Boolean(course));

  return {
    scopeMode,
    courseIds: scopeCourseIds,
    documentIds: [],
    scopedCourses: orderedScopedCourses(scopeCourseIds, courseRows),
    scopedDocuments: [],
  };
}

function formatScopedDocument(document: ScopedDocument) {
  return `${document.name} - ${document.course.code}`;
}

export function describeChatScope(scope: ResolvedChatScope) {
  if (scope.scopeMode === ChatSessionScopeMode.SELECTED_DOCUMENTS) {
    if (scope.scopedDocuments.length === 0) {
      return "0 tài liệu đã chọn";
    }

    if (scope.scopedDocuments.length === 1) {
      return formatScopedDocument(scope.scopedDocuments[0]);
    }

    return `${scope.scopedDocuments.length} tài liệu đã chọn`;
  }

  if (scope.scopeMode === ChatSessionScopeMode.ALL_COURSES) {
    return "Tất cả môn";
  }

  if (scope.scopedCourses.length === 0) {
    return "0 môn đã chọn";
  }

  if (scope.scopedCourses.length === 1) {
    const course = scope.scopedCourses[0];
    return `${course.code} - ${course.name}`;
  }

  const codes = scope.scopedCourses.map((course) => course.code).join(", ");
  return `${scope.scopedCourses.length} môn đã chọn: ${codes}`;
}

export function buildChatScopeLabel(scope: ResolvedChatScope) {
  return describeChatScope(scope);
}
