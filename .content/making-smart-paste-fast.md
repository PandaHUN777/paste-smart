# Making Smart Paste Fast

How an AI-assisted paste went from ~1.6 seconds to ~450 milliseconds — and what
the profiler actually said.

> **Status:** engineering notes, written for later use as website copy. Every
> number below is labelled either _measured_ or _estimated_. Keep that
> distinction if this gets rewritten for marketing — see
> [Honesty notes](#honesty-notes) at the end.

---

## The problem

Smart Paste is a clipboard manager that picks _for_ you. Press `Ctrl+Shift+V`,
and instead of opening a history list, the app looks at the window you're in,
asks a model which of your recent clipboard entries belongs there, and pastes
it. No UI appears at all when it's confident.

That's the pitch. The issue was that it competed with `Ctrl+V` — an operation
users expect to be instantaneous — and lost. The delay was obvious enough to
break the illusion. A feature that saves you a decision isn't worth much if it
costs you a second and a half of staring at nothing.

So before optimizing anything, we measured where that second and a half went.

## Where the time actually went

Timings taken with `curl` against the live API, plus instrumentation of the
local call path.

| Stage                                             | Time           | Share    |
| ------------------------------------------------- | -------------- | -------- |
| Hotkey → JS, read foreground window over IPC      | ~10–25 ms      | ~1%      |
| DNS                                               | 3–53 ms        | ~2%      |
| **TCP connect**                                   | **310–400 ms** | **~25%** |
| **TLS handshake**                                 | **~300 ms**    | **~20%** |
| Server: network round trip + inference            | 370–820 ms     | ~35%     |
| Clipboard write                                   | ~5 ms          | <1%      |
| **Fixed sleep before synthesizing the keystroke** | **150 ms**     | **~10%** |
| Target app processes `Ctrl+V`                     | 10–50 ms       | ~3%      |

**Estimated total: 1.4–1.8 s.** (Sum of measured components, not a single
stopwatch reading.)

The striking part: **roughly 45% of the delay happened before a single byte of
the actual request left the machine.** Connection setup dominated. The model
wasn't the bottleneck — the handshake was.

### The finding

Two identical requests, the second reusing the first's connection:

```
req1 (cold)   total = 1.100s   tls = 0.684s
req2 (warm)   total = 0.389s   tls = 0.000s
```

**711 ms — 65% of the request — was pure connection setup that a pooled client
would pay once instead of every time.**

So why were we paying it on every paste? The app routed its API calls through
Tauri's HTTP plugin, and in `tauri-plugin-http-2.7.0/src/commands.rs:290`:

```rust
let mut builder = reqwest::ClientBuilder::new();
// ...
builder.build()?.request(method, url)
```

A brand-new `reqwest::Client` is constructed **per request**. In `reqwest`, the
`Client` _is_ the connection pool. A fresh client means a fresh pool, which
means an empty pool, which means a full DNS + TCP + TLS handshake every single
time. The plugin is correct and general; it's just built for occasional calls,
not for a hot path.

This is the kind of thing you only find by measuring. Nothing in the code
_looks_ slow.

### Why the handshake cost so much

Round-trip time to the API was roughly 300 ms. A cold HTTPS connection costs
three of them — one for the TCP handshake, one for TLS 1.3, one for the request
itself — before inference even begins. A warm connection costs one.

You cannot optimize away the speed of light. You _can_ stop paying for it three
times.

## What we changed

### 1. A connection that stays open — ~680 ms

We replaced the generic HTTP plugin with a small purpose-built Rust command
holding a single long-lived client in a `OnceLock`, with a 5-minute idle pool.
A background task opens the connection at startup and pings it once a minute so
it never goes cold — one tiny request per minute, against ~680 ms saved per
paste.

One detail that's easy to get wrong: **the response body must be drained before
the connection returns to the pool.** Drop the response early and the socket is
discarded, and you've built a connection pool that pools nothing.

On the frontend, this is exposed as a `fetch`-compatible function, so the API
SDK is used completely unmodified — it just doesn't know its requests are
travelling through Rust.

Measured, three identical requests:

```
req1 (cold): 0.342 tcp | 0.656 tls | 1.088 total
req2 (warm): 0.000 tcp | 0.000 tls | 0.415 total
req3 (warm): 0.000 tcp | 0.000 tls | 0.402 total
```

Verified the connection genuinely persists while the app sits idle:

```
TCP  172.29.238.136:58384  44.227.31.201:443  ESTABLISHED  18416
```

A useful side effect: the _first_ paste after launch is already warm, because
startup opened the connection before the user asked for anything.

### 2. A sleep that had outlived its purpose — 150 ms

Synthesizing `Ctrl+V` used to wait 150 ms first, so the OS could hand focus back
to the target window after the overlay was dismissed. Entirely correct — for the
version of the app where the overlay always appeared.

Once the hotkey became silent, nothing ever took focus, so there was nothing to
wait for. The delay had quietly become 150 ms of doing nothing, on every single
paste.

It's now conditional: the wait happens only when the overlay was actually on
screen. Worth noting how this bug arose — no one wrote slow code. A change
elsewhere turned correct code into dead weight, and nothing flagged it.

### 3. A smaller question — ~300–450 ms

The original request asked the model two things: _which entry fits?_ and, as a
separate confidence check, _does it actually suit this window?_ It also sent the
clipboard history **twice** — once as application state, once as the options to
choose between. Same text, double the input tokens.

Three changes:

- **Folded the second question into the first** as a `none` option. One extra
  label instead of an entire second inference — and the probability assigned to
  `none` is exactly the relevance signal we were asking for separately.
- **Stopped duplicating the history.** The options already contain it.
- **Trimmed the candidates** from 25 entries × 280 characters to 8 × 120.

Payload size, measured:

| Request shape                         | Bytes   | Server time |
| ------------------------------------- | ------- | ----------- |
| 25 entries × 280 chars, two questions | 15,661  | 817 ms      |
| 3 entries × 60 chars, two questions   | 979     | 455 ms      |
| **8 × 120, one question (current)**   | **571** | **~370 ms** |

Down to 428 input tokens and 62 output tokens per paste.

We verified both branches still behave correctly rather than assuming:

| Active window                                   | Model's answer                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| "Deploy console — paste the git command to run" | the git command, confidence 0.76, relevance 0.81 → pastes silently |
| "Photoshop — Untitled-1 @ 66%"                  | `none` at 1.00 → relevance 0, opens the picker                     |

The second case is the important one. Declining to answer is a feature: when
nothing fits, the app shows you the list instead of pasting something wrong.

### 4. Knowing the answer before the question — ~20 ms

Reading which window has focus is an IPC round trip, and it sat directly on the
critical path — the keypress couldn't start work until it returned.

Now the foreground window is sampled every 300 ms in the background, so the
hotkey already knows where the paste is headed. Sampling pauses while the
overlay is visible, so the app never mistakes its own window for the target, and
state is only updated when the window genuinely changes, so polling four times a
second doesn't cause four re-renders.

## Result

|                            | Before               | After                     |
| -------------------------- | -------------------- | ------------------------- |
| Connection setup           | ~680 ms, every paste | ~0 ms (pooled, kept warm) |
| Focus-restore sleep        | 150 ms, every paste  | 0 ms on the silent path   |
| Request size               | up to 15.7 KB        | 571 B                     |
| Inferences per paste       | 2                    | 1                         |
| Foreground window lookup   | on keypress          | already known             |
| **Round trip (measured)**  | **1.09–1.61 s**      | **0.40–0.42 s**           |
| **End to end (estimated)** | **~1.4–1.8 s**       | **~450–550 ms**           |

**Roughly 3–4× faster.** The remaining time is close to the floor for this
architecture: one network round trip plus inference. Everything else has been
removed.

## What we deliberately didn't do

Two further options were identified and left on the table, because both trade
away something real:

- **Speculative prefetch.** Compute the answer whenever the clipboard or the
  active window changes, so the hotkey is a cache hit — around 20 ms, effectively
  instant. The cost is billed API calls for pastes the user never performs.
- **A local fast path.** Many real cases are pattern-obvious: an email field with
  exactly one email-shaped entry doesn't need a model. Classify locally, call the
  API only when genuinely ambiguous. Free and instant when it hits, but it's a
  second decision system to keep honest alongside the first.

Also noted, not fixed: the 8-candidate cap is a behaviour change, not only a
speed one. An entry older than your 8 most recent can no longer be auto-selected,
though it remains available in the picker. That's a deliberate trade — roughly
100 ms against a deeper history window.

## The general lessons

1. **Measure before optimizing.** The bottleneck was connection setup, not the
   AI model. Almost half the delay happened before the request was sent. Nobody
   would have guessed that.
2. **Convenient abstractions can hide hot-path costs.** The HTTP plugin was
   correct and well-built. It was simply designed for occasional requests, and we
   were using it for the one call that had to be fast.
3. **Correct code goes stale.** The 150 ms sleep was right when it was written.
   A change elsewhere made it pointless, and nothing complained.
4. **Ask smaller questions.** Halving the inferences and shrinking the payload
   cost nothing in quality — and we confirmed that rather than assuming it.
5. **You can't beat physics, but you can stop paying it repeatedly.** The round
   trip is irreducible. Paying for three instead of one was a choice.

## Honesty notes

For anyone reworking this into public copy — keep these accurate:

- **Measured directly:** all `curl` timings, cold vs. warm connection numbers,
  payload sizes, token counts, model responses and confidence values, and the
  `ESTABLISHED` socket.
- **Estimated:** the end-to-end before/after totals (~1.4–1.8 s and
  ~450–550 ms). These are sums of measured components plus local call overhead,
  not single stopwatch readings of a real keypress. The "3–4× faster" claim rests
  on these.
- Network timings were taken from one machine on one connection with ~300 ms RTT
  to the API. Users closer to the servers will see smaller absolute savings from
  the pooling change, though the _proportion_ of time spent on handshakes will be
  similar.
- "Roughly 45% of the delay happened before a byte was sent" is derived from the
  component table, not separately instrumented.

Don't round ~450 ms down to "instant." The honest claim is that it went from
_noticeably slow_ to _fast enough to stop thinking about_, and the write-up is
more interesting than the number anyway.
