# Phone torch, calm audio, and offline SOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A high stress reading from the phone’s own sensors sends the caregiver an SOS. The help button does the same thing immediately. Uneasy stress calms the patient and does not message anyone.

**Architecture:** `src/services/stressMonitor.ts` scores each sample as `calm`, `uneasy`, or `high`. `src/services/stressSos.ts` turns that level into an action. `calm` does nothing. `uneasy` plays the grounding line or family voice. `high` from the monitor, after two readings in a row, turns on the LED, plays that audio, saves an SOS on the phone, posts it to `EXPO_PUBLIC_API_BASE_URL` (`http://192.168.0.7:3001` on this LAN), and opens the Messages composer if the post fails. The help button skips the two-reading wait and the cooldown. Bluetooth advertising is a separate EAS development build and is skipped inside Expo Go.

**Tech Stack:** Expo SDK 57, `expo-camera` torch, `expo-audio` (not `expo-av`), `expo-sms`, `expo-speech`, `expo-location`, AsyncStorage, Next.js alerts route, EAS development APK, a local Expo module for BLE advertising, `react-native-ble-plx` for scanning only.

## Global Constraints

- Do not put `DATABASE_URL` or the Postgres password in any `EXPO_PUBLIC_` variable or client file.
- Patient copy stays short, one action, Nunito Bold, at least 20px.
- Do not show a map to the patient. Place name only, from `getCurrentLiveLocation()` in `src/services/locationService.ts`.
- Do not store raw ambient audio. A family note is one clip of at most 8 seconds.
- Do not add a white or amber screen flash. The light is the phone LED only.
- Do not strobe the LED every few hundred milliseconds. Hold it on until the alert ends.
- Do not send SMS silently. `SMS.sendSMSAsync` opens the composer. The person taps Send.
- A monitored `high` reading is an SOS. Do not wait for the help button.
- `uneasy` never texts, never posts an alert, and never turns the LED on.
- Automatic monitor alerts need two `high` readings in a row, then a 15 minute cooldown. The help button ignores both gates.
- Do not keep a noise recording. Read the meter, then delete the file.
- Do not install `react-native-ble-plx` as the patient advertiser. That library scans and connects. It does not advertise.
- Do not call BLE APIs when `Constants.executionEnvironment === 'storeClient'` (Expo Go).
- Install Expo packages with `npx expo install <pkg> -- --legacy-peer-deps` when npm reports `ERESOLVE`.
- Node on this machine is v20.19.1. Metro warns that it wants `^20.19.4`. That warning is not a failure.

## Research decisions (do not reopen these)

| Option | Decision |
| --- | --- |
| White screen flash | Removed from `CalmDay.tsx` and `StressHost.tsx`. Do not put it back. |
| `CameraView` prop `enableTorch` | Use this. SDK 57 documents it for Android, iOS, and web. Mount a 1×1 back camera. It works in Expo Go 57 and in an EAS build. |
| `CameraView` prop `flash` | Do not use. That fires the flash when taking a photo. It is not a flashlight. |
| `expo-brightness` | Do not use. It changes screen brightness, not the LED. |
| Rapid torch blink (350ms) | Do not use. iOS drops the camera session when torch mode is toggled that fast. Hold the LED on. |
| `expo-av` | Do not add it. SDK 57 recording and playback are `expo-audio`. |
| `react-native-ble-plx` as advertiser | Cannot advertise. Use it only on the caregiver phone to scan. |
| `react-native-ble-advertiser` | Android only and unmaintained. Use a local Expo module instead so iOS and Android share one JS API. |
| Silent SMS | Impossible on iOS, including an EAS build. Android `SmsManager` needs `SEND_SMS`, which app stores reject for this use. Composer only. |
| Wi-Fi Direct, Nearby Connections, Multipeer | Do not build. Android and iOS use different stacks, and the same-house case is already covered by the home server plus BLE. |
| LoRa or mesh radio | Needs hardware that is not in this app. |
| Ultrasound between phones | Too unreliable indoors. |
| BLE range | Same room or a short path. Not a hillside. iOS drops the local name when the app is backgrounded. The patient app stays in the foreground for the 60 second advertisement. |
| Help button as the only SOS | Do not do this. The button is the manual path. The sensor score is the automatic path. |
| One high sample texts the family | Do not do this. Require two `high` samples in a row, then wait 15 minutes. A single noisy minute must not open Messages. |
| Constant `38` from `sampleNoise` | Replace it. That stub can never raise “Noisy room”, so automatic SOS ignores the microphone. Meter for 8 seconds and discard the file. |
| Caregiver vibration only | Add a short chime and a local notification. Vibration is easy to miss in a pocket. |

## Already done — do not rebuild

- Place name, weekday, and next meal: `src/components/CalmDay.tsx`, mounted from `app/(patient)/home.tsx`.
- “I need help” vibrates for 8 seconds and speaks the place. There is no screen overlay.
- High-stress modal in `src/components/StressHost.tsx` vibrates and speaks. The modal background stays `rgba(0,0,0,0.72)`. There is no white flash.
- Sensor watch every 2 minutes: `startStressWatch` in `src/services/stressMonitor.ts`.
- `POST /api/care/alerts` and `GET /api/care/alerts?since=` in `backend/app/api/care/alerts/route.ts`.
- Caregiver dashboard already polls every 10 seconds and vibrates once. Task 5 changes that interval and adds speech. Do not add a second poll loop.

---

### Task 1: One spoken grounding sentence

**Files:**
- Modify: `src/services/stressMonitor.ts`
- Modify: `src/components/StressHost.tsx`
- Test: `test/stressCopy.test.ts`

**Interfaces:**
- Produces: `groundingLine(date?: Date): string`

- [ ] **Step 1: Write the failing test**

```ts
import { groundingLine } from '../src/services/stressMonitor';

describe('groundingLine', () => {
  it('names the next meal for morning, afternoon, and evening', () => {
    expect(groundingLine(new Date('2026-09-25T08:00:00'))).toBe('Sit down. Breakfast is soon.');
    expect(groundingLine(new Date('2026-09-25T13:00:00'))).toBe('Sit down. You are safe.');
    expect(groundingLine(new Date('2026-09-25T18:00:00'))).toBe('Sit down. Dinner is soon.');
  });

  it('tells the patient to stay in bed at night', () => {
    expect(groundingLine(new Date('2026-09-25T22:30:00'))).toBe('Stay in bed. It is night.');
  });
});
```

Hours match `dayPart()` in `CalmDay.tsx`: before 11 morning, before 16 afternoon, before 21 evening, otherwise night.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest test/stressCopy.test.ts --watchman=false`

Expected: FAIL because `groundingLine` is not exported.

- [ ] **Step 3: Implement the function and use it in the modal**

Add this export next to `reassuranceLine` in `src/services/stressMonitor.ts`. Keep `reassuranceLine` as a wrapper so existing callers do not break.

```ts
export function groundingLine(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return 'Sit down. Breakfast is soon.';
  if (hour < 16) return 'Sit down. You are safe.';
  if (hour < 21) return 'Sit down. Dinner is soon.';
  return 'Stay in bed. It is night.';
}

export function reassuranceLine() {
  return groundingLine();
}
```

In `src/components/StressHost.tsx`, replace the two text blocks inside the modal with one sentence. Delete the “You are safe” title. The only patient sentence is `groundingLine()`. The only button stays `I am okay`.

```tsx
<Text
  className="text-3xl text-[#143825] font-bold text-center mb-6"
  style={{ fontFamily: 'Nunito-Bold' }}
>
  {groundingLine()}
</Text>
```

`handleDismiss` must call `Vibration.cancel()`, `Speech.stop()` from `expo-speech`, and `setReading(null)`.

The high-stress effect speaks `groundingLine()` once. Do not also speak the old “You are safe at home…” sentence.

- [ ] **Step 4: Run the test**

Run: `npx jest test/stressCopy.test.ts --watchman=false`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/stressMonitor.ts src/components/StressHost.tsx test/stressCopy.test.ts
git commit -m "Speak one grounding sentence when stress is high."
```

---

### Task 2: Saved family voice, then a short calm tone

**Files:**
- Create: `src/services/calmAudio.ts`
- Create: `assets/audio/calm-tone.mp3` (original tone, under 3 seconds, not a copyrighted song)
- Modify: `app.json` plugins
- Modify: `app/(caregiver)/patients/[id].tsx` (one record control)
- Modify: `src/components/StressHost.tsx`
- Test: `test/calmAudio.test.ts`

**Interfaces:**
- Consumes: `groundingLine()` from Task 1
- Produces:
  - `saveFamilyNote(patientId: string, uri: string): Promise<void>`
  - `loadFamilyNote(patientId: string): Promise<string | null>`
  - `playCalmingAudio(patientId: string): Promise<'family' | 'tone' | 'speech'>`
- Storage key: `cognia_family_note_${patientId}`

- [ ] **Step 1: Install `expo-audio`**

Run: `npx expo install expo-audio -- --legacy-peer-deps`

Add the plugin to `app.json` `plugins`:

```json
[
  "expo-audio",
  {
    "microphonePermission": "Cognia uses the microphone so a caregiver can record a short voice note.",
    "recordAudioAndroid": true
  }
]
```

Do not install `expo-av`.

- [ ] **Step 2: Write the failing path test**

`playCalmingAudio` needs native audio, so the unit test only covers the storage choice. Mock `expo-audio` in the test file with `jest.mock`.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadFamilyNote, saveFamilyNote } from '../src/services/calmAudio';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

describe('family note storage', () => {
  const patientId = 'patient-note-test';

  afterEach(async () => {
    await AsyncStorage.removeItem(`cognia_family_note_${patientId}`);
  });

  it('returns null when no note is saved', async () => {
    await expect(loadFamilyNote(patientId)).resolves.toBeNull();
  });

  it('returns the uri that was saved', async () => {
    await saveFamilyNote(patientId, 'file:///note.m4a');
    await expect(loadFamilyNote(patientId)).resolves.toBe('file:///note.m4a');
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx jest test/calmAudio.test.ts --watchman=false`

Expected: FAIL because `src/services/calmAudio.ts` does not exist.

- [ ] **Step 4: Implement storage and playback**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { speakPrompt } from './ttsService';
import { groundingLine } from './stressMonitor';

const keyFor = (patientId: string) => `cognia_family_note_${patientId}`;

export async function saveFamilyNote(patientId: string, uri: string) {
  await AsyncStorage.setItem(keyFor(patientId), uri);
}

export async function loadFamilyNote(patientId: string) {
  return AsyncStorage.getItem(keyFor(patientId));
}

export async function playCalmingAudio(patientId: string): Promise<'family' | 'tone' | 'speech'> {
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  const familyUri = await loadFamilyNote(patientId);
  const source = familyUri || require('../../assets/audio/calm-tone.mp3');
  try {
    const player = createAudioPlayer(source);
    player.play();
    return familyUri ? 'family' : 'tone';
  } catch {
    speakPrompt(groundingLine());
    return 'speech';
  }
}
```

Confirm the exact `setAudioModeAsync` field against `node_modules/expo-audio/build/Audio.types.d.ts` after install. SDK 57 uses `playsInSilentMode`. If the installed type names it `playsInSilentModeIOS`, use that name. Do not guess a third name.

On the caregiver patient screen, add one button labeled `Record a calm voice`. Use `useAudioRecorder` from `expo-audio` with `{ ...RecordingPresets.HIGH_QUALITY, directory: 'document' }` so the file is not left in cache. Start recording on press, stop at 8 seconds with `setTimeout`, then `saveFamilyNote(patientId, audioRecorder.uri)`. Replace the previous uri. Do not add a second recorder anywhere else.

In `StressHost`, when `level === 'high'`, call `playCalmingAudio(patient.id)` instead of `speakPrompt(groundingLine())`. The modal still shows `groundingLine()` as text. Speech runs only when playback throws.

- [ ] **Step 5: Run the test**

Run: `npx jest test/calmAudio.test.ts --watchman=false`

Expected: PASS, 2 tests.

- [ ] **Step 6: Device check**

On a phone, record a note, force a high reading, and hear that note. Clear the storage key, force the reading again, and hear `calm-tone.mp3`. Mute the ringer and confirm the note still plays.

- [ ] **Step 7: Commit**

```bash
git add src/services/calmAudio.ts assets/audio/calm-tone.mp3 app.json app/(caregiver)/patients/[id].tsx src/components/StressHost.tsx test/calmAudio.test.ts package.json package-lock.json
git commit -m "Play a saved family voice during high stress."
```

---

### Task 3: Phone LED flashlight

**Files:**
- Create: `src/components/PhoneTorch.tsx`
- Modify: `app.json`
- Modify: `src/components/StressHost.tsx`
- Modify: `src/components/CalmDay.tsx`
- Test: `test/phoneTorch.test.ts`

**Interfaces:**
- Produces: `PhoneTorch` with props `{ on: boolean }`
- The component renders nothing when `on` is false or camera permission is denied.
- The component renders one `CameraView` with `facing="back"` and `enableTorch` when `on` is true and permission is granted.

- [ ] **Step 1: Install `expo-camera`**

Run: `npx expo install expo-camera -- --legacy-peer-deps`

Add the plugin:

```json
[
  "expo-camera",
  {
    "cameraPermission": "Cognia uses the camera light so a caregiver can see you.",
    "recordAudioAndroid": false
  }
]
```

Restart Metro after this install. Installing a native module while Metro is running makes the next reload crash with `Cannot find native module 'ExpoAsset'`. That message is stale Metro state. Kill the server and start it again.

- [ ] **Step 2: Write the failing render test**

`test/phoneTorch.test.ts` does not mount `CameraView`. It tests the decision function so Jest stays on node.

```ts
import { torchShouldMount } from '../src/components/PhoneTorch';

describe('torchShouldMount', () => {
  it('stays off until the alert is on and permission is granted', () => {
    expect(torchShouldMount(false, true)).toBe(false);
    expect(torchShouldMount(true, false)).toBe(false);
    expect(torchShouldMount(true, true)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx jest test/phoneTorch.test.ts --watchman=false`

Expected: FAIL because `torchShouldMount` is not exported.

- [ ] **Step 4: Implement the torch**

```tsx
import React, { useEffect } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';

export function torchShouldMount(on: boolean, granted: boolean) {
  return on && granted;
}

export function PhoneTorch({ on }: { on: boolean }) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (on && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [on, permission, requestPermission]);

  if (!torchShouldMount(on, !!permission?.granted)) return null;

  return (
    <CameraView
      facing="back"
      enableTorch
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
    />
  );
}
```

Wire it in both places:

- `StressHost`: `<PhoneTorch on={!!reading} />` inside the modal. `I am okay` sets `reading` to null, which unmounts the camera and turns the LED off. Also call `Vibration.cancel()`.
- `CalmDay`: `<PhoneTorch on={sosOn} />`. The existing 8 second timeout already sets `sosOn` to false and cancels vibration. The LED follows that same timer.

Do not add a `setInterval` around `enableTorch`. Do not add a full-screen colored overlay.

If `useCameraPermissions` throws because the binary does not include the module, catch it at the `PhoneTorch` boundary and render null. Vibration and speech still run.

- [ ] **Step 5: Run the test**

Run: `npx jest test/phoneTorch.test.ts --watchman=false`

Expected: PASS, 1 test.

- [ ] **Step 6: Device check**

Press `I need help`. The rear LED stays on for about 8 seconds, the phone vibrates, and the screen does not turn white. Press `I am okay` on a high-stress modal and confirm the LED turns off immediately. Deny camera permission and confirm the button still vibrates and speaks.

- [ ] **Step 7: Commit**

```bash
git add src/components/PhoneTorch.tsx src/components/StressHost.tsx src/components/CalmDay.tsx app.json test/phoneTorch.test.ts package.json package-lock.json
git commit -m "Turn on the phone flashlight during help and high stress."
```

---

### Task 4: Save the SOS on the phone, then the home server, then the Messages composer

**Files:**
- Create: `src/services/sosService.ts`
- Modify: `src/services/careApi.ts` (`postStressAlert` accepts `placeName`)
- Modify: `backend/lib/db.ts`
- Modify: `backend/app/api/care/alerts/route.ts`
- Modify: `src/components/CalmDay.tsx`
- Modify: `src/components/StressHost.tsx`
- Test: `test/sosService.test.ts`

**Interfaces:**
- Produces:

```ts
export type SosEvent = {
  id: string;
  patientId: string;
  patientName: string;
  placeName: string;
  latitude: number | null;
  longitude: number | null;
  reasons: string;
  phone: string | null;
  createdAt: number;
  sent: boolean;
};

export function enqueueSos(input: Omit<SosEvent, 'id' | 'createdAt' | 'sent'>): Promise<SosEvent>;
export function flushSosQueue(post: (event: SosEvent) => Promise<void>): Promise<void>;
export function sosMessage(event: Pick<SosEvent, 'patientName' | 'placeName' | 'reasons' | 'latitude' | 'longitude'>): string;
export function caregiverPhone(patient: { emergencyContact?: string; familyCaregivers?: { phone: string }[] }): string | null;
```

- Storage key: `cognia_sos_outbox`
- Home server: `process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.7:3001'`
- Post timeout: 4 seconds

- [ ] **Step 1: Write the failing tests**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { caregiverPhone, enqueueSos, flushSosQueue, sosMessage } from '../src/services/sosService';

const OUTBOX = 'cognia_sos_outbox';

describe('sosService', () => {
  afterEach(async () => {
    await AsyncStorage.removeItem(OUTBOX);
  });

  it('writes the event locally before any network call', async () => {
    const saved = await enqueueSos({
      patientId: 'p1',
      patientName: 'Asha',
      placeName: 'Koramangala, Bengaluru',
      latitude: 12.93,
      longitude: 77.62,
      reasons: 'help button',
      phone: '+919800000000',
    });
    const raw = await AsyncStorage.getItem(OUTBOX);
    expect(raw).toContain(saved.id);
    expect(saved.sent).toBe(false);
  });

  it('marks the event sent only after the post succeeds', async () => {
    const saved = await enqueueSos({
      patientId: 'p1',
      patientName: 'Asha',
      placeName: 'Home',
      latitude: null,
      longitude: null,
      reasons: 'high',
      phone: null,
    });
    await flushSosQueue(async () => undefined);
    const raw = await AsyncStorage.getItem(OUTBOX);
    expect(raw).toContain(`"id":"${saved.id}"`);
    expect(raw).toContain('"sent":true');
  });

  it('keeps the event queued when the post throws', async () => {
    await enqueueSos({
      patientId: 'p1',
      patientName: 'Asha',
      placeName: 'Home',
      latitude: null,
      longitude: null,
      reasons: 'high',
      phone: null,
    });
    await flushSosQueue(async () => {
      throw new Error('offline');
    });
    const raw = await AsyncStorage.getItem(OUTBOX);
    expect(raw).toContain('"sent":false');
  });

  it('builds a short message and adds a map link only when coordinates exist', () => {
    expect(sosMessage({
      patientName: 'Asha',
      placeName: 'Home',
      reasons: 'help button',
      latitude: null,
      longitude: null,
    })).toBe('Cognia help. Asha is at Home. help button.');

    expect(sosMessage({
      patientName: 'Asha',
      placeName: 'Home',
      reasons: 'help button',
      latitude: 12.9,
      longitude: 77.6,
    })).toContain('https://maps.google.com/?q=12.9,77.6');
  });

  it('prefers the emergency contact, then the first family phone', () => {
    expect(caregiverPhone({ emergencyContact: '111', familyCaregivers: [{ phone: '222' }] })).toBe('111');
    expect(caregiverPhone({ familyCaregivers: [{ phone: '222' }] })).toBe('222');
    expect(caregiverPhone({})).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest test/sosService.test.ts --watchman=false`

Expected: FAIL because `src/services/sosService.ts` does not exist.

- [ ] **Step 3: Implement the outbox**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const OUTBOX = 'cognia_sos_outbox';

export type SosEvent = {
  id: string;
  patientId: string;
  patientName: string;
  placeName: string;
  latitude: number | null;
  longitude: number | null;
  reasons: string;
  phone: string | null;
  createdAt: number;
  sent: boolean;
};

async function readAll(): Promise<SosEvent[]> {
  const raw = await AsyncStorage.getItem(OUTBOX);
  return raw ? (JSON.parse(raw) as SosEvent[]) : [];
}

async function writeAll(events: SosEvent[]) {
  await AsyncStorage.setItem(OUTBOX, JSON.stringify(events.slice(0, 20)));
}

export async function enqueueSos(input: Omit<SosEvent, 'id' | 'createdAt' | 'sent'>) {
  const event: SosEvent = {
    ...input,
    id: `sos_${Date.now()}`,
    createdAt: Date.now(),
    sent: false,
  };
  const events = await readAll();
  events.unshift(event);
  await writeAll(events);
  return event;
}

export async function flushSosQueue(post: (event: SosEvent) => Promise<void>) {
  const events = await readAll();
  for (const event of events) {
    if (event.sent) continue;
    try {
      await post(event);
      event.sent = true;
    } catch {
      break;
    }
  }
  await writeAll(events);
}

export function sosMessage(event: Pick<SosEvent, 'patientName' | 'placeName' | 'reasons' | 'latitude' | 'longitude'>) {
  const base = `Cognia help. ${event.patientName} is at ${event.placeName}. ${event.reasons}.`;
  if (event.latitude == null || event.longitude == null) return base;
  return `${base} https://maps.google.com/?q=${event.latitude},${event.longitude}`;
}

export function caregiverPhone(patient: { emergencyContact?: string; familyCaregivers?: { phone: string }[] }) {
  const emergency = patient.emergencyContact?.trim();
  if (emergency) return emergency;
  const family = patient.familyCaregivers?.find((person) => person.phone?.trim());
  return family?.phone.trim() || null;
}
```

`postStressAlert` in `src/services/careApi.ts` gains an optional `placeName?: string` field and sends it in the JSON body. Wrap `fetch` in `AbortSignal.timeout(4000)` for this call only.

In `backend/lib/db.ts`, after the existing `CREATE TABLE`, run:

```sql
ALTER TABLE stress_alerts ADD COLUMN IF NOT EXISTS place_name TEXT;
```

`CREATE TABLE IF NOT EXISTS` will not add the column to a table that already exists on Render. The `ALTER` is required.

In `backend/app/api/care/alerts/route.ts`, store `place_name` from `body.placeName` (string, max 120 chars). Include `place_name` in the `SELECT` and in the memory objects. Keep the old columns.

- [ ] **Step 4: Call the queue from help and high stress**

Shared sequence, used by both buttons:

```ts
const phone = caregiverPhone(patient);
const event = await enqueueSos({
  patientId: patient.id,
  patientName: patient.name,
  placeName,
  latitude,
  longitude,
  reasons,
  phone,
});
let posted = false;
await flushSosQueue(async (item) => {
  await postStressAlert({
    patientId: item.patientId,
    level: 'high',
    reasons: item.reasons,
    latitude: item.latitude,
    longitude: item.longitude,
    placeName: item.placeName,
  });
  posted = true;
});
if (!posted && event.phone) {
  const SMS = await import('expo-sms');
  const available = await SMS.isAvailableAsync();
  if (available) {
    await SMS.sendSMSAsync([event.phone], sosMessage(event));
  }
}
```

Export that sequence from `src/services/sosService.ts` as `deliverSos(event: SosEvent): Promise<void>`. `deliverSos` enqueues if the event has no `id` yet, flushes the queue, and opens Messages only when the post for this attempt fails.

`CalmDay` does not call `deliverSos` directly. Task 8’s `runStressResponse({ source: 'button' })` does.

Do not post from `StressHost`’s old `postStressAlert` call. Delete that call. Task 8 replaces it.

Call `flushSosQueue` once when `StressHost` mounts so a queued event leaves the phone when the home server comes back. Do not open the SMS composer from that mount flush. The composer opens only on the attempt that just failed.

`caregiverPhone` stays for the single-number tests. Also export `caregiverPhones`, which returns every non-empty `emergencyContact` and `familyCaregivers[].phone`, trimmed, with duplicates removed. `deliverSos` passes that full list to `SMS.sendSMSAsync`.

- [ ] **Step 5: Run the tests**

Run: `npx jest test/sosService.test.ts --watchman=false`

Expected: PASS, 5 tests.

- [ ] **Step 6: Device check**

With the phone in airplane mode, press help. The LED and vibration still run, and `cognia_sos_outbox` contains `sent: false`. Join the Wi-Fi that can see `http://192.168.0.7:3001` and confirm the caregiver dashboard receives the alert. Turn the server off, save a caregiver number, press help, and confirm Messages opens with the place name. Do not mark the event sent when the composer opens.

- [ ] **Step 7: Commit**

```bash
git add src/services/sosService.ts src/services/careApi.ts src/components/CalmDay.tsx src/components/StressHost.tsx backend/lib/db.ts backend/app/api/care/alerts/route.ts test/sosService.test.ts
git commit -m "Queue help locally before the home server or a text."
```

---

### Task 5: Caregiver on the same Wi-Fi hears the place

**Files:**
- Modify: `app/(caregiver)/dashboard.tsx` around the existing alert `setInterval` (currently 10000ms, vibrate only)
- Test: none beyond the device check. The poll already uses `fetchStressAlerts`.

**Interfaces:**
- Consumes: `GET /api/care/alerts?since=` rows that now include `place_name` from Task 4
- Consumes: `speakPrompt` from `src/services/ttsService.ts`

- [ ] **Step 1: Change the existing interval from 10000 to 8000**

Do not add another `setInterval`. Track alert ids in a `Set` so the same row does not speak twice. On a new row:

- `Vibration.vibrate([0, 500, 200, 500])`
- `speakPrompt(`Your family member needs you. ${alert.place_name || 'Place unknown.'}`)`
- Show `alert.place_name` in a banner with Nunito Bold at 24px or larger until the caregiver taps it away

The request target stays `EXPO_PUBLIC_API_BASE_URL`. Mobile data is not required when both phones are on the same Wi-Fi as the PC.

- [ ] **Step 2: Device check**

Two phones, same Wi-Fi as the PC, backend running on port 3001. Patient presses help. The caregiver phone vibrates and speaks the place within 10 seconds. Stop the backend and press help again. The patient LED still turns on and the event stays queued.

- [ ] **Step 3: Commit**

```bash
git add app/(caregiver)/dashboard.tsx
git commit -m "Speak the patient place when a nearby help alert arrives."
```

---

### Task 6: EAS development build

Bluetooth cannot run in Expo Go. This task produces the binary. Tasks 1–5 must already work in Expo Go before this build.

**Files:**
- Create: `eas.json`
- Modify: `package.json` dependencies via `npx expo install expo-dev-client`
- Modify: `app.json` only if a plugin from Task 7 is added in the same change

**Interfaces:**
- Produces: an installable Android APK from the `development` profile
- Produces: `isExpoGo()` in `src/services/runtime.ts`

```ts
import Constants from 'expo-constants';

export function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}
```

- [ ] **Step 1: Add the dev client and EAS config**

Run: `npx expo install expo-dev-client -- --legacy-peer-deps`

`eas.json`:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

- [ ] **Step 2: Build Android**

Run: `npx eas build --profile development --platform android`

iOS needs an Apple developer account and EAS cloud or a Mac. Do not block the Android APK on iOS. Install the APK on the patient phone and the caregiver phone. Open the dev client, not Expo Go.

- [ ] **Step 3: Confirm Tasks 1–5 still behave in that APK**

LED, family note, outbox, and caregiver speech must work in the dev client before Task 7 starts.

- [ ] **Step 4: Commit**

```bash
git add eas.json app.json package.json package-lock.json src/services/runtime.ts
git commit -m "Add an EAS development build for on-device Bluetooth."
```

---

### Task 7: Bluetooth SOS on the development build

Do not start this task while the only installed client is Expo Go. `isExpoGo()` must be true in Expo Go and the advertise and scan functions must return immediately there.

**Files:**
- Create: `modules/cognia-ble/expo-module.config.json`
- Create: `modules/cognia-ble/index.ts`
- Create: `modules/cognia-ble/src/CogniaBleModule.ts`
- Create: `modules/cognia-ble/android/src/main/java/expo/modules/cogniable/CogniaBleModule.kt`
- Create: `modules/cognia-ble/ios/CogniaBleModule.swift`
- Create: `src/services/bleSos.ts`
- Modify: `app.json` (`plugins` plus iOS Bluetooth strings and background mode)
- Modify: `src/components/CalmDay.tsx` help path
- Modify: `app/(caregiver)/dashboard.tsx`
- Install: `npx expo install react-native-ble-plx -- --legacy-peer-deps` for the caregiver scan only

**Interfaces:**
- Produces from the local module:
  - `startAdvertisement(localName: string): Promise<void>`
  - `stopAdvertisement(): Promise<void>`
- Produces from `src/services/bleSos.ts`:
  - `startSosAdvertisement(accessCode: string): Promise<void>`
  - `watchSosBeacons(onFound: (accessCode: string) => void): () => void`
- Service UUID, fixed: `8b1c0001-7e2a-4c1d-9a55-0e6f1a2b3c4d`
- Advertised name: `CG` plus the patient access code with the hyphen removed, max 8 characters after `CG`. Example access code `TEA-204` becomes local name `CGTEA204`.
- A 128-bit UUID plus flags fills most of the 31-byte legacy advertising packet. Do not also put a Firebase uid in manufacturer data.

- [ ] **Step 1: Add the Expo module JS surface**

`modules/cognia-ble/index.ts`:

```ts
import { requireNativeModule } from 'expo-modules-core';

const Native = requireNativeModule('CogniaBle');

export function startAdvertisement(localName: string): Promise<void> {
  return Native.startAdvertisement(localName);
}

export function stopAdvertisement(): Promise<void> {
  return Native.stopAdvertisement();
}
```

`modules/cognia-ble/expo-module.config.json`:

```json
{
  "platforms": ["android", "ios"],
  "android": {
    "modules": ["expo.modules.cogniable.CogniaBleModule"]
  },
  "ios": {
    "modules": ["CogniaBleModule"]
  }
}
```

- [ ] **Step 2: Android advertiser**

Permissions on the module manifest: `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, and `ACCESS_FINE_LOCATION`. Request `BLUETOOTH_ADVERTISE` and `BLUETOOTH_CONNECT` at runtime on API 31+.

`startAdvertisement` uses `BluetoothLeAdvertiser.startAdvertising` with:

- `ADVERTISE_MODE_LOW_LATENCY`
- `ADVERTISE_TX_POWER_HIGH`
- `setConnectable(false)`
- `AdvertiseData` containing service UUID `8b1c0001-7e2a-4c1d-9a55-0e6f1a2b3c4d` and `setIncludeDeviceName(true)` after `BluetoothAdapter.setName(localName)`

Save the previous adapter name and restore it in `stopAdvertisement`. If the adapter is null or advertising is unsupported, reject the promise. Do not crash the JS alert path. `bleSos.ts` catches that rejection.

- [ ] **Step 3: iOS advertiser**

`CBPeripheralManager.startAdvertising` with:

- `CBAdvertisementDataServiceUUIDsKey`: `[CBUUID(string: "8b1c0001-7e2a-4c1d-9a55-0e6f1a2b3c4d")]`
- `CBAdvertisementDataLocalNameKey`: the same `CG…` name

`app.json` iOS:

```json
"infoPlist": {
  "NSBluetoothAlwaysUsageDescription": "Cognia uses Bluetooth to call a caregiver in the same room when there is no network.",
  "UIBackgroundModes": ["bluetooth-peripheral"]
}
```

Background mode does not make the local name reliable. The help screen stays open for the 60 seconds the advertisement runs. Document that in a one-line comment in `bleSos.ts`.

- [ ] **Step 4: JS wrappers**

```ts
import { isExpoGo } from './runtime';
import { startAdvertisement, stopAdvertisement } from '../../modules/cognia-ble';

const SOS_UUID = '8b1c0001-7e2a-4c1d-9a55-0e6f1a2b3c4d';

export function bleLocalName(accessCode: string) {
  const compact = accessCode.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
  return `CG${compact}`;
}

export async function startSosAdvertisement(accessCode: string) {
  if (isExpoGo()) return;
  await startAdvertisement(bleLocalName(accessCode));
  setTimeout(() => {
    stopAdvertisement().catch(() => undefined);
  }, 60000);
}

export function watchSosBeacons(onFound: (accessCode: string) => void) {
  if (isExpoGo()) return () => undefined;
  const { BleManager } = require('react-native-ble-plx');
  const manager = new BleManager();
  manager.startDeviceScan([SOS_UUID], { allowDuplicates: false }, (error: Error | null, device: { localName?: string | null; name?: string | null } | null) => {
    if (error || !device) return;
    const name = device.localName || device.name || '';
    if (!name.startsWith('CG')) return;
    onFound(name.slice(2));
  });
  return () => {
    manager.stopDeviceScan();
    manager.destroy();
  };
}
```

Add a unit test `test/bleSos.test.ts` for `bleLocalName('TEA-204') === 'CGTEA204'` and for a code longer than 8 compact characters being truncated. Mock `expo-constants` so `isExpoGo` is not required for that test.

- [ ] **Step 5: Connect the buttons**

Patient help button, after the torch and the outbox call: `startSosAdvertisement(patient.accessCode)`. Catch errors. Expo Go hits the early return.

Caregiver dashboard, in the same effect as Task 5: `watchSosBeacons`. On a match, vibrate and `speakPrompt('Your family member needs you.')`. The beacon does not carry the street address. The place sentence still comes from Task 5 when the home server is reachable.

- [ ] **Step 6: Rebuild and test with radios off**

Run `npx eas build --profile development --platform android` again after the native module exists. Install that APK on both phones. Turn Wi-Fi and mobile data off. Patient presses help. Caregiver phone vibrates within a few seconds in the same room. Put the patient app in the background and confirm the plan does not claim the name still broadcasts. Open the same project in Expo Go and confirm help still turns on the LED and does not throw a missing native module error.

- [ ] **Step 7: Commit**

```bash
git add modules/cognia-ble src/services/bleSos.ts src/components/CalmDay.tsx app/(caregiver)/dashboard.tsx app.json test/bleSos.test.ts package.json package-lock.json
git commit -m "Advertise a same-room Bluetooth help signal from the development build."
```

### Task 8: SOS from the stress score, not only the button

**Files:**
- Create: `src/services/stressSos.ts`
- Modify: `src/components/StressHost.tsx`
- Modify: `src/components/CalmDay.tsx`
- Test: `test/stressSos.test.ts`

**Interfaces:**
- Consumes: `StressReading` from `scoreSample` / `startStressWatch`
- Consumes: `groundingLine`, `playCalmingAudio`, `PhoneTorch`, `deliverSos`, `caregiverPhones`, `getCurrentLiveLocation`
- Produces:

```ts
export type SosSource = 'button' | 'monitor';

export function responseFor(level: 'calm' | 'uneasy' | 'high', source: SosSource): 'none' | 'calm' | 'alert';

export function shouldSendMonitorAlert(input: {
  consecutiveHigh: number;
  lastAlertAt: number | null;
  now: number;
}): boolean;

export function nextHighStreak(previousStreak: number, level: 'calm' | 'uneasy' | 'high'): number;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { nextHighStreak, responseFor, shouldSendMonitorAlert } from '../src/services/stressSos';

const MINUTE = 60 * 1000;

describe('stress SOS policy', () => {
  it('lets uneasy calm the patient and keeps the caregiver out of it', () => {
    expect(responseFor('calm', 'monitor')).toBe('none');
    expect(responseFor('uneasy', 'monitor')).toBe('calm');
    expect(responseFor('high', 'monitor')).toBe('alert');
  });

  it('treats the help button as an alert at every level', () => {
    expect(responseFor('calm', 'button')).toBe('alert');
    expect(responseFor('uneasy', 'button')).toBe('alert');
    expect(responseFor('high', 'button')).toBe('alert');
  });

  it('resets the high streak unless the new sample is high', () => {
    expect(nextHighStreak(1, 'high')).toBe(2);
    expect(nextHighStreak(2, 'uneasy')).toBe(0);
    expect(nextHighStreak(2, 'calm')).toBe(0);
  });

  it('messages only after two high samples, then waits 15 minutes', () => {
    expect(shouldSendMonitorAlert({ consecutiveHigh: 1, lastAlertAt: null, now: 0 })).toBe(false);
    expect(shouldSendMonitorAlert({ consecutiveHigh: 2, lastAlertAt: null, now: 0 })).toBe(true);
    expect(shouldSendMonitorAlert({
      consecutiveHigh: 2,
      lastAlertAt: 0,
      now: 14 * MINUTE,
    })).toBe(false);
    expect(shouldSendMonitorAlert({
      consecutiveHigh: 2,
      lastAlertAt: 0,
      now: 15 * MINUTE,
    })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest test/stressSos.test.ts --watchman=false`

Expected: FAIL because `src/services/stressSos.ts` does not exist.

- [ ] **Step 3: Implement the policy**

```ts
export type SosSource = 'button' | 'monitor';

const COOLDOWN_MS = 15 * 60 * 1000;

export function responseFor(level: 'calm' | 'uneasy' | 'high', source: SosSource): 'none' | 'calm' | 'alert' {
  if (source === 'button') return 'alert';
  if (level === 'high') return 'alert';
  if (level === 'uneasy') return 'calm';
  return 'none';
}

export function nextHighStreak(previousStreak: number, level: 'calm' | 'uneasy' | 'high') {
  return level === 'high' ? previousStreak + 1 : 0;
}

export function shouldSendMonitorAlert(input: {
  consecutiveHigh: number;
  lastAlertAt: number | null;
  now: number;
}) {
  if (input.consecutiveHigh < 2) return false;
  if (input.lastAlertAt == null) return true;
  return input.now - input.lastAlertAt >= COOLDOWN_MS;
}
```

Add `runStressResponse` in the same file. It is the only function `StressHost` and `CalmDay` call.

```ts
export async function runStressResponse(input: {
  source: SosSource;
  level: 'calm' | 'uneasy' | 'high';
  reasons: string[];
  patient: { id: string; name: string; accessCode: string; emergencyContact?: string; familyCaregivers?: { phone: string }[] };
  streak: number;
  lastAlertAt: number | null;
  now?: number;
}): Promise<{ action: 'none' | 'calm' | 'alert'; sent: boolean; streak: number }> {
  const action = responseFor(input.level, input.source);
  const streak = input.streak;
  if (action === 'none') return { action, sent: false, streak };
  await playCalmingAudio(input.patient.id);
  if (action === 'calm') return { action, sent: false, streak };
  const monitorAllowed = input.source === 'button' || shouldSendMonitorAlert({
    consecutiveHigh: input.streak,
    lastAlertAt: input.lastAlertAt,
    now: input.now ?? Date.now(),
  });
  if (!monitorAllowed) return { action: 'calm', sent: false, streak };
  const placeName = await resolvePlaceName();
  const location = await readCoordinates();
  const phones = caregiverPhones(input.patient);
  await deliverSos({
    id: '',
    patientId: input.patient.id,
    patientName: input.patient.name,
    placeName,
    latitude: location.latitude,
    longitude: location.longitude,
    reasons: input.source === 'button' ? 'help button' : input.reasons.join(', '),
    phone: phones[0] ?? null,
    createdAt: 0,
    sent: false,
  });
  try {
    const { startSosAdvertisement } = await import('./bleSos');
    await startSosAdvertisement(input.patient.accessCode);
  } catch {
    // Task 7 adds bleSos. Until that file exists, and inside Expo Go, skip Bluetooth.
  }
  return { action: 'alert', sent: true, streak };
}
```

`deliverSos` must treat `id: ''` as “not saved yet” and call `enqueueSos` itself. Pass `phones` into `deliverSos` by extending `SosEvent` with `phones: string[]` and using that list in `SMS.sendSMSAsync`. Keep `phone` as `phones[0] ?? null` so the Task 4 tests still pass.

`resolvePlaceName` uses `getCurrentLiveLocation()`: `suburb, city`, else `address`, else `city`, else `Home`. `readCoordinates` returns those coordinates or nulls. Both catch and fall back. They must not block the audio call above them. Start the location read in parallel with `playCalmingAudio`.

Message text for a monitor alert uses the reason list from `scoreSample`, for example `Cognia help. Asha is at Koramangala, Bengaluru. Evening sundowning, Repetitive pacing.` The button still uses the reason `help button`.

- [ ] **Step 4: Wire the watch and the button**

In `StressHost`, keep a `streak` ref and a `lastAlertAt` ref.

```tsx
useEffect(() => {
  if (!patient) return;
  return startStressWatch(async (next) => {
    const streak = nextHighStreak(streakRef.current, next.level);
    streakRef.current = streak;
    const result = await runStressResponse({
      source: 'monitor',
      level: next.level,
      reasons: next.reasons,
      patient,
      streak,
      lastAlertAt: lastAlertAtRef.current,
    });
    if (result.sent) lastAlertAtRef.current = Date.now();
    if (result.action === 'alert') setReading(next);
    if (result.action === 'calm') setReading(next);
    if (result.action === 'none') setReading(null);
  });
}, [patient]);
```

Show the modal for `calm` and `alert`. `<PhoneTorch on={reading?.level === 'high' && resultWasAlert} />` is awkward inside the callback. Store `torchOn` in state. Set it true only when `result.action === 'alert'`. `I am okay` sets `torchOn` false and `reading` null. An `uneasy` modal shows `groundingLine()` and `I am okay`, with the LED off.

The help button in `CalmDay` calls:

```tsx
runStressResponse({
  source: 'button',
  level: 'high',
  reasons: ['help button'],
  patient,
  streak: 2,
  lastAlertAt: null,
});
```

`CalmDay` already vibrates and speaks the place. Keep that. `runStressResponse` adds the LED, the family clip, the outbox, the server post, the composer, and BLE. The button does not consult `shouldSendMonitorAlert`.

- [ ] **Step 5: Run the tests**

Run: `npx jest test/stressSos.test.ts --watchman=false`

Expected: PASS, 4 tests.

- [ ] **Step 6: Device check**

Force two `high` readings about two minutes apart. The first shows the calm modal and does not open Messages. The second turns the LED on and posts or opens Messages with the reason text, such as `Evening sundowning`. Press `I am okay`, then press `I need help` inside the 15 minute window. The button still alerts. A later single `uneasy` reading speaks the grounding line and does not text.

- [ ] **Step 7: Commit**

```bash
git add src/services/stressSos.ts src/services/sosService.ts src/components/StressHost.tsx src/components/CalmDay.tsx test/stressSos.test.ts
git commit -m "Send SOS from a high stress score as well as the help button."
```

---

### Task 9: Real room-noise sample, then throw the recording away

**Files:**
- Modify: `src/services/stressMonitor.ts` (`sampleNoise`)
- Test: `test/noiseSample.test.ts`

**Interfaces:**
- Produces: `noiseDbFromMeter(samples: number[]): number`
- `sampleNoise` returns that number. It does not return a file URI.

The current `sampleNoise` always returns `38`, so “Noisy room” never fires and a quiet room can never lower the score. Automatic SOS in Task 8 depends on this.

- [ ] **Step 1: Write the failing test**

```ts
import { noiseDbFromMeter } from '../src/services/stressMonitor';

describe('noiseDbFromMeter', () => {
  it('uses the loudest meter reading', () => {
    expect(noiseDbFromMeter([-40, -12, -28])).toBe(-12);
  });

  it('returns a quiet floor when the meter produced no numbers', () => {
    expect(noiseDbFromMeter([])).toBe(-60);
  });
});
```

`scoreSample` treats `noiseDb > 72` as “Noisy room”. `expo-audio` metering is dBFS, usually about `-160` to `0`, not 0–100 dB SPL. Change the threshold in `scoreSample` to `sample.noiseDb > -15` in the same task, and update any comment that still says 72. Add one assertion in this test file only if you export the threshold as `NOISY_ROOM_DBFS = -15`.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest test/noiseSample.test.ts --watchman=false`

Expected: FAIL because `noiseDbFromMeter` is not exported.

- [ ] **Step 3: Implement the meter**

```ts
export const NOISY_ROOM_DBFS = -15;

export function noiseDbFromMeter(samples: number[]) {
  if (!samples.length) return -60;
  return Math.max(...samples);
}
```

Replace `sampleNoise`:

```ts
async function sampleNoise(ms: number) {
  const samples: number[] = [];
  try {
    const { AudioModule, RecordingPresets, setAudioModeAsync } = await import('expo-audio');
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) return noiseDbFromMeter(samples);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    const recorder = new AudioModule.AudioRecorder({
      ...RecordingPresets.LOW_QUALITY,
      isMeteringEnabled: true,
    });
    await recorder.prepareToRecordAsync();
    recorder.record();
    const started = Date.now();
    while (Date.now() - started < ms) {
      const status = recorder.getStatus();
      if (typeof status.metering === 'number') samples.push(status.metering);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    await recorder.stop();
    if (recorder.uri) {
      const FileSystem = await import('expo-file-system');
      await FileSystem.deleteAsync(recorder.uri, { idempotent: true });
    }
  } catch (error) {
    console.warn('Noise sample skipped', error);
  }
  return noiseDbFromMeter(samples);
}
```

Check the installed `expo-audio` types before copying the constructor name. If the package exports `useAudioRecorder` only, create the recorder with the class named in `build/AudioModule.types.d.ts`. The behavior is fixed: enable metering, sample for `ms`, stop, delete the file, return the loudest number.

In `scoreSample`, replace `sample.noiseDb > 72` with `sample.noiseDb > NOISY_ROOM_DBFS`.

`takeStressSample` already calls `sampleNoise(8000)` beside the 15 second motion sample. Leave that call.

- [ ] **Step 4: Run the test**

Run: `npx jest test/noiseSample.test.ts --watchman=false`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/stressMonitor.ts test/noiseSample.test.ts
git commit -m "Score room noise from a meter reading and delete the clip."
```

---

### Task 10: Caregiver chime and a notification they can hear in a pocket

**Files:**
- Create: `assets/audio/caregiver-chime.mp3` (original tone, under 2 seconds, not a copyrighted song)
- Modify: `app/(caregiver)/dashboard.tsx`
- Modify: `src/services/careApi.ts` only if `fetchStressAlerts` does not already return `reasons` and `place_name`

**Interfaces:**
- Consumes: alert rows `{ id, place_name, reasons, level }`
- Produces: one chime, one spoken line, one notification per new id

- [ ] **Step 1: Play a chime when a new alert arrives**

In the existing 8 second poll from Task 5, after vibration and before speech:

```ts
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

await setAudioModeAsync({ playsInSilentMode: true });
const chime = createAudioPlayer(require('../../assets/audio/caregiver-chime.mp3'));
chime.play();
```

Then speak `Your family member needs you. ${place}. ${reasons}.` Use `Place unknown` when `place_name` is empty. The banner from Task 5 also shows `reasons` under the place, Nunito Bold, at least 20px.

- [ ] **Step 2: Post a local notification for the same alert**

`expo-notifications` is already a dependency. Ask for permission once when the dashboard mounts. On each new id:

```ts
import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Cognia help',
    body: `${place}. ${reasons}.`,
    sound: true,
  },
  trigger: null,
});
```

`trigger: null` shows it immediately. Do not schedule a repeating notification. The 15 minute patient cooldown in Task 8 is what stops a stream of alerts. The dashboard still dedupes by id.

- [ ] **Step 3: Device check**

Raise a monitor `high` streak with the caregiver app open. Hear the chime, the place, and the reason. Background the caregiver app, raise another alert after the cooldown, and confirm the notification appears. Pressing the patient help button still does both, without waiting for a second sample.

- [ ] **Step 4: Commit**

```bash
git add assets/audio/caregiver-chime.mp3 app/(caregiver)/dashboard.tsx
git commit -m "Chime and notify the caregiver when a stress SOS arrives."
```

---

## Suggested order

Tasks 1, 3, and 4 are independent after Task 1’s `groundingLine`. Task 2 needs Task 1’s sentence for the speech fallback. Task 5 needs Task 4’s `place_name`. Task 8 needs Tasks 2, 3, 4, and 7’s `startSosAdvertisement` guard, so the BLE call is wrapped in `isExpoGo()` even before Task 7’s native module exists. Task 9 can land any time before a real automatic-SOS test. Task 10 needs Task 5. Task 6 is the binary. Task 7 needs Task 6’s installed APK.

## Spec coverage check

- One calming sentence: Task 1.
- Family voice, then bundled tone, then speech: Task 2.
- Phone LED, no screen flash: Task 3.
- Local outbox, home server, Messages composer, every saved number: Task 4.
- Caregiver on the same Wi-Fi: Task 5.
- Bluetooth on an EAS build only: Tasks 6 and 7.
- Automatic SOS from a high stress score, with uneasy kept local: Task 8.
- Room noise that can actually raise the score: Task 9.
- Caregiver chime and pocket notification: Task 10.
- Help button still alerts immediately, including during the monitor cooldown: Task 8.
- Silent SMS, Wi-Fi Direct, LoRa, and ultrasound: rejected in the research table. No tasks build them.
