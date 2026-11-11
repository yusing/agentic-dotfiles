---
name: rust-reliability
description: Check Rust changes for cancellation, task-lifetime, backpressure, and ownership failure modes during implementation or review.
---
# Rust reliability

Apply relevant checks to the changed path. Follow the crate's existing conventions;
this is not a style guide or a reason to introduce new abstractions.

## Async lifetimes

- Identify who owns each spawned task and observes its result. Dropping a Tokio
  `JoinHandle` detaches its task; joining has both task and application error layers.
- At `select!`, timeout, or abort boundaries, check what dropping the losing future
  leaves behind: partial writes, consumed messages, held resources, or unfinished work.
  Cancellation requests do not prove completion or roll back side effects.
- Shutdown should stop admission, signal workers, and observe their exit. If shutdown
  has a deadline, define what happens to remaining work; sleeping is not joining.
- Bound queued work and in-flight work separately. A semaphore inside every spawned
  task does not bound the number of waiting tasks. Handle closed channels without
  retry loops that spin; decide whether overload waits, rejects, or drops work.
- Keep blocking I/O and long CPU work off executor workers. Started `spawn_blocking`
  work cannot be aborted; plan its termination separately.
- Inspect guards held across awaits for lock-order cycles and serialized slow I/O.
  Async mutexes permit this, but do not make the surrounding protocol deadlock-free.

## Ownership and failure boundaries

- Clone when an independent owner is needed, not merely to silence lifetime errors.
  Sharing through `Arc` does not make the contained data thread-safe.
- Check actual bounds rather than pointer-type folklore: `&T: Send` requires
  `T: Sync`; `&mut T: Send` requires `T: Send`.
- Handle external failures with useful operation context. Reserve panics for explicit
  invariants; assess their effect on worker tasks and shared state rather than banning
  every `expect` or silently discarding errors.
- For changed unsafe code, state the validity, aliasing, lifetime, and thread-safety
  invariants at the boundary. Verify dependency guarantees for the pinned version.

## Focused evidence

Exercise the relevant failure transition, such as cancellation mid-operation, worker
failure, channel closure, saturation, or shutdown with work pending. Prefer controlled
synchronization over arbitrary sleeps; assert completion and resource recovery where
the contract requires them. Reuse repository test and lint commands.
