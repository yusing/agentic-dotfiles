# PostgreSQL 17/18: Local server operations

## Local server settings

Defaults that already suit a single-machine server on 18: `effective_io_concurrency` and
`maintenance_io_concurrency` are `16`, `io_combine_limit` is 128kB, and `initdb` enables
data page checksums. Leave these alone absent a measured reason.

Worth setting deliberately:

- `io_method` **[18]** defaults to `worker` (with `io_workers = 3`). `io_uring` is Linux-only and needs a build with `--with-liburing`; confirm the binary supports it before setting it, since it is start-only and a bad value blocks startup. `sync` restores pre-18 behavior for comparison.
- `maintenance_work_mem` **[17]** is no longer capped at 1GB for vacuum's dead-tuple store, so raising it now genuinely shortens vacuum on a large table.
- `transaction_timeout` **[17]** aborts a transaction that outlives it — the guard against a forgotten open transaction holding back vacuum. `idle_in_transaction_session_timeout` covers only the idle case.
- `vacuum_max_eager_freeze_failure_rate` **[18]** (default `0.03`) lets ordinary vacuum freeze all-visible pages early, spreading work that would otherwise land in one aggressive vacuum.
- `autovacuum_vacuum_max_threshold` **[18]** caps the dead-tuple count that triggers autovacuum, so a large table no longer waits for a percentage of its rows to go dead.
- `vacuum_truncate` **[18]** is settable server-wide, not only per table.

## Maintenance

`ANALYZE ONLY parent` **[18]** refreshes a partitioned table's own statistics without
touching partitions. `VACUUM ONLY parent` is accepted but does nothing — a partitioned
table has no storage — and says so:

```
WARNING:  VACUUM ONLY of partitioned table "pp" has no effect
```

Upgrading to 18 with `pg_upgrade` carries optimizer statistics across, so queries plan
well immediately; `--swap` is the fastest mode and `--jobs` parallelizes its checks.
`ALTER TABLE ... SET STATISTICS DEFAULT` **[17]** restores the default target more
legibly than `-1`.
