#!/usr/bin/env node
/**
 * Migrates @/firebase call-sites to new MongoDB/NextAuth equivalents.
 * Idempotent — safe to re-run on already-processed files.
 * Run: node scripts/migrate-firebase-calls.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

const FILES = [
  'src/app/dashboard/chat/page.tsx',
  'src/app/dashboard/creativity/page.tsx',
  'src/app/dashboard/debt-strategy/page.tsx',
  'src/app/dashboard/dopamine/page.tsx',
  'src/app/dashboard/environment/page.tsx',
  'src/app/dashboard/finances/page.tsx',
  'src/app/dashboard/meditation/page.tsx',
  'src/app/dashboard/physical/page.tsx',
  'src/app/dashboard/profile/page.tsx',
  'src/app/dashboard/purpose/page.tsx',
  'src/app/dashboard/relations/page.tsx',
  'src/app/dashboard/settings/page.tsx',
  'src/app/dashboard/sleep/page.tsx',
  'src/app/dashboard/studies/page.tsx',
  'src/components/app/avatar-generator.tsx',
  'src/components/app/crisis-protocol-display.tsx',
  'src/components/app/data-table/columns-milestone.tsx',
  'src/components/app/data-table/data-table.tsx',
  'src/components/app/data-table/forms/edit-account-form.tsx',
  'src/components/app/data-table/forms/edit-area-form.tsx',
  'src/components/app/data-table/forms/edit-debt-form.tsx',
  'src/components/app/data-table/forms/edit-event-form.tsx',
  'src/components/app/data-table/forms/edit-habit-form.tsx',
  'src/components/app/data-table/forms/edit-hormone-form.tsx',
  'src/components/app/data-table/forms/edit-impact-matrix-form.tsx',
  'src/components/app/data-table/forms/edit-interaction-form.tsx',
  'src/components/app/data-table/forms/edit-milestone-form.tsx',
  'src/components/app/data-table/forms/edit-player-profile-form.tsx',
  'src/components/app/data-table/forms/edit-protocol-form.tsx',
  'src/components/app/data-table/forms/edit-relation-form.tsx',
  'src/components/app/data-table/forms/edit-skill-form.tsx',
  'src/components/app/data-table/forms/edit-state-form.tsx',
  'src/components/app/data-table/forms/edit-system-form.tsx',
  'src/components/app/data-table/forms/edit-transaction-form.tsx',
  'src/components/app/data-table/forms/edit-variable-form.tsx',
  'src/components/app/data-table/forms/interaction-log-form.tsx',
  'src/components/app/debt-strategy/amortization-table.tsx',
  'src/components/app/demo-banner.tsx',
  'src/components/app/forms/event-log-form.tsx',
  'src/components/app/forms/interaction-log-form.tsx',
  'src/components/app/forms/quick-habit-form.tsx',
  'src/components/app/forms/transaction-log-form.tsx',
  'src/components/app/habit-checklist.tsx',
  'src/components/app/header.tsx',
  'src/components/app/impact-simulator.tsx',
  'src/components/app/milestone-tracker.tsx',
  'src/components/app/morning-briefing.tsx',
  'src/components/app/notification-center.tsx',
  'src/components/app/overview-card.tsx',
  'src/components/app/profile-photo-editor.tsx',
  'src/components/app/quick-log-fab.tsx',
  'src/hooks/use-smart-notifications.ts',
];

/** Names that should be removed from @/firebase imports */
const FIREBASE_HOOK_NAMES = new Set([
  'useFirestore', 'useUser', 'useMemoFirebase', 'useCollection', 'useDoc',
  'addDocumentNonBlocking', 'setDocumentNonBlocking', 'updateDocumentNonBlocking',
  'deleteDocumentNonBlocking', 'initializeFirebase', 'useAuth', 'FirebaseClientProvider',
  'useFirebaseError',
]);

/** New import lines we inject — keyed so we can dedup */
const NEW_IMPORT_USE_USER    = "import { useUser } from '@/hooks/use-session-user';";
const NEW_IMPORT_WRITES_BASE = "import { %NAMES% } from '@/lib/api-writes';";
const NEW_IMPORT_MONGO_BASE  = "import { %NAMES% } from '@/hooks/use-mongo-collection';";

/**
 * Finds the index of the last LINE that CLOSES an import statement.
 * Handles both single-line (`import { X } from '...'`) and
 * multi-line (closing `} from '...'`) imports.
 */
function findLastImportEnd(lines) {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (
      /^}\s+from\s+['"][^'"]+['"]\s*;?\s*$/.test(t) ||           // } from 'x';
      /^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || // import { X } from 'x';
      /^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || // import type { X }
      /^import\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || // import X from 'x';
      /^import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || // import * as X
      /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(t)                  // import 'x';
    ) {
      idx = i;
    }
  }
  return idx;
}

function transformContent(content) {
  let s = content;

  // ----------------------------------------------------------------
  // 0. Repair: remove any previously-injected imports that landed
  //    in the middle of a multi-line import block (idempotent fix).
  //    These have the form: standalone `import { X } from '@/hooks/...'`
  //    lines that appear inside another import's body.
  // ----------------------------------------------------------------
  // We'll just strip all our new import lines from wherever they are,
  // then re-insert them at the correct position below.
  s = s.replace(/^import\s*\{[^}]+\}\s*from\s*'@\/hooks\/use-session-user'\s*;?\s*\n/gm, '');
  s = s.replace(/^import\s*\{[^}]+\}\s*from\s*'@\/lib\/api-writes'\s*;?\s*\n/gm, '');
  // Only remove use-mongo-collection imports that contain ONLY our injected names
  s = s.replace(/^import\s*\{\s*(useCollection|useDoc|revalidateCollection)(?:\s*,\s*(useCollection|useDoc|revalidateCollection))*\s*\}\s*from\s*'@\/hooks\/use-mongo-collection'\s*;?\s*\n/gm, '');

  // ----------------------------------------------------------------
  // 1. Remove all firebase SDK imports
  // ----------------------------------------------------------------
  s = s.replace(/^import\s*\{[^}]*\}\s*from\s*'firebase\/firestore'\s*;?\s*\n/gm, '');
  s = s.replace(/^import\s*\{[^}]*\}\s*from\s*"firebase\/firestore"\s*;?\s*\n/gm, '');
  s = s.replace(/^import\s*\{[^}]*\}\s*from\s*'firebase\/auth'\s*;?\s*\n/gm, '');
  s = s.replace(/^import\s*\{[^}]*\}\s*from\s*"firebase\/auth"\s*;?\s*\n/gm, '');

  // ----------------------------------------------------------------
  // 2. Rewrite @/firebase import line(s) — strip known hook names
  // ----------------------------------------------------------------
  s = s.replace(
    /^import\s*\{([^}]+)\}\s*from\s*['"]@\/firebase['"]\s*;?\s*\n/gm,
    (_, names) => {
      const kept = names
        .split(',')
        .map(n => n.trim())
        .filter(n => n && !FIREBASE_HOOK_NAMES.has(n));
      if (kept.length === 0) return '';
      return `import { ${kept.join(', ')} } from '@/firebase';\n`;
    }
  );

  // ----------------------------------------------------------------
  // 3. Remove `const firestore = useFirestore();`
  // ----------------------------------------------------------------
  s = s.replace(/^\s*const\s+firestore\s*=\s*useFirestore\(\)\s*;?\s*\n/gm, '');

  // ----------------------------------------------------------------
  // 4. Add `uid` to useUser destructuring (various shapes)
  // ----------------------------------------------------------------
  s = s.replace(/\bconst\s*\{\s*user\s*\}\s*=\s*useUser\(\)/g,
    'const { user, uid } = useUser()');
  s = s.replace(/\bconst\s*\{\s*user\s*,\s*isUserLoading\s*\}\s*=\s*useUser\(\)/g,
    'const { user, uid, isUserLoading } = useUser()');
  s = s.replace(/\bconst\s*\{\s*isUserLoading\s*,\s*user\s*\}\s*=\s*useUser\(\)/g,
    'const { uid, isUserLoading, user } = useUser()');
  s = s.replace(/\bconst\s*\{\s*user\s*,\s*isUserLoading\s*,\s*userError\s*\}\s*=\s*useUser\(\)/g,
    'const { user, uid, isUserLoading, userError } = useUser()');
  // Already has uid — skip
  // (re-running won't double-add because pattern requires no `uid` in the destructuring)

  // ----------------------------------------------------------------
  // 5. Fix guard checks
  // ----------------------------------------------------------------
  s = s.replace(/if\s*\(\s*!user\s*\|\|\s*!firestore\s*\)\s*return\s*;/g, 'if (!uid) return;');
  s = s.replace(/if\s*\(\s*!user\s*\|\|\s*!firestore\s*\)\s*return\s*null\s*;/g, 'if (!uid) return null;');

  // ----------------------------------------------------------------
  // 6. Two-line ref-variable → single-line call patterns
  // ----------------------------------------------------------------

  // collection variable + addDocument
  s = s.replace(
    /const\s+(\w+)\s*=\s*collection\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*\)\s*;\s*\n(\s*)addDocumentNonBlocking\s*\(\s*\1\s*,/g,
    (_, _v, coll, indent) => `${indent}addDocumentNonBlocking('${coll}',`
  );

  // doc variable + setDocument
  s = s.replace(
    /const\s+(\w+)\s*=\s*doc\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*,\s*([^)]+?)\s*\)\s*;\s*\n(\s*)setDocumentNonBlocking\s*\(\s*\1\s*,\s*/g,
    (_, _v, coll, docId, indent) => `${indent}setDocumentNonBlocking('${coll}', ${docId.trim()}, `
  );

  // doc variable + updateDocument
  s = s.replace(
    /const\s+(\w+)\s*=\s*doc\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*,\s*([^)]+?)\s*\)\s*;\s*\n(\s*)updateDocumentNonBlocking\s*\(\s*\1\s*,\s*/g,
    (_, _v, coll, docId, indent) => `${indent}updateDocumentNonBlocking('${coll}', ${docId.trim()}, `
  );

  // doc variable + deleteDocument
  s = s.replace(
    /const\s+(\w+)\s*=\s*doc\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*,\s*([^)]+?)\s*\)\s*;\s*\n(\s*)deleteDocumentNonBlocking\s*\(\s*\1\s*\)/g,
    (_, _v, coll, docId, indent) => `${indent}deleteDocumentNonBlocking('${coll}', ${docId.trim()})`
  );

  // ----------------------------------------------------------------
  // 7. Inline ref patterns (ref directly inside call)
  // ----------------------------------------------------------------

  s = s.replace(
    /addDocumentNonBlocking\s*\(\s*collection\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*\)\s*,\s*/g,
    (_, coll) => `addDocumentNonBlocking('${coll}', `
  );

  s = s.replace(
    /setDocumentNonBlocking\s*\(\s*doc\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*,\s*([^)]+?)\s*\)\s*,\s*/g,
    (_, coll, docId) => `setDocumentNonBlocking('${coll}', ${docId.trim()}, `
  );

  s = s.replace(
    /updateDocumentNonBlocking\s*\(\s*doc\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*,\s*([^)]+?)\s*\)\s*,\s*/g,
    (_, coll, docId) => `updateDocumentNonBlocking('${coll}', ${docId.trim()}, `
  );

  s = s.replace(
    /deleteDocumentNonBlocking\s*\(\s*doc\s*\(\s*firestore\s*,\s*`users\/\$\{(?:user\.uid|uid)\}\/(\w+)`\s*,\s*([^)]+?)\s*\)\s*\)/g,
    (_, coll, docId) => `deleteDocumentNonBlocking('${coll}', ${docId.trim()})`
  );

  // ----------------------------------------------------------------
  // 8. Replace user.uid → uid
  // ----------------------------------------------------------------
  s = s.replace(/\buser\.uid\b/g, 'uid');

  // ----------------------------------------------------------------
  // 9. Insert new imports at the CORRECT position (after last import close)
  // ----------------------------------------------------------------
  const usesUseUser    = /\buseUser\s*\(/.test(s);
  const usesWriteApi   = /addDocumentNonBlocking|setDocumentNonBlocking|updateDocumentNonBlocking|deleteDocumentNonBlocking/.test(s);
  const usesCollection = /\buseCollection\b/.test(s) && !/from\s+'@\/hooks\/use-mongo-collection'/.test(s);
  const usesDoc        = /\buseDoc\b/.test(s) && !/from\s+'@\/hooks\/use-mongo-collection'/.test(s);
  const usesRevalidate = /\brevalidateCollection\b/.test(s) && !/from\s+'@\/hooks\/use-mongo-collection'/.test(s);

  const newImports = [];

  if (usesUseUser && !/from\s+'@\/hooks\/use-session-user'/.test(s)) {
    newImports.push(NEW_IMPORT_USE_USER);
  }

  if (usesWriteApi && !/from\s+'@\/lib\/api-writes'/.test(s)) {
    const writeNames = [];
    if (/addDocumentNonBlocking/.test(s)) writeNames.push('addDocumentNonBlocking');
    if (/setDocumentNonBlocking/.test(s)) writeNames.push('setDocumentNonBlocking');
    if (/updateDocumentNonBlocking/.test(s)) writeNames.push('updateDocumentNonBlocking');
    if (/deleteDocumentNonBlocking/.test(s)) writeNames.push('deleteDocumentNonBlocking');
    if (writeNames.length > 0)
      newImports.push(NEW_IMPORT_WRITES_BASE.replace('%NAMES%', writeNames.join(', ')));
  }

  if ((usesCollection || usesDoc || usesRevalidate) && !/from\s+'@\/hooks\/use-mongo-collection'/.test(s)) {
    const hookNames = [];
    if (usesCollection) hookNames.push('useCollection');
    if (usesDoc) hookNames.push('useDoc');
    if (usesRevalidate) hookNames.push('revalidateCollection');
    newImports.push(NEW_IMPORT_MONGO_BASE.replace('%NAMES%', hookNames.join(', ')));
  }

  if (newImports.length > 0) {
    const lines = s.split('\n');
    const lastIdx = findLastImportEnd(lines);
    if (lastIdx >= 0) {
      lines.splice(lastIdx + 1, 0, ...newImports);
      s = lines.join('\n');
    } else {
      s = newImports.join('\n') + '\n' + s;
    }
  }

  return s;
}

let changed = 0;
let skipped = 0;

for (const rel of FILES) {
  const filePath = resolve(root, rel);
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`⚠️  SKIP (not found): ${rel}`);
    skipped++;
    continue;
  }

  const transformed = transformContent(content);
  if (transformed !== content) {
    writeFileSync(filePath, transformed, 'utf8');
    console.log(`✅  ${rel}`);
    changed++;
  } else {
    console.log(`—   ${rel} (no changes)`);
  }
}

console.log(`\nDone: ${changed} files changed, ${skipped} skipped.`);
