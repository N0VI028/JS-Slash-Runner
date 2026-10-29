# Browser regression fixture

Use a **disposable user profile**: this fixture replaces the current in-memory chat with deterministic test messages. Do
not install it in a profile with real conversations.

1. Run SillyTavern 1.16.0 or 1.19.0 with a separate `dataRoot`. Build this branch with Node 22+ and
   `ST_IMPORT_DEPTH=5 pnpm build` when the checkout is outside SillyTavern's public directory.
2. Install the built helper in that profile under a distinct extension folder (for example `JS-Slash-Runner-recovery`),
   and disable the original helper. A global extension with the same folder name can be served by the public static
   route before the user extension route, so verify the bundle actually contains this patch.
3. Install this directory as a second profile extension. Its loading order is 99, before the helper's order 100, so the
   fixture can simulate a host notification arriving before the rescue observer.
4. Select a disposable character, connect Chat Completion to the local OpenAI-compatible mock at
   `http://127.0.0.1:9100/v1`, and enable model streaming. The mock must provide a `render-repro` model, `POST /control`
   with `{ "mode": "delay" | "partial" }`, a delay mode that sends no content until canceled, and a partial mode that
   sends `Second candidate has started.` then holds the response open.
5. Use **QA full suite**. It tests three cancellations, native recovery notifications before/during/after rescue, two
   HTML blocks, saved-candidate navigation, partial cancellation/manual return, depth/hidden-message filters, and
   renderer disable/re-enable.
6. Repeat with the helper's **Allow streaming rendering** disabled/enabled on each SillyTavern version. This setting is
   independent of API streaming.

The visible JSON report includes unique iframe script initialization IDs, the owning message node's identity,
content/swipe checks and pass/fail results. An intact iframe count alone is not sufficient: each replacement must
initialize exactly once per frontend block. The `delayed` browser case uses the normal streaming renderer's
nextTick/timer stages; explicit paused-nextTick/timer ownership is also exercised with controlled promises and fake
timers in the unit tests.

For parallel instances, use distinct cookie hosts (for example `127.0.0.1:8100` and `localhost:8101`), not just
different ports on the same host. Save the JSON from `#render-recovery-results` and a screenshot before unloading the
fixture.

The fixture emits host recovery events only in its designated coexistence cases. The production recovery implementation
never synthesizes host events or changes chat data.
