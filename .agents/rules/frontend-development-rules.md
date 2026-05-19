# Frontend Development Rules

**IMPORTANT:** These rules apply to all frontend code in `frontend/` directory. Follow alongside `development-rules.md`.

## Tech Stack
- React 19 + Vite + Tailwind CSS v4
- Mantine v9 UI component library
- Tabler Icons React for icons (ONLY - no emoji, unicode, or sticker-style icons)

## File Structure
```
src/
├── components/
│   ├── layout/          # Layout components
│   └── [feature]/       # feature-specific components
├── pages/               # route pages
├── hooks/               # custom hooks
├── services/            # API services
├── types/               # TypeScript types
├── utils/               # utilities
└── lib/                 # library config (utils.ts, api.ts)
```

## Component Rules
- Use functional components with hooks
- Props interfaces defined above component
- Destructure props in function signature
- Use Mantine v9 semantic components for UI elements. Avoid raw Tailwind classes for standard UI pieces where Mantine provides a solution.
- Keep components under 200 lines
- Default export at bottom

## Loading & Error States
- **No early returns with loading spinners** - causes layout shift
- Use React Suspense + `<SuspenseLoader>` for loading states
- Wrap Suspense boundaries around async components
- Handle errors with try/catch + user-friendly messages

## State Management
- React Context for global state (auth, theme, etc.)
- Local state (`useState`) for component-level
- URL search params for filters/pagination (useSearchParams)

## API Integration
- Use `fetch` or configured axios instance from `src/services/api/`
- Handle loading, error, and success states
- Types defined in `src/types/` match backend DTOs

## Performance
- Lazy load routes with `React.lazy()`
- Lazy load heavy components (DataGrid, charts, modals)
- Memoize expensive computations (`useMemo`)
- Memoize callbacks passed to children (`useCallback`)
- Avoid unnecessary re-renders (`React.memo` where appropriate)
- Debounce search inputs (300-500ms)
- Clean up subscriptions in useEffect

## Naming
- React component files: kebab-case (`youtube-video-card.tsx`)
- Hooks: kebab-case with `use` prefix (`use-video-list.ts`)
- Utils/functions: camelCase
- CSS/Tailwind: utility classes

## TypeScript
- Strict mode - no `any` type
- Use proper interfaces for all types
- Explicit return types on functions where helpful
- Type imports: `import type { User } from '~/types/user'`

## Code Quality
- Accessible markup (ARIA labels, semantic HTML)
- Responsive design (mobile-first)
- Handle errors gracefully with try/catch
- Comment complex logic but keep code self-documenting

## Icon Rule
- **ONLY use @tabler/icons-react icons** - never use emoji, unicode symbols, or sticker-style icons
- Import icons from `@tabler/icons-react` (e.g., `import { IconFilm } from "@tabler/icons-react"`)
- Examples of forbidden: `🎬`, `🔍`, `⭐`, `⚙️`, `🚀`

## Import Aliases
| Alias | Resolves To |
|-------|-------------|
| `@/` | `src/` |
| `~/types` | `src/types` |
| `~/components` | `src/components` |

## New Component Checklist
- [ ] Use functional component with TypeScript
- [ ] Lazy load if heavy component: `React.lazy(() => import())`
- [ ] Wrap in Suspense for loading states
- [ ] Props interface above component
- [ ] Destructure props in function signature
- [ ] Use `useCallback` for event handlers passed to children
- [ ] Default export at bottom