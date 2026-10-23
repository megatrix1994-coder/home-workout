Sprint Plan — Home Workout Platform

File: sprint.md
Status: Proposed
Planning assumption: One developer or a small team, with one-week sprints. Adjust estimates to team size and repository maturity.

1. Sprint objective

Deliver a usable fitness application that recommends muscle-specific workouts, demonstrates correct exercise technique, guides post-workout stretching, and recommends practical pre- and post-workout meals.

2. Before Sprint 1: Repository audit
Inspect the existing Git repository and project structure.
Identify the frontend framework, backend, database, and package manager.
Read the README and existing setup instructions.
Run the application and existing test suite.
Identify incomplete features and reusable components.
Record environment variables and required services without exposing secrets.
Agree on the initial architecture and deployment approach.

Deliverable: A working local development environment and a short implementation plan aligned with the actual codebase.

Sprint 1 — Foundation and exercise catalogue

Goal: Establish the application foundation and the data needed to browse exercises.

Tasks
Set up or verify frontend routing and shared layout.
Configure TypeScript, linting, formatting, and tests.
Establish database configuration and migrations if a backend is needed.
Define muscle-group, exercise, equipment, stretch, and animation data models.
Create seed data for the initial muscle groups.
Add sample free-weight and machine exercises.
Implement muscle-group browsing.
Implement exercise search and basic filtering.
Add loading, empty, and error states.
Acceptance criteria
Users can browse the initial muscle groups.
Exercises display their equipment and target muscles.
Free-weight and machine options are represented in the data model.
Seed data can be loaded repeatedly without creating unintended duplicates.
The application builds and its tests pass.

Deliverable: A functional, data-driven exercise catalogue.

Sprint 2 — Workout builder and recommendations

Goal: Generate workouts based on the user's training requirements.

Tasks
Add goal selection.
Add experience-level selection.
Add equipment availability filters.
Implement exercise recommendation rules.
Add configurable sets, repetitions, and rest intervals.
Add exercise alternatives.
Build the workout summary screen.
Add workout start, save, and edit actions.
Test filtering and recommendation behavior.
Acceptance criteria
Users can select a muscle group and relevant training preferences.
Recommendations respect equipment availability.
Each recommended exercise includes instructions and appropriate prescription fields.
Users can replace unsuitable exercises.
The application explains the primary rationale behind the selection.

Deliverable: A usable workout builder with rules-based recommendations.

Sprint 3 — Exercise animations and guided sessions

Goal: Teach users how to perform exercises and track a workout.

Tasks
Define a consistent animation asset specification.
Select the initial animation or video delivery approach.
Build a reusable exercise demonstration component.
Add play, pause, replay, and supported speed controls.
Display setup, execution, breathing, and common-error cues.
Add a text-only fallback.
Build the guided workout session screen.
Implement set, repetition, and optional weight logging.
Implement rest timers and session completion.
Review all published demonstrations with a qualified fitness professional.
Acceptance criteria
Every exercise included in the release has a reviewed demonstration or approved equivalent.
Animation failure does not prevent users from following text instructions.
Users can record completed sets and finish a workout.
Session data persists according to the application's storage design.
Core controls work on mobile and desktop.

Deliverable: A guided workout experience with form demonstrations and tracking.

Sprint 4 — Recovery and stretching

Goal: Generate a relevant cooldown for the muscles trained.

Tasks
Create a stretch catalogue with target-muscle mappings.
Define primary and secondary muscle associations.
Implement workout-to-muscle aggregation.
Generate a cooldown from the completed workout.
Build the guided stretch screen.
Add stretch animations and technique cues.
Add duration controls and completion tracking.
Support skipping or replacing uncomfortable stretches.
Add suitable alternatives for limited mobility.
Review exercise-stretch mappings and safety instructions.
Acceptance criteria
A completed workout produces a cooldown matched to the muscles worked.
Each recommended stretch includes instructions and a reviewed demonstration.
Irrelevant or duplicate stretches are minimized.
Users can skip or substitute stretches.
The cooldown does not claim to guarantee injury prevention or eliminate soreness.

Deliverable: An integrated, muscle-aware post-workout recovery experience.

Sprint 5 — Nutrition and food recommendations

Goal: Provide practical meal suggestions around training.

Tasks
Define a food and nutrient data model.
Add serving sizes and nutrition-data provenance.
Seed Kenyan and East African food options.
Seed internationally common food options.
Build pre-workout recommendations.
Build post-workout recommendations.
Add dietary preference and allergy filters.
Add budget and preparation-time filters where supported.
Display approximate portions and available nutrient estimates.
Review the educational nutrition guidance for clarity and safety.
Acceptance criteria
Users can access pre- and post-workout food suggestions.
Both local and international options are available.
Recommendations respect declared allergies and exclusions.
Nutrition values are not fabricated when reliable data is unavailable.
The application communicates that food suggestions are general guidance rather than medical prescriptions.

Deliverable: A useful workout nutrition module.

Sprint 6 — Progress, quality assurance, and release

Goal: Deliver a stable MVP and prepare it for real users.

Tasks
Implement workout history.
Add basic progress summaries.
Add training consistency and performance trends.
Test the full journey from workout creation to cooldown.
Add unit and integration tests for recommendation logic.
Add end-to-end tests for critical workflows.
Test mobile responsiveness and accessibility.
Test reduced-motion behavior and media fallbacks.
Review authentication, authorization, validation, and secrets handling.
Configure production environment variables and deployment.
Document setup, data seeding, testing, and deployment.
Conduct final exercise-content and nutrition-content reviews.
Acceptance criteria
Users can complete a workout and view it in their history.
Workout, animation, recovery, and nutrition features work together.
Critical tests pass.
No known critical security issue remains unresolved.
The project can be set up from documented instructions.
The release is deployed to a test or production environment and verified.

Deliverable: An MVP ready for controlled user testing.

Delivery status (23 October 2026)
Delivered: workout history at /history with sessions in the last 7 and 28 days, a weekly streak, sessions per muscle, and best-set trends.
Delivered: invite-only accounts, per-user workouts and history, and an admin page to invite, remove, restore, reset, change roles, and delete accounts.
Delivered: authorization review. Every workout route checks the owner, sessions are hashed HttpOnly cookies, cross-site writes are refused, sign-in attempts are rate-limited, and secrets stay out of git.
Delivered: server, client, and Playwright tests for the full journey, media fallback, reduced motion, accessibility on desktop and phone, and the admin and privacy flow.
Delivered: a production build served on one port, a Dockerfile, docker-compose.prod.yml, and documented environment variables.
Verified locally: the production build on port 8080 passed every Playwright suite, including after cross-site writes were made strict (a write must carry the app's own Origin, or Sec-Fetch-Site same-origin).
Delivered: GitHub Actions runs lint, unit tests, the build, the audit, and the Playwright suites against the Docker production stack. The first run (commit a10520f) passed both jobs, so the container image builds, migrates, seeds, and passes every end-to-end test.
Delivered: automated content checks in server/src/content.test.ts. They found 18 cooldown stretches without a pain warning; every cooldown now ends with "Ease off at once if you feel pain, numbness, or tingling."
Delivered: GET /api/health, Docker and compose healthchecks, SIGTERM/SIGINT drain, CSP, and HSTS on HTTPS. render.yaml, DEPLOY.md, a public /privacy notice, and an uptime workflow that pings PUBLIC_URL when that GitHub variable is set.
Verified locally on the production build (port 8080): GET /api/health returns 200 {"status":"ok"}, /login returns 200, GET /api/v1/muscles without a session returns 401, and a cross-site login returns 403. Playwright journey, sign-in, privacy, and most admin scans passed. Invite and exercise-list cases failed when the local Prisma database returned unavailable mid-run; the Docker job in CI remains the clean run of the same suite.
Open: run the Docker image on this machine as well. Docker Desktop is installed and waits for a Windows restart.
Open: apply the Render blueprint (needs a Render account and a paid Postgres plan). Hosted HTTPS staging is not live until that happens.
Open: awaiting qualified review. The sheets in content-review/ (exercises, warm-ups, cooldowns, nutrition) are ready for a trainer and a nutritionist. Gates are listed in content-review/GO_LIVE.md. No review has taken place yet.

3. Suggested backlog and priorities
Priority	Feature	Sprint
P0	Repository audit and working development setup	Pre-sprint
P0	Muscle groups and exercise catalogue	1
P0	Equipment-aware workout recommendations	2
P0	Exercise form demonstrations	3
P0	Workout logging	3
P0	Muscle-specific cooldowns	4
P0	Local and international nutrition	5
P1	Workout history and progress	6
P1	Accessibility and reduced-motion support	3–6
P1	Exercise substitutions and preferences	2–5
P2	AI-based form analysis	Future
P2	Wearables and advanced analytics	Future
P2	Social features and coaching subscriptions	Future
4. Testing checklist
Functional
Selecting a muscle group returns relevant exercises.
Equipment filters exclude unavailable equipment.
Exercise alternatives retain reasonable muscle-group relevance.
Workout logging records the correct exercise and sets.
Cooldown recommendations match the completed session.
Food filters respect declared allergies and preferences.
Media and accessibility
Animations load correctly.
Failed media falls back to readable instructions.
Keyboard navigation works for essential controls.
Reduced-motion preferences are respected.
Controls and text remain usable on small screens.
Reliability and security
Invalid API inputs are rejected.
Private records require appropriate authorization.
Secrets are excluded from source control.
Database migrations and seed scripts work.
Critical workflows have automated regression tests.
5. Sprint completion rules

A task is complete only when:

The implementation is committed to version control.
Relevant tests pass.
The feature has been reviewed against its acceptance criteria.
Loading, empty, and error states are handled where applicable.
User-facing instructions are clear and accessible.
Exercise demonstrations and safety-sensitive content receive the appropriate review.
Documentation is updated when setup, APIs, or behavior changes.
6. Risks and mitigations
Risk	Mitigation
Existing repository differs from assumptions	Audit before modifying the architecture
Exercise animations are expensive to produce	Start with a curated library and consistent reusable formats
Incorrect demonstrations could teach poor technique	Require qualified review before publication
Food estimates may be inaccurate	Use reliable data sources and clearly identify estimates
Recommendation logic becomes too complex	Start with transparent rules and expand based on feedback
Scope exceeds sprint capacity	Protect the MVP and defer AI, social, and wearable features
Media performs poorly on mobile	Optimize assets, lazy-load, and provide text fallbacks
7. Release definition

The MVP is ready when a user can:

Choose a target muscle group and available equipment.
Receive a relevant workout.
Watch or read reviewed exercise instructions.
Log the workout.
Follow a suitable post-workout stretch sequence.
View practical local and international pre- and post-workout food suggestions.
Review the completed session.

Final implementation note: Before beginning Sprint 1, compare this plan against the actual repository. Reuse working code, adapt the proposed stack to the existing project, and prioritize a complete end-to-end workout journey over building every advanced feature at once.