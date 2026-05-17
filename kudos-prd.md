# PRD: Kudos

## 1. Product summary

**Kudos** is a privacy-first classroom reward web app for teachers. It helps a teacher quickly award stars or points to students during a live lesson, while optionally showing a beautiful read-only classroom display on a digital whiteboard.

The product is designed for fast, low-friction classroom use: the teacher should be able to reward positive behavior in real time without interrupting teaching flow. The student-facing display should make progress visible and motivating without turning corrections or lost points into a public spectacle.

The application will be hosted on Vercel at a custom subdomain, expected to be `kudos.domain.com` or equivalent.

The implementation must follow the coding guidelines set in `.augment/rules/astro-dev-pro.md`.

## 2. Background and problem statement

Teachers often want a lightweight way to reinforce good classroom behavior in real time. Existing reward systems can be too heavy, too game-like, too privacy-invasive, or too slow to use during active teaching.

The core classroom need is simple:

* The teacher wants to define a class roster.
* The teacher wants to define clear classroom rules and goals.
* The teacher wants to award stars quickly when students demonstrate desired behavior.
* The students benefit from seeing progress immediately on a shared classroom display.
* The teacher must remain the only person who can add or remove stars.
* The system should minimize stored personal data and avoid permanent cloud storage of student information whenever possible.

Kudos should feel like a teaching aid, not an administrative system.

## 3. Goals

### 3.1 Product goals

* Let a teacher create and manage one or more local class rosters.
* Let a teacher import and export class data as local JSON files.
* Let a teacher define class rules, session goals, and optional rewards.
* Let a teacher launch a temporary live session.
* Provide a private teacher control view for awarding or removing stars.
* Provide a read-only student display view that can be shown on a classroom whiteboard.
* Make star awards feel immediate, positive, and visually rewarding.
* Make star removals possible but visually quiet and non-dramatic.
* Avoid permanent cloud storage of student data.
* Make sessions temporary and self-expiring.

### 3.2 Technical goals

* Build with Astro, Bun, UnoCSS, and Svelte/Solid according to `.augment/rules/astro-dev-pro.md`.
* Use Astro as the application shell and routing layer.
* Use Svelte 5 for the main interactive islands unless a strong reason emerges to use Solid.
* Use Vercel for hosting and server-side endpoints.
* Use a minimal ephemeral relay for live sessions.
* Keep class templates local-first in the teacher browser.
* Keep imported/exported data versioned and validated.
* Keep data access paths modular so local-only mode and live-session mode can share the same domain model.

## 4. Non-goals

Kudos is not intended to be a full learning management system.

Out of scope for the first version:

* Permanent student accounts.
* Parent accounts.
* Student login.
* Long-term cloud-hosted class history.
* Gradebook features.
* Attendance tracking.
* Messaging between teachers, students, and parents.
* School-wide administration.
* Complex analytics dashboards.
* Native mobile apps.
* Firebase or Supabase as the default persistence layer.

## 5. Target users

### 5.1 Primary user: teacher

The teacher creates rosters, defines rules, starts sessions, awards stars, removes stars when necessary, and optionally exports class/session data locally.

Primary needs:

* Speed.
* Reliability.
* Privacy.
* Simple setup.
* Low cognitive load during class.
* Good display experience for students.

### 5.2 Secondary users: students

Students view the read-only display on the classroom screen. They do not interact with the app directly.

Primary needs:

* Clear visual feedback.
* Motivation.
* Understandable goals and rules.
* A positive, calm classroom tone.

## 6. Product principles

### 6.1 Local-first

Class templates should live in the teacher’s browser by default. Teachers can export JSON files and re-import them later. The app should not require a cloud account or permanent database just to save a roster.

### 6.2 Privacy-minimizing

The app should avoid storing personally identifiable student information in the cloud. If live sessions require temporary remote state, that state should be minimal, short-lived, and automatically deleted.

### 6.3 Teacher-only control

Only the teacher view can modify session state. The display view must be read-only.

### 6.4 Positive reinforcement first

The app should primarily celebrate desired behavior. Star removal is supported, but the student-facing UI should avoid shame, public callouts, harsh animations, or punitive visuals.

### 6.5 Fast in the moment

The teacher should be able to award stars while teaching without opening menus, confirming every click, or searching through complicated screens.

### 6.6 Beautiful but not distracting

The display should look modern, warm, and engaging, but it should not become so flashy that it distracts from the lesson.

## 7. Core use cases

### 7.1 Create a class roster

A teacher creates a class with a class name and student display names. The teacher can add, edit, remove, sort, and optionally group students.

The default should encourage display names rather than full legal names.

### 7.2 Import a class roster

A teacher imports a JSON file containing a previously exported class template. The app validates the file before loading it. If the schema version is old but supported, the app should migrate it safely.

### 7.3 Export a class roster

A teacher exports the current class template as a local JSON file. The export should include class name, display names, rules, reward settings, and preferences, but should not include unnecessary runtime session state unless the teacher explicitly exports a session summary.

### 7.4 Define rules

A teacher defines rules for earning and losing stars. Rules are written in plain language and can be shown on the student display.

Examples of rule categories:

* Raise your hand before speaking.
* Start work quickly and quietly.
* Ask thoughtful questions.
* Help your group stay focused.
* Listen while others are speaking.
* Follow instructions after the first reminder.

Rules should support positive framing by default.

### 7.5 Define session goals

A teacher defines one or more goals for the session.

Goal types may include:

* Class-wide star target.
* Individual participation target.
* Group target.
* Behavior-specific target.
* Custom text goal.

The design should avoid encouraging shallow point-farming. For example, “raise your hand before speaking” is preferable to “raise your hand five times.” If quantity-based goals are used, the teacher should be able to combine them with quality language.

### 7.6 Define optional rewards

A teacher may define a reward for reaching a goal.

Reward examples:

* Good note home to parents.
* Teacher helper privilege.
* Choose a short brain break.
* Choose a warm-up activity.
* Class game for five minutes.
* Positive message on the board.

Rewards may be shown publicly or kept private.

### 7.7 Start a local-only session

A teacher can run Kudos entirely in one browser without a live remote display. This mode uses local browser storage only.

### 7.8 Start a live classroom session

A teacher starts a temporary live session. The app generates:

* A private teacher control URL or authenticated teacher state.
* A read-only display URL for the classroom screen.
* Optionally, a QR code or copyable display link.

The display URL should not allow mutations.

### 7.9 Award a star

The teacher can award a star quickly by clicking a student card, pressing a plus button, using keyboard controls, or using a bulk selection flow.

The student display should update almost immediately.

### 7.10 Remove a star

The teacher can remove a star using right-click, a minus button, keyboard controls, or another explicit control.

The student display should update quietly. No loud negative animation should be shown by default.

### 7.11 Undo an action

The teacher can undo the most recent star change. Undo should be visible and easy to access.

### 7.12 End a session

The teacher can end a session manually. Ending a live session should purge temporary remote session state. The teacher may optionally export a local summary before ending.

### 7.13 Auto-expire a session

Live sessions should automatically expire after a configured time window. Suggested default: same school day or a short fixed TTL such as four to eight hours.

## 8. UX requirements

## 8.1 Landing/setup view

The landing page is the teacher’s setup workspace.

It should include:

* App title and short explanation.
* Class template selector or “new class” action.
* Class name field.
* Student roster editor.
* Rules editor.
* Session goals editor.
* Reward settings.
* Import JSON action.
* Export JSON action.
* Start local session action.
* Start live session action.

The setup page should be usable on a laptop without requiring a large screen.

## 8.2 Teacher control view

The teacher control view should be optimized for speed.

Required elements:

* Current class/session name.
* Visible session status.
* Student grid or list.
* Current star count per student.
* Fast add star action.
* Fast remove star action.
* Undo action.
* Reset or clear session action with confirmation.
* End session action.
* Display link copy action.
* Optional full-screen toggle.
* Optional reason presets.
* Optional filters, groups, or sorting.

Interaction expectations:

* Left click on a student should add a star or open the fastest configured positive action.
* Right click should remove a star if enabled.
* Plus and minus buttons should always be available for accessibility and discoverability.
* Keyboard shortcuts should be considered for advanced teacher speed.
* Bulk award should be available for group moments.

## 8.3 Student display view

The student display view is read-only and designed for a classroom whiteboard.

Required elements:

* Class/session title.
* Optional session goal panel.
* Optional rules panel.
* Student display grid.
* Star totals.
* Positive award animations.
* Quiet updates for removals.
* Connection/session status.

The display should be:

* Full-screen friendly.
* Readable from a distance.
* Calm and modern.
* Touch-safe and mutation-free.
* Resistant to accidental interaction.

## 8.4 Visual tone

The visual direction should be modern, warm, friendly, and classroom-appropriate.

Suggested style attributes:

* Large rounded cards.
* Soft shadows.
* High readability.
* Spacious layout.
* Joyful but restrained animations.
* Clear contrast.
* No harsh red punitive states by default.

## 8.5 Star removal behavior

Star removal must be supported, but it should be intentionally less dramatic than star awards.

Default behavior:

* Teacher view updates immediately.
* Student display total changes quietly.
* No negative sound.
* No public “lost star” message.
* No shaming animation.

Optional teacher settings:

* Require reason for minus.
* Hide negative changes from recent activity feed.
* Disable right-click removal.
* Require modifier key for removal.

## 8.6 Goals and point farming

The app should help teachers avoid goals that unintentionally reward low-quality behavior.

Design direction:

* Prefer behavior-quality goals over pure quantity goals.
* Let teachers define custom text goals.
* Provide positive rule templates.
* Allow goals to be class-wide rather than purely individual.
* Consider showing “today’s focus” rather than a strict checklist.

## 9. Functional requirements

### 9.1 Class templates

The app must support local class templates with:

* Template ID.
* Class name.
* Student display names.
* Optional student groups.
* Optional student ordering.
* Rules.
* Goals.
* Reward settings.
* Teacher preferences.
* Schema version.

### 9.2 Student records

Student records should use display names. Full legal names should not be required.

Each student should have:

* Stable local ID.
* Display name.
* Optional group.
* Optional avatar/initials/color setting.
* Active/inactive state.

### 9.3 Rules

Rules should support:

* Title.
* Description.
* Type: earn, lose, or neutral expectation.
* Visibility: teacher-only or visible on display.
* Optional reason preset link.

### 9.4 Goals

Goals should support:

* Goal title.
* Goal description.
* Goal scope: class, group, individual, or custom.
* Optional target number.
* Optional reward.
* Visibility setting.
* Active/inactive state.

### 9.5 Rewards

Rewards should support:

* Reward title.
* Reward description.
* Visibility setting.
* Completion state.

### 9.6 Session state

A live or local session should include:

* Session ID.
* Class template snapshot.
* Started timestamp.
* Expiry timestamp for live sessions.
* Current star totals.
* Star event log for undo and summary.
* Display settings.
* Session status.

### 9.7 Star events

Star changes should be represented as events rather than only mutating totals.

Each event should include:

* Event ID.
* Session ID.
* Student ID.
* Delta value.
* Timestamp.
* Optional reason.
* Actor type.
* Undo metadata.

Totals should be derived or safely synchronized from the event history.

### 9.8 Import/export

The app must support JSON import/export.

Requirements:

* Versioned schema.
* Validation before import.
* Clear error messages for invalid files.
* Safe migration path for older supported versions.
* Export class template separately from session summary.
* No automatic cloud upload during import/export.

### 9.9 Live session creation

The teacher can create a live session from a class template.

The app should generate:

* Session ID.
* Teacher write secret or secure teacher authorization state.
* Read-only display token or display route.
* Expiry timestamp.

The live session state is stored temporarily in an ephemeral remote relay.

### 9.10 Live session updates

Teacher actions should update the temporary session state through server-side endpoints.

The display should receive updates via the simplest reliable approach for Vercel:

* Initial implementation: short polling against a read-only endpoint.
* Later enhancement: SSE or a managed realtime provider if needed.

Polling should be tuned to feel live without excessive network usage.

### 9.11 Session expiry and purge

Live sessions should self-expire.

Requirements:

* Remote session state has a TTL.
* Teacher can manually end and purge a session.
* Display page should show a friendly expired-session message.
* Expired session URLs should no longer expose roster data.

## 10. Privacy and GDPR-oriented requirements

This product should be designed around data minimization.

### 10.1 Data minimization

* Use display names by default.
* Do not require full names.
* Do not require student accounts.
* Do not require parent data.
* Do not store class templates permanently in the cloud by default.
* Avoid analytics that include roster data or student identifiers.

### 10.2 Local data

Local class templates may be stored in the teacher’s browser.

The app should make clear that:

* Local browser data can be cleared by the browser/user.
* Teachers should export JSON if they want a backup.
* JSON files are controlled by the teacher.

### 10.3 Temporary remote data

Live session state may be temporarily stored in an ephemeral relay.

Requirements:

* Short TTL.
* Manual purge option.
* No long-term persistence by default.
* Minimal fields required for display and sync.
* No unnecessary server logs containing roster payloads.

### 10.4 Access control

* Teacher write capability must be protected.
* Student display route must be read-only.
* Mutating endpoints must reject requests without valid teacher authorization.
* Display routes should not expose teacher secrets.

### 10.5 Privacy copy

The app should include simple teacher-facing privacy copy explaining:

* What is stored locally.
* What is temporarily sent during live mode.
* How to avoid personal data by using display names.
* How to delete or end a live session.

## 11. Technical architecture

## 11.1 Stack

* Astro for routes, layouts, server-side composition, and app shell.
* Bun for package management and task execution.
* UnoCSS with `presetWind4` for styling.
* Svelte 5 for primary interactive UI islands.
* Solid may be used only when it is a better fit or already present in surrounding code.
* Vercel for hosting and server-side runtime.
* Ephemeral Redis-compatible storage for temporary live sessions.

Implementation must follow `.augment/rules/astro-dev-pro.md`.

## 11.2 Application layers

### Routes layer

Astro pages own top-level routes, layouts, page metadata, and composition.

Expected route families:

* Home/setup route.
* Local session route.
* Teacher live session route.
* Student display route.
* Import/export route or integrated panels.
* API/server endpoint routes for session operations.

### Interactive UI layer

Svelte 5 islands should handle:

* Roster editing.
* Rules editing.
* Goal editing.
* Teacher control grid.
* Student display board.
* Import/export interactions.
* Live session status.

Hydration should be deliberate and minimal, following `.augment/rules/astro-dev-pro.md`.

### Domain layer

The domain layer should define framework-independent concepts:

* Class template.
* Student.
* Rule.
* Goal.
* Reward.
* Session.
* Star event.
* Derived totals.
* Import/export schema.

The domain layer should not depend on Astro, Svelte, Vercel, Redis, or browser APIs.

### Persistence layer

The persistence layer should use adapters.

Required adapters:

* Local browser persistence adapter.
* JSON import/export adapter.
* Ephemeral live-session adapter.

The UI should use domain services rather than directly calling storage APIs.

### Realtime/session relay layer

The relay layer should expose high-level operations:

* Create live session.
* Read display state.
* Apply star event.
* Undo event.
* Update goals or display settings.
* End session.
* Refresh expiry if appropriate.

The first implementation should use request/response endpoints plus short polling rather than a custom WebSocket server.

### Validation layer

Validation must be centralized and shared by import/export and server endpoints.

Validation responsibilities:

* Ensure imported JSON is safe and structurally valid.
* Ensure session mutation payloads are valid.
* Ensure star totals cannot become invalid.
* Ensure display route receives only read-safe state.

## 12. Vercel deployment model

Vercel should host the Astro app and provide server-side endpoints for live session operations.

Architecture direction:

* Static and server-rendered Astro routes hosted on Vercel.
* Server endpoints for session creation, updates, display reads, and purge.
* Ephemeral Redis-compatible storage connected to Vercel for TTL-based live session state.
* No custom WebSocket server in the initial version.
* Polling-based display updates in the first implementation.

Rationale:

* Vercel is suitable for Astro hosting and server endpoints.
* Vercel Functions are suitable for request/response session operations.
* Vercel Functions should not be treated as always-on WebSocket room servers.
* Redis TTL-style storage is a good fit for temporary classroom sessions.

## 13. Data model overview

### 13.1 Class template

Represents a reusable local class setup.

Contains:

* Schema version.
* Template ID.
* Class name.
* Students.
* Rules.
* Goals.
* Rewards.
* Preferences.
* Last updated timestamp.

### 13.2 Student

Represents a display participant.

Contains:

* Student ID.
* Display name.
* Optional group.
* Optional display metadata.
* Active state.

### 13.3 Rule

Represents a behavior expectation or star reason.

Contains:

* Rule ID.
* Title.
* Description.
* Category.
* Visibility.
* Active state.

### 13.4 Goal

Represents a session target.

Contains:

* Goal ID.
* Title.
* Description.
* Scope.
* Optional target value.
* Optional reward ID.
* Visibility.
* Active state.

### 13.5 Reward

Represents a reward associated with goals.

Contains:

* Reward ID.
* Title.
* Description.
* Visibility.
* Completion state.

### 13.6 Session

Represents a local or live lesson session.

Contains:

* Session ID.
* Session mode.
* Class snapshot.
* Started timestamp.
* Expiry timestamp if live.
* Status.
* Display settings.
* Star events.
* Derived totals.

### 13.7 Star event

Represents an atomic star change.

Contains:

* Event ID.
* Student ID.
* Delta.
* Timestamp.
* Optional reason ID.
* Optional note.
* Undo status.

## 14. API/server endpoint requirements

The exact endpoint design may evolve, but the server surface should remain narrow.

Required server capabilities:

* Create live session.
* Fetch read-only display state.
* Apply star event.
* Undo latest event or undo specific event.
* Update live session settings where needed.
* End and purge live session.
* Validate teacher write authorization.
* Enforce session TTL.

Security expectations:

* Teacher secrets must never be exposed in display state.
* Display tokens must not grant write access.
* Mutating endpoints must validate authorization and payloads.
* Expired sessions must reject reads and writes.

## 15. Accessibility requirements

Kudos should be usable without relying only on mouse interaction.

Requirements:

* Plus and minus buttons must be available in addition to click/right-click.
* Keyboard navigation should be supported for the teacher grid.
* Buttons must have accessible names.
* Focus states must be visible.
* Color must not be the only way to communicate state.
* Student display must maintain strong contrast and large text.
* Motion should be tasteful and not excessive.
* Reduced-motion preferences should be respected where practical.

## 16. Performance requirements

The app should feel instant in a classroom.

Requirements:

* Teacher star actions should update locally immediately.
* Live display updates should appear quickly enough to feel real time.
* Initial page loads should be fast on school networks.
* The display grid should handle typical class sizes comfortably.
* Local-only mode should work without network dependency after load.
* Polling should be efficient and should avoid excessive payload size.

Target classroom scale:

* Typical class size: 15–35 students.
* Stretch class size: 50 students.
* One teacher device and one classroom display device per session.
* Multiple concurrent sessions may exist across different teachers, but this is not a school-wide multi-tenant admin product in v1.

## 17. Reliability requirements

The app should degrade gracefully.

Requirements:

* If live sync fails, the teacher view should show connection status.
* The teacher should not lose local session state during brief network interruptions.
* Display should show reconnecting or stale state status when needed.
* Local JSON export should remain available even if live relay is unavailable.
* Expired sessions should show friendly messaging.
* Import errors should be clear and recoverable.

## 18. Security requirements

* Do not trust client input.
* Validate all server-side mutation payloads.
* Keep teacher write secrets separate from display URLs.
* Avoid exposing full class template data if not required by display mode.
* Do not store permanent student data in the remote relay.
* Use secure random identifiers for live session tokens.
* Prevent obvious replay or mutation attempts against expired sessions.
* Consider rate limiting write endpoints.

## 19. Settings and preferences

Teacher-configurable settings should include:

* Default star value for click.
* Enable or disable right-click removal.
* Require reason for removal.
* Show or hide rules on student display.
* Show or hide goals on student display.
* Show or hide reward on student display.
* Display density.
* Sorting mode.
* Animation level.
* Session expiry duration.
* Use names, initials, or custom display names.

## 20. Analytics and telemetry

Default stance: avoid analytics that process student names or classroom behavior events.

If analytics are added later, they should be product-level and privacy-preserving, such as:

* Page load errors.
* Feature usage counts without roster payloads.
* Performance metrics.

Analytics must not include student names, star events tied to identifiable students, or exported class data.

## 21. MVP scope

### MVP 1: Local-first classroom app

Required:

* Landing/setup page.
* Class roster editor.
* Rules editor.
* Goals editor.
* Reward editor.
* JSON import/export.
* Local browser persistence.
* Teacher control grid.
* Student display mode in same browser/session.
* Add/remove stars.
* Undo latest action.
* Reset session.
* End session.

### MVP 2: Vercel live session mode

Required:

* Start live session.
* Generate display URL.
* Teacher-only write authorization.
* Read-only student display route.
* Temporary remote session state with TTL.
* Polling-based display updates.
* Manual end/purge.
* Expired-session UI.

### MVP 3: Classroom polish

Required:

* Better animations.
* Bulk award.
* Keyboard controls.
* Reason presets.
* Group view.
* Optional session summary export.
* Display customization.
* Privacy copy.

## 22. Future enhancements

Possible future features:

* Multiple classes in local library.
* Class grouping or teams.
* Seating chart mode.
* Random student picker.
* Timer or lesson phase mode.
* Sound effects with teacher control.
* Celebration mode when class goal is reached.
* Printable summary.
* Offline-first PWA behavior.
* Optional encrypted local backups.
* Optional teacher account if a future version needs cross-device roster sync.

## 23. Open questions

* Should live session state include student names, or should the display receive only display aliases and IDs?
* Should the teacher control URL be protected by a token in the URL, a local browser secret, or optional teacher login?
* What is the default session expiry time?
* Should star removals require a reason by default?
* Should quantity-based individual goals be discouraged in the UI copy?
* Should rewards be shown publicly by default?
* Should class templates support multiple groups from v1?
* Should the app support sound effects from v1, or keep it visual-only?
* Should session summary export include negative events or only totals?

## 24. Acceptance criteria

### 24.1 Local setup acceptance criteria

* A teacher can create a class locally.
* A teacher can add, edit, and remove student display names.
* A teacher can define at least one rule.
* A teacher can define at least one session goal.
* A teacher can export the class as JSON.
* A teacher can import the exported JSON successfully.
* Invalid JSON produces a useful error message.

### 24.2 Teacher control acceptance criteria

* A teacher can start a session.
* A teacher can add a star to a student with one fast action.
* A teacher can remove a star with an explicit supported action.
* Plus and minus controls are visible and usable.
* A teacher can undo the latest star change.
* Star totals update immediately in the teacher view.

### 24.3 Student display acceptance criteria

* The display view is read-only.
* The display view clearly shows student names and star totals.
* Positive changes are visible and rewarding.
* Negative changes are quiet and non-dramatic.
* The display is readable from a classroom whiteboard.

### 24.4 Live session acceptance criteria

* A teacher can create a temporary live session.
* The app provides a read-only display URL.
* The display URL cannot mutate session state.
* Teacher actions update the display within an acceptable near-realtime window.
* The session expires automatically.
* The teacher can manually end and purge the session.
* Expired session URLs no longer expose active roster data.

### 24.5 Technical acceptance criteria

* The implementation follows `.augment/rules/astro-dev-pro.md`.
* Astro remains the application shell and routing layer.
* Interactive teacher/display surfaces are implemented as deliberate hydrated islands.
* Styling follows the UnoCSS approach described in `.augment/rules/astro-dev-pro.md`.
* Import/export schemas are versioned and validated.
* Live session relay logic is isolated behind an adapter.
* No Firebase or Supabase dependency is introduced by default.
* No permanent cloud storage of class templates is introduced by default.

## 25. Risks and mitigations

### Risk: Live sync without permanent storage is more complex than local-only mode

Mitigation: Build local-only mode first. Add live sessions behind a relay adapter.

### Risk: Serverless is not suitable for custom WebSocket room hosting

Mitigation: Use Vercel endpoints plus TTL-based Redis-compatible storage and polling for v1.

### Risk: Student names are personal data

Mitigation: Default to display names, initials, or aliases. Avoid permanent cloud storage. Add clear privacy copy.

### Risk: The reward system could encourage point farming

Mitigation: Provide behavior-quality rule templates, class-wide goals, and teacher-controlled custom goals.

### Risk: Minus points could feel punitive

Mitigation: Keep removals visually quiet, optionally require reasons, and default the display toward positive reinforcement.

### Risk: Teacher actions need to be very fast

Mitigation: Optimize the teacher grid for one-click positive actions, visible controls, keyboard shortcuts, and bulk award.

## 26. Recommended implementation sequence

1. Establish Astro/Vercel project structure according to `.augment/rules/astro-dev-pro.md`.
2. Build domain models and validation for class templates, students, rules, goals, rewards, sessions, and star events.
3. Build local persistence and JSON import/export.
4. Build setup page.
5. Build teacher control island.
6. Build student display island.
7. Add local-only session flow.
8. Add live session server endpoints.
9. Add ephemeral relay adapter with TTL.
10. Add display polling and read-only live route.
11. Add privacy copy, session expiry UI, and purge behavior.
12. Polish classroom UX, animations, keyboard controls, and bulk actions.

## 27. Definition of done

The first production-ready version of Kudos is done when:

* A teacher can manage a class locally.
* A teacher can define rules, goals, and rewards.
* A teacher can import and export class JSON.
* A teacher can run a local session.
* A teacher can run a temporary live session on Vercel.
* A whiteboard display can follow the teacher’s star changes in near real time.
* The display view is read-only.
* Live sessions auto-expire and can be manually purged.
* The app avoids permanent cloud storage of student rosters by default.
* The codebase follows `.augment/rules/astro-dev-pro.md`.
