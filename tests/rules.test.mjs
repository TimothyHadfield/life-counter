// Run inside: firebase emulators:exec --only firestore "node <this file> <path to firestore.rules>"
import fs from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'life-counter-th',
  firestore: { rules: fs.readFileSync(process.argv[2], 'utf8'), host: '127.0.0.1', port: 8087 },
});
const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const anon = env.unauthenticatedContext().firestore();
const good = { people: [{ id: 'a', name: 'Tim', date: '2004-03-15', time: null, updated: 1 }], deleted: {}, calendarId: null, updatedAt: serverTimestamp() };

let pass = 0, fail = 0;
async function t(name, p) { try { await p; pass++; } catch (e) { fail++; console.log('FAIL', name, e.message); } }

await t('owner can write', assertSucceeds(setDoc(doc(alice, 'users/alice'), good)));
await t('owner can read', assertSucceeds(getDoc(doc(alice, 'users/alice'))));
await t('other user cannot read', assertFails(getDoc(doc(bob, 'users/alice'))));
await t('other user cannot write', assertFails(setDoc(doc(bob, 'users/alice'), good)));
await t('signed-out cannot read', assertFails(getDoc(doc(anon, 'users/alice'))));
await t('extra field refused', assertFails(setDoc(doc(alice, 'users/alice'), { ...good, admin: true })));
await t('people must be a list', assertFails(setDoc(doc(alice, 'users/alice'), { ...good, people: 'x' })));
await t('too many people refused', assertFails(setDoc(doc(alice, 'users/alice'), { ...good, people: Array.from({ length: 501 }, (_, i) => ({ id: 'p' + i })) })));
await t('client time refused', assertFails(setDoc(doc(alice, 'users/alice'), { ...good, updatedAt: new Date() })));
await t('deleted must be a map', assertFails(setDoc(doc(alice, 'users/alice'), { ...good, deleted: [1] })));
await t('calendarId string ok', assertSucceeds(setDoc(doc(alice, 'users/alice'), { ...good, calendarId: 'abc@group.calendar.google.com' })));
await t('other collections denied', assertFails(setDoc(doc(alice, 'other/x'), { a: 1 })));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
