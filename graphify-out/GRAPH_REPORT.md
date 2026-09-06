# Graph Report - C:\Users\corte\Desktop\aclc-one-cortes.testing  (2026-09-06)

## Corpus Check
- 199 files · ~39,800 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 976 nodes · 2638 edges · 62 communities (56 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Database Schema & Models
- UI Components & Layout
- API Routes & Endpoints
- Database Schema & Models
- API Routes & Endpoints
- UI Components & Layout
- API Routes & Endpoints
- API Routes & Endpoints
- API Routes & Endpoints
- API Routes & Endpoints
- Authentication & Security
- UI Components & Layout
- UI Components & Layout
- UI Components & Layout
- Core Utilities & Services
- UI Components & Layout
- UI Components & Layout
- Core Utilities & Services
- UI Components & Layout
- API Routes & Endpoints
- API Routes & Endpoints
- TypeScript Type Definitions
- API Routes & Endpoints
- UI Components & Layout
- UI Components & Layout
- UI Components & Layout
- Authentication & Security
- UI Components & Layout
- UI Components & Layout
- UI Components & Layout
- Core Utilities & Services
- Core Utilities & Services
- Database Schema & Models
- API Routes & Endpoints
- API Routes & Endpoints
- UI Components & Layout
- UI Components & Layout
- Feature Business Logic
- UI Components & Layout
- Core Utilities & Services
- Core Utilities & Services
- Module (study-buddy/page.tsx, Bubble())
- UI Components & Layout
- API Routes & Endpoints
- UI Components & Layout
- Core Utilities & Services
- Core Utilities & Services
- API Routes & Endpoints
- Authentication & Security
- Database Schema & Models
- Database Schema & Models
- UI Components & Layout
- Core Utilities & Services
- Database Schema & Models
- Feature Business Logic
- Database Schema & Models

## God Nodes (most connected - your core abstractions)
1. `generateRequestId()` - 118 edges
2. `hasPermission()` - 98 edges
3. `cn()` - 73 edges
4. `prisma` - 66 edges
5. `authOptions` - 64 edges
6. `Card` - 37 edges
7. `CardContent` - 37 edges
8. `"organizations"` - 35 edges
9. `Button` - 33 edges
10. `logAudit()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `generateRequestId()`  [EXTRACTED]
  src/app/api/academic-years/route.ts → src/lib/utils.ts
- `GET()` --calls--> `generateRequestId()`  [EXTRACTED]
  src/app/api/activity-logs/route.ts → src/lib/utils.ts
- `GET()` --calls--> `generateRequestId()`  [EXTRACTED]
  src/app/api/class-sessions/route.ts → src/lib/utils.ts
- `GET()` --calls--> `generateRequestId()`  [EXTRACTED]
  src/app/api/immersion-assignments/route.ts → src/lib/utils.ts
- `GET()` --calls--> `generateRequestId()`  [EXTRACTED]
  src/app/api/immersion-programs/route.ts → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (62 total, 6 thin omitted)

### Community 0 - "Database Schema & Models"
Cohesion: 0.13
Nodes (42): "academic_years", "activity_logs", "ai_summaries", "attendance_records", "audit_logs", "immersion_assignments", "immersion_programs", "invoices" (+34 more)

### Community 1 - "UI Components & Layout"
Cohesion: 0.09
Nodes (26): CATEGORIES, metadata, BulkImportRoute(), EnrolStudent(), SectionSettings(), QrScannerProps, Account, AccountQueue() (+18 more)

### Community 2 - "API Routes & Endpoints"
Cohesion: 0.06
Nodes (35): GET(), POST(), GET(), POST(), GET(), POST(), GET(), POST() (+27 more)

### Community 3 - "Database Schema & Models"
Cohesion: 0.09
Nodes (23): GET(), POST(), handler, POST(), dynamic, encode(), GET(), Stamp (+15 more)

### Community 4 - "API Routes & Endpoints"
Cohesion: 0.09
Nodes (20): POST(), POST(), joinSchema, PATCH(), POST(), GET(), GET(), POST() (+12 more)

### Community 5 - "UI Components & Layout"
Cohesion: 0.08
Nodes (25): metadata, STATE, MyRecord(), MyRecordProps, PerSubject(), SubjectRate, FormNotice(), Notice (+17 more)

### Community 6 - "API Routes & Endpoints"
Cohesion: 0.09
Nodes (26): POST(), schema, DELETE(), PATCH(), patchSchema, POST(), POST(), POST() (+18 more)

### Community 7 - "API Routes & Endpoints"
Cohesion: 0.09
Nodes (22): GET(), PATCH(), GET(), POST(), POST(), GET(), AccountsPage(), metadata (+14 more)

### Community 8 - "API Routes & Endpoints"
Cohesion: 0.16
Nodes (24): POST(), PUT(), saveSchema, GradesPage(), metadata, metadata, MyGradesPage(), GradeSheetEditor() (+16 more)

### Community 9 - "API Routes & Endpoints"
Cohesion: 0.13
Nodes (24): GET(), StaffProfilePage(), CampusPage(), metadata, buildFloorStack(), countWaiting(), DirectoryEntry, FloorSummary (+16 more)

### Community 10 - "Authentication & Security"
Cohesion: 0.10
Nodes (18): ErrorBody(), referenceCode(), ROLES, RoleTab, safeCallback(), SignInForm(), AppShell(), AppShellProps (+10 more)

### Community 11 - "UI Components & Layout"
Cohesion: 0.11
Nodes (19): DashboardPage(), metadata, SchedulePage(), metadata, SectionsPage(), StudentSchedulePage(), AcademicYearForm(), NamedRef (+11 more)

### Community 12 - "UI Components & Layout"
Cohesion: 0.15
Nodes (16): Note, AiFlashcardModal(), PROGRAMS, PublishDeckModal(), PublishDeckModalProps, SEMESTERS, YEARS, StudyTabs() (+8 more)

### Community 13 - "UI Components & Layout"
Cohesion: 0.21
Nodes (19): DayDetail(), ScheduleCalendar(), addMonths(), CALENDAR_DAYS, CalendarDay, daysInMonth(), entriesOn(), formatDayLong() (+11 more)

### Community 14 - "Core Utilities & Services"
Cohesion: 0.17
Nodes (19): auditAndFixCSV(), CSV_HEADER, fixRow(), KNOWN_TYPES, parseCSVRow(), quoteField(), splitCSVRows(), buildCards() (+11 more)

### Community 15 - "UI Components & Layout"
Cohesion: 0.15
Nodes (20): ACTION_TONE, formatDate(), formatTime(), QUICK_ACTIONS, StatusBadge(), StudentDashboard(), StudentDashboardProps, titleCase() (+12 more)

### Community 16 - "UI Components & Layout"
Cohesion: 0.13
Nodes (14): StudyMode, FormattedNoteText(), MCOption(), MCOptionProps, MCOptionState, stateStyles, ModeCard(), ModeCardProps (+6 more)

### Community 17 - "Core Utilities & Services"
Cohesion: 0.13
Nodes (8): CloudinaryStorageProvider, FetchedObject, ImageVariant, LocalStorageProvider, mimeExtension(), mimeFromExtension(), StorageProvider, StoredObject

### Community 18 - "UI Components & Layout"
Cohesion: 0.26
Nodes (13): ClassForm(), ClassFormValues, SaveResult, SchedulePlotter(), SchedulePlotterProps, ScheduleViews(), SectionScheduleEditor(), Entry (+5 more)

### Community 19 - "API Routes & Endpoints"
Cohesion: 0.16
Nodes (16): DELETE(), deleteSchema, GET(), PATCH(), POST(), SELECT, updateSchema, DELETE() (+8 more)

### Community 20 - "API Routes & Endpoints"
Cohesion: 0.17
Nodes (14): GET(), ActivityEntry, AiSummaryResult, AiClient, AiProviderName, DEFAULT_MODEL, getAiClient(), isAiConfigured() (+6 more)

### Community 21 - "TypeScript Type Definitions"
Cohesion: 0.14
Nodes (15): FlashcardsPage(), StudyDashboard(), buildMCQuestion(), mulberry32(), shuffleSeeded(), CardStatus, CardType, EnumerationItem (+7 more)

### Community 22 - "API Routes & Endpoints"
Cohesion: 0.18
Nodes (13): chatSchema, maxDuration, POST(), AiUnavailableError, buildSystemPrompt(), ChatRequest, ChatTurn, ChatUnavailableError (+5 more)

### Community 23 - "UI Components & Layout"
Cohesion: 0.18
Nodes (14): AttendanceSheetPage(), defaultRange(), metadata, parseDate(), AttendanceSheetTable(), LETTER, longDate(), shortDate() (+6 more)

### Community 24 - "UI Components & Layout"
Cohesion: 0.19
Nodes (12): DeskPage(), metadata, PresencePill(), PresenceView, TONE_CLASS, Desk, QueuePerson, QUICK_STATUS (+4 more)

### Community 25 - "UI Components & Layout"
Cohesion: 0.20
Nodes (13): AVATAR_TONE, CampusFinder(), CampusFinderProps, DirectoryEntry, FloorSummary, AvatarBlock(), AvatarBlockProps, avatarVariants (+5 more)

### Community 26 - "Authentication & Security"
Cohesion: 0.23
Nodes (10): RegisterPage(), ROLES, Key(), RANGES, ReportsDashboardProps, Metric(), FormMessage(), Tone (+2 more)

### Community 27 - "UI Components & Layout"
Cohesion: 0.17
Nodes (10): LIVE, metadata, NEXT, Service, ServiceRow(), TONE, describe(), FloorStack() (+2 more)

### Community 28 - "UI Components & Layout"
Cohesion: 0.21
Nodes (9): CheckInPanel(), CheckInPanelProps, formatTime(), OpenSession, TodayAttendance, VerifiedReceipt(), Guidance(), GuidanceProps (+1 more)

### Community 29 - "UI Components & Layout"
Cohesion: 0.22
Nodes (11): QrScanner(), Attendance, formatDate(), formatTime(), initials(), Roster(), SectionOption, Session (+3 more)

### Community 31 - "Core Utilities & Services"
Cohesion: 0.21
Nodes (9): ApiContext, ApiHandler, ApiHandlerOptions, createApiHandler(), EmailOptions, EmailResult, createRequestLogger(), logger (+1 more)

### Community 32 - "Database Schema & Models"
Cohesion: 0.23
Nodes (10): adapter, FLOORS, OFFICES, seedCampus(), isLocalDatabase(), main(), pool, prisma (+2 more)

### Community 33 - "API Routes & Endpoints"
Cohesion: 0.29
Nodes (9): ACCEPTED, numericField(), POST(), canView(), GET(), PhotoContext, ViewerSession, hasAnyPermission() (+1 more)

### Community 34 - "API Routes & Endpoints"
Cohesion: 0.35
Nodes (7): POST(), limiters, rateLimit(), rateLimitResponse(), config, proxy(), securityHeaders

### Community 35 - "UI Components & Layout"
Cohesion: 0.22
Nodes (7): bricolage, instrumentSans, metadata, plexMono, viewport, Providers(), ServiceWorkerRegistration()

### Community 36 - "UI Components & Layout"
Cohesion: 0.20
Nodes (7): FEATURES, PRIVACY_CLAIMS, REPLACES, ROLES, STATS, HeroPreview(), SHORTCUTS

### Community 37 - "Feature Business Logic"
Cohesion: 0.29
Nodes (9): AiFlashcardModalProps, FillInTheBlanksUI(), FillInTheBlanksUIProps, isWordMatch(), Token, tokenizeText(), GenerateCardsResult, Card (+1 more)

### Community 38 - "UI Components & Layout"
Cohesion: 0.29
Nodes (7): FlashcardDeck(), FlashcardDeckProps, colorMap, StatBadge(), StatBadgeProps, getSRClass(), useSpeechRecognition()

### Community 39 - "Core Utilities & Services"
Cohesion: 0.40
Nodes (8): checkIdentificationAnswer(), IdentificationResult, levenshteinDistance(), stringSimilarity(), areMathExpressionsEquivalent(), evaluateMathExpression(), sanitizeMathExpression(), solveLinearEquation()

### Community 40 - "Core Utilities & Services"
Cohesion: 0.25
Nodes (8): COURSES, FORMAT_FILTERS, LibraryItem, LibraryPage(), SEMESTERS, titleCase(), TYPE_ICON, YEAR_LEVELS

### Community 41 - "Module (study-buddy/page.tsx, Bubble())"
Cohesion: 0.22
Nodes (5): Bubble(), Citation, ConversationSummary, Message, OPENERS

### Community 42 - "UI Components & Layout"
Cohesion: 0.32
Nodes (7): ago(), BY_TYPE, CLASSES, ClassKey, classOf(), Notification, NotificationBell()

### Community 43 - "API Routes & Endpoints"
Cohesion: 0.43
Nodes (5): GET(), getCommunityDecks(), globalCommunityDecks, initialCommunityDecks, PublishedDeckItem

### Community 44 - "UI Components & Layout"
Cohesion: 0.38
Nodes (5): ACTIONS, AdminDashboard(), AdminDashboardProps, formatDate(), titleCase()

### Community 46 - "Core Utilities & Services"
Cohesion: 0.48
Nodes (6): buildGrounding(), extractTerms(), formatDate(), GroundingContext, STOP_WORDS, truncate()

### Community 47 - "API Routes & Endpoints"
Cohesion: 0.40
Nodes (5): GET(), PATCH(), presenceSchema, startOfToday(), visibilitySchema

### Community 48 - "Authentication & Security"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 49 - "Database Schema & Models"
Cohesion: 0.60
Nodes (4): describeTarget(), main(), prisma, required()

### Community 50 - "Database Schema & Models"
Cohesion: 0.50
Nodes (4): cli, diagnoseUrl(), maskPassword(), result

### Community 51 - "UI Components & Layout"
Cohesion: 0.60
Nodes (4): formatTime(), SupervisorDashboard(), SupervisorDashboardProps, titleCase()

## Knowledge Gaps
- **232 isolated node(s):** `securityHeaders`, `config`, `bricolage`, `instrumentSans`, `plexMono` (+227 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateRequestId()` connect `API Routes & Endpoints` to `API Routes & Endpoints`, `API Routes & Endpoints`, `Database Schema & Models`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `Core Utilities & Services`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `cn()` connect `Authentication & Security` to `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `API Routes & Endpoints`, `API Routes & Endpoints`, `Core Utilities & Services`, `Module (study-buddy/page.tsx, Bubble())`, `Authentication & Security`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`, `UI Components & Layout`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `prisma` connect `Database Schema & Models` to `API Routes & Endpoints`, `API Routes & Endpoints`, `UI Components & Layout`, `API Routes & Endpoints`, `UI Components & Layout`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `UI Components & Layout`, `Core Utilities & Services`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `API Routes & Endpoints`, `UI Components & Layout`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `securityHeaders`, `config`, `bricolage` to the rest of the system?**
  _232 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database Schema & Models` be split into smaller, more focused modules?**
  _Cohesion score 0.1284013605442177 - nodes in this community are weakly interconnected._
- **Should `UI Components & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._
- **Should `API Routes & Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.06201550387596899 - nodes in this community are weakly interconnected._