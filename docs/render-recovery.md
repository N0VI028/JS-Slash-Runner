# Recovering silently replaced message nodes

When a swipe generation is canceled before content arrives, SillyTavern 1.16.0 and 1.19.0 can restore the previous
candidate by replacing its message DOM without a matching message-rendered/swiped event. The old Vue teleport target is
detached, so the restored frontend stays a code block.

## Transaction ownership

`MessageRenderCoordinator` reserves a transaction synchronously for a chat epoch, numeric message ID, DOM node reference
and input revision. Event callbacks reserve before any await or destructive work. A matching pending/running request
joins the same Promise; a committed request skips execution only while its output remains attached. A new input, node or
epoch invalidates the old task. Explicit refresh/settings changes invalidate the epoch as well.

Execution moves from pending to running to committed. The pipeline checks ownership before handlers, across their async
boundaries and after Vue's final DOM flush. Owned synchronous macro/wrapper changes refresh the expected normalized
input; callbacks must not use this mechanism to accept unrelated changes after an async wait. Canceling a task also
clears its pending timer and releases waiters. Exceptions never produce a committed record.

Macro expansion, code collapsing, ordinary iframes and streaming rendering register ordered handlers. This prevents a
rescue from mounting first and a late normal event subsequently destroying and mounting it again. The streaming
renderer's existing nextTick/timer delay executes within the reserved transaction, and the callback retains the captured
node rather than looking up a later chat's matching `mesid`.

The input excludes generated iframes, collapse controls, helper wrappers, highlighting artifacts and helper visibility
classes. Ordinary runtime targets are checked for connectivity; streaming runtimes bind both the message root and source
`.mes_text` identity and get a new component key when the host target changes. The streaming-token path is inactive when
Allow streaming rendering is disabled.

## DOM recovery lifecycle

A single observer watches only `#chat` direct child additions/removals. Same-ID replacements enter the same coordinator
as normal events. There is no whole-page/subtree polling and no synthetic host event. Normal host notifications, whether
earlier or later, consequently share or reuse the same transaction.

Chat changes/reloads invalidate pending identities. Rendering/settings changes reset runtime ownership and rescan
visible messages, retaining depth and hidden-message rules. Message removal audits detached runtimes. Panel teardown
disconnects the observer and event listeners. Managed TauriTavern surfaces retain their existing owner path.

## Validation

- `pnpm test`: controlled-Promise/fake-timer coordinator tests and jsdom observer/normalization tests.
- `pnpm build`: production build; set `ST_IMPORT_DEPTH=5` for an independent checkout.
- The browser fixture and instructions are in `tests/browser/`.
- Whole-project `vue-tsc` currently reports existing upstream diagnostics; compare against the same upstream commit,
  dependency installation and host-path configuration rather than treating a failing baseline as a passing typecheck.

No manifest/public API/storage schema changes are required. Source and tracked build outputs should be reviewed
together. Deployment is separate from development: copy only reviewed plugin files after checking target diffs, and
retain file-level backups and checksums. Do not replace the host application checkout.
