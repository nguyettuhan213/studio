// Self-check for field-store.ts. Run: cd ../backend && npx tsx ../studio/src/lib/field-store.check.ts
import assert from 'node:assert/strict';
import {
  activeValues,
  buildSubmission,
  displayValue,
  knownFieldNames,
  matchSwitchReply,
  mergeExtracted,
  setFieldValue,
} from './field-store';
import type { ApiWorkflow } from '@/types/api';

const f = (name: string, extra: object = {}) => ({ name, label: name, displayName: name, type: 'text', required: false, fieldDefinitionKey: name, ...extra }) as ApiWorkflow['fields'][number];
const room = { id: 'room', name: 'Room', description: '', fields: [f('room'), f('requesterName'), f('estimatedAttendees', { type: 'number', valueHandling: { defaultValue: 1 } })] } as ApiWorkflow;
const event = { id: 'event', name: 'Event', description: '', fields: [f('eventName'), f('requesterName'), f('estimatedAttendees', { type: 'number', valueHandling: { defaultValue: 20 } })] } as ApiWorkflow;
const known = knownFieldNames([room, event]);

// AI merge: known names only, empties ignored, latest wins
let s = mergeExtracted({}, { room: 'P502', requesterName: 'A', junk: 'x', eventName: '' }, known);
assert.deepEqual(s, { room: 'P502', requesterName: 'A' });
s = mergeExtracted(s, { requesterName: 'B' }, known);
assert.equal(s.requesterName, 'B');

// S8: an earlier value is not touched by a merge that doesn't mention it
s = mergeExtracted(s, { estimatedAttendees: 45 }, known);
s = mergeExtracted(s, { room: 'P503' }, known);
assert.equal(s.estimatedAttendees, 45);

// Shared by name across workflows; defaults are per workflow and never stored
assert.equal(displayValue({}, room.fields[2]), 1);
assert.equal(displayValue({}, event.fields[2]), 20);
assert.equal(displayValue(s, event.fields[2]), 45);
assert.equal(displayValue(s, event.fields[1]), 'B');

// Manual edit (S1) and explicit clearing (stays empty, does not fall back to the default)
s = setFieldValue(s, 'eventName', 'Expo');
s = setFieldValue(s, 'estimatedAttendees', undefined);
assert.equal(displayValue(s, room.fields[2]), '');

// Submission: active workflow's fields only, defaults filled, empties skipped
assert.deepEqual(buildSubmission(s, event), { eventName: 'Expo', requesterName: 'B' });
assert.deepEqual(buildSubmission({ room: 'P1' }, room), { room: 'P1', estimatedAttendees: 1 });
assert.deepEqual(activeValues(s, room), { room: 'P503', requesterName: 'B' });

// Typed confirmation: whole message must be an explicit yes/no
for (const t of ['có', 'Có.', ' đồng ý ', 'dong y', 'YES', 'agree!']) assert.equal(matchSwitchReply(t), 'yes', t);
for (const t of ['không', 'Giữ', 'no']) assert.equal(matchSwitchReply(t), 'no', t);
for (const t of ['có thể', 'có 2 micro', 'ok', 'yes please', 'tôi đồng ý với giờ đó', '']) assert.equal(matchSwitchReply(t), null, t);

console.log('field-store: all checks passed');
