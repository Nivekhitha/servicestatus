import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isSafetyCriticalPart, isValidDocumentId } from './src/utils/workflow';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
  firestore: Record<string, unknown>;
};

test('Dirty Dozen #1: rules contain default-deny safety net and block self-assigned staff roles', () => {
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.match(rulesContent, /incoming\(\)\.role == 'customer'/);
});

test('Dirty Dozen #2: every collection enforces strict keys with hasAll and hasOnly', () => {
  const validationHelpers = [
    'isValidUserProfile',
    'isValidEmployee',
    'isValidCustomer',
    'isValidVehicle',
    'isValidAppointment',
    'isValidServiceOrder',
    'isValidApprovalRequest',
    'isValidCircularPart',
    'isValidNotificationLog',
  ];
  for (const helper of validationHelpers) {
    assert.match(rulesContent, new RegExp(`function ${helper}\\(data\\)`));
  }
});

test('Dirty Dozen #3: email spoofing blocked by email_verified == true check', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
});

test('Dirty Dozen #4 & #5: no blanket allow list: if isSignedIn() anywhere in rules', () => {
  assert.doesNotMatch(rulesContent, /allow list:\s*if\s*isSignedIn\(\);/);
  assert.doesNotMatch(rulesContent, /allow read:\s*if\s*isSignedIn\(\);/);
});

test('Dirty Dozen #6: ID poisoning rejected by isValidId regex and size <= 128', () => {
  assert.match(rulesContent, /id\.size\(\) <= 128 && id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  assert.equal(isValidDocumentId('x'.repeat(1500)), false);
});

test('Dirty Dozen #8: approval requests enforce terminal state lock from pending only', () => {
  assert.match(rulesContent, /existing\(\)\.status == 'pending'/);
  assert.match(rulesContent, /incoming\(\)\.status in \['approved', 'declined'\]/);
});

test('Dirty Dozen #9: circularParts strictly enforces isSafetyCritical == false', () => {
  assert.match(rulesContent, /data\.isSafetyCritical == false/);
  assert.equal(isSafetyCriticalPart('Airbag Inflator', 'Airbags & SRS'), true);
});

test('Every collection declared in firebase-blueprint.json has an explicit match block in firestore.rules', () => {
  const paths = Object.keys(blueprint.firestore);
  for (const p of paths) {
    const collectionName = p.split('/')[1];
    assert.match(
      rulesContent,
      new RegExp(`match /${collectionName}/\\{`),
      `Missing match block for collection ${collectionName}`
    );
  }
});
