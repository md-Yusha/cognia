# Master Prompt — AI Cognitive Gaming & Memory Assistance Platform (SIH PS 26003)
### Antigravity version

Paste this into Antigravity's Manager view as your opening task description for a fresh project workspace.

---

## PROJECT BRIEF

Build a single production-grade React Native (Expo) mobile app used by both patients and caregivers, for elderly dementia patients in India's North Eastern Region. This targets Smart India Hackathon problem statement 26003 (MDoNER). The app must be genuinely usable end-to-end at ~90% completeness — I will add one unique differentiating feature myself afterward, so leave clean extension points but do not leave placeholder/stub screens for anything in the core spec below.

## TECH STACK (fixed — do not substitute without asking)

**Frontend (single app, dual-role)**
- React Native + Expo (managed workflow, Expo Router for navigation)
- NativeWind (Tailwind for RN) — clean, minimal, elderly-friendly UI
- Zustand for client state
- expo-notifications (local, offline-capable reminders), expo-speech (offline TTS)

**Backend**
- Next.js (API routes / route handlers, deployed as the backend layer — no separate server framework)
- Firebase Auth — caregiver login only (phone or email OTP)
- Firestore — primary database, with offline persistence enabled on the client (this is the offline-first mechanism; no separate local DB library needed)
- Firebase Storage — game assets (images/audio), cached locally by the app for offline play
- Firebase Cloud Messaging (FCM) — push notifications for caregiver alerts when online; expo-notifications handles offline-capable local reminders (medicine/hydration/appointments) independently of connectivity

## AUTH / ACCESS MODEL — READ CAREFULLY

- **Caregivers** authenticate normally via Firebase Auth (phone or email).
- **Patients do not log in at all.** No passwords, no accounts. A caregiver creates a patient profile under their own account, and the app generates a short, simple, memorable code (e.g. 4–6 digits or a short word+number combo) tied to that patient profile in Firestore.
- **App launch screen**: a large, simple "Enter your code" input as the primary/default view (this is the patient path — assume most people opening the app are patients or a family member opening it for them). A small, unobtrusive "Caregiver Login" button/link at the top of the screen leads to the Firebase Auth flow instead.
- Once a valid code is entered, the app loads that patient's session locally (store the resolved patient ID securely on-device, e.g. SecureStore) and takes them straight into the patient experience — no further steps.
- Caregivers, once logged in, see a dashboard of the patients they've created, can add new patients (generating a new code each time), view each patient's progress, manage reminders, and see alerts.

## CORE FEATURES (build all of these — this is the 90%)

1. **Patient code flow**: code generation (unique per patient, collision-checked), code entry screen, validation against Firestore, local session persistence so the patient doesn't need to re-enter the code every time they open the app on the same device.
2. **Caregiver flow**: Firebase Auth login/signup, "my patients" list, create-patient form (name, basic profile info, language preference) that generates and displays the code clearly (with a share/copy option), per-patient detail view.
3. **Cognitive games module**: at least 4 game types — memory-match (image pairs), pattern/object recognition, daily-routine recall (sequencing cards), attention/concentration (timed focus tasks). Each game logs accuracy + reaction time per session to Firestore (queued locally and synced when online, via Firestore's built-in offline persistence).
4. **Adaptive difficulty**: a Next.js API route that takes a patient's recent session data and returns a difficulty tier per game; cache the last-known tier on-device so difficulty still adapts sensibly even when the device is offline and hasn't reached the API recently. Simple rules-based logic (rolling accuracy + response-time trend) is fine — architect it so the logic could later be swapped for a real model.
5. **Offline-first play**: the app must be fully playable with zero connectivity — games, TTS prompts, and local reminders all work offline; Firestore's offline cache handles queuing writes until reconnected. Test this explicitly (airplane mode → play a full game session → reconnect → verify sync).
6. **Multilingual + voice**: i18n setup (English + at least 2 NER regional languages — ask me which if unsure, default to Assamese and Khasi) using expo-localization + i18next; TTS prompts via expo-speech; large-text, high-contrast, icon-first UI throughout — big tap targets, minimal text density, designed for elderly/dementia users specifically.
7. **Reminders**: caregiver sets medicine/hydration/daily-activity/appointment reminders from their dashboard; these sync to the patient's device and fire as local notifications regardless of connectivity; simple acknowledge/snooze UI on the patient side.
8. **Caregiver monitoring**: per-patient cognitive trend view (accuracy/response-time over time, per game), activity/engagement level, and an alert feed (missed reminders, notable performance drops) — all within the same app, not a separate web dashboard.
9. **Data model**: design the Firestore schema now (patients, caregivers, game sessions, reminders, codes) so the sync and analytics work in feature 8 doesn't need rework later. Include basic Firestore security rules enforcing that a caregiver can only read/write their own patients' data, and that patient devices can only access the one patient record their stored code resolves to.

## HOW I WANT YOU TO WORK (use Antigravity's agent-first workflow properly)

1. **Use Planning Mode before writing any code.** Read this whole brief and generate a task-list Artifact and an implementation-plan Artifact covering the phases below. Ask me for clarification on anything ambiguous (especially the accessibility judgment calls flagged below) before starting execution.
2. **Work phase by phase, committing after each one**:
   - Phase 0: Expo app scaffold + NativeWind setup, Next.js API scaffold, Firebase project wiring (Auth, Firestore, Storage, FCM), env setup
   - Phase 1: Firestore schema + security rules; patient-code generation and resolution logic
   - Phase 2: App-launch flow — code entry screen (default) + caregiver login button + Firebase Auth flow
   - Phase 3: Caregiver dashboard-in-app — patient list, create-patient (code generation + display), patient detail view
   - Phase 4: The 4 cognitive games, fully playable, writing session data to Firestore with offline persistence enabled
   - Phase 5: Next.js adaptive-difficulty API route + integration so game difficulty actually changes based on it, with sensible offline fallback
   - Phase 6: Reminders — caregiver-set, synced to patient device, firing as local notifications offline
   - Phase 7: i18n + voice (TTS prompts, language switcher) + elderly-friendly UI pass across all screens
   - Phase 8: Caregiver monitoring views (trend charts, engagement levels, alert feed) using synced Firestore data
   - Phase 9: Production hardening — error boundaries, loading/empty/offline states everywhere, input validation, Firestore rules tested, basic automated tests for the code-resolution flow and the adaptive-difficulty logic specifically (these are the riskiest parts)
3. **Use browser verification wherever the work has a web-testable surface.** Run the Next.js API and the Expo web build, drive them through the browser tool, and produce a Verification artifact (screenshots or a recording) for each phase before marking it done — especially for the code entry flow, caregiver login, and the games. For pure on-device native behavior (e.g. actual airplane-mode testing, push notification delivery) that the browser can't observe, call this out explicitly in the artifact and tell me what to manually check on a device instead of silently marking it verified.
4. **Use the Manager view to parallelize independent phases** (e.g. the games module vs. the caregiver dashboard vs. the Next.js adaptive-difficulty route) rather than serializing everything through one agent session.
5. **Ask me before making a judgment call that affects UX for elderly/dementia users** (e.g., code length/format, session length, font sizing, how aggressive difficulty adaptation should be, what happens if a patient enters a wrong code repeatedly) — don't silently guess on accessibility-critical decisions.
6. **Do not stub the 10%.** Everything listed under Core Features must be real and working, not a TODO comment. I'll bring the differentiating feature myself once this is solid.
7. At the end of each phase, give me the artifact trail (plan, task list, verification) so I can review before you move to the next phase — don't run in full autopilot across the whole project unattended.

## DEFINITION OF DONE FOR THIS PASS

- App installs and runs via `expo start` with zero crashes on a clean checkout
- Patient code entry and caregiver login both work end-to-end from the same launch screen
- Caregiver can create a patient, get a code, and that code logs a patient into their own session on a different device
- Full offline play → reconnect → sync cycle demonstrably works (flagged for manual on-device verification per point 3 above)
- All 4 games playable with adaptive difficulty visibly changing
- Reminders fire locally without connectivity (flagged for manual on-device verification)
- Caregiver can see real synced session data and trends for a patient
- Firestore security rules enforce the access boundaries described above
- Artifacts (plans, task lists, verifications) are complete and current for every phase
- No hardcoded secrets, clear .env.example for both the Expo app and the Next.js API

Start by producing the plan and task-list Artifacts and confirming the phase breakdown with me before executing anything.
