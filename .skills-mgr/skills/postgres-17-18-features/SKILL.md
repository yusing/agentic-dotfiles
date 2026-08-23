---
name: postgres-17-18-features
description: "PostgreSQL 17 and 18 capabilities for a local single-machine server, each tagged with the version that introduced it. Use when writing or reviewing SQL, DDL, or migrations that target Postgres 17 or 18, covering UUID keys, generated columns, RETURNING old and new, MERGE, temporal and unenforced constraints, multicolumn index design, SQL/JSON, COPY error tolerance, EXPLAIN output, vacuum settings, and asynchronous I/O."
---

# PostgreSQL 17 and 18 features

Every item below is tagged **[17]** or **[18]** — the first version that accepts it.
Read the server version before you emit tagged syntax, because an **[18]** feature is a
syntax error on 17:

```sql
SELECT current_setting('server_version_num')::int;  -- 180000 = 18.x, 170000 = 17.x
```

Prefer the feature over the hand-rolled equivalent once the server qualifies; treat the
version number, not the release date, as the gate.

## Generated columns: the default flipped [18]

On 18 a `GENERATED ALWAYS AS (...)` column with no kind keyword is **VIRTUAL** —
recomputed on read, occupying no storage. Virtual columns reject indexes and unique
constraints:

```
ERROR:  indexes on virtual generated columns are not supported
ERROR:  unique constraints on virtual generated columns are not supported
```

Write the kind explicitly, every time:

- `STORED` when the column is indexed, carries a unique constraint, or is read far more often than written.
- `VIRTUAL` when it is a read-time convenience and disk or write cost matters.

Further limits: a virtual column takes only built-in functions and types in its
expression and cannot have a user-defined type (`STORED` has neither restriction);
logical replication publishes only `STORED`; neither kind may sit in a partition key.
On 17, `STORED` is mandatory, so 17-era DDL carries no silent change — the trap is new
DDL that omits the keyword and then fails to index.

Change an expression in place with `ALTER TABLE ... ALTER COLUMN ... SET EXPRESSION AS (...)` **[17]** instead of dropping and re-adding the column.

## Keys and UUIDs [18]

Use `uuidv7()` for a generated primary key: the value carries its timestamp in the high
bits, so inserts land at the right edge of the btree instead of scattering across it.
`uuidv4()` is a new alias for the existing `gen_random_uuid()`, worth preferring in new
code because it names the version beside a nearby `uuidv7()` call.
`uuid_extract_timestamp()` and `uuid_extract_version()` **[17]** read a v7 value back:

```sql
CREATE TABLE event (id uuid PRIMARY KEY DEFAULT uuidv7(), payload jsonb);
SELECT uuid_extract_timestamp(id) AS created_at FROM event;  -- no separate column needed
```

`bigint` identity still beats any UUID on index size and locality; reach for `uuidv7()`
when the key must be client-generated or externally visible.

## RETURNING old and new [18]

`UPDATE`, `DELETE`, and `MERGE` expose both row versions, which removes the
read-then-write round trip used to capture a prior value:

```sql
UPDATE account SET balance = balance - 10 WHERE id = 1
  RETURNING old.balance AS before, new.balance AS after;
```

`old` and `new` are renameable when they collide with a table alias:

```sql
UPDATE t SET x = 3 RETURNING WITH (OLD AS o, NEW AS n) o.x, n.x;
```

## MERGE [17]

`WHEN NOT MATCHED BY SOURCE` completes the three-way sync, and `merge_action()` in
`RETURNING` reports which branch fired per row. `MERGE` also runs on updatable views.

```sql
MERGE INTO tgt t USING src s ON t.id = s.id
  WHEN MATCHED THEN UPDATE SET v = s.v
  WHEN NOT MATCHED BY TARGET THEN INSERT VALUES (s.id, s.v)
  WHEN NOT MATCHED BY SOURCE THEN DELETE
  RETURNING merge_action(), t.id;
```

## Temporal keys [18]

`WITHOUT OVERLAPS` replaces a hand-written `EXCLUDE USING gist` for scheduling,
booking, and validity-period tables. Three requirements, each with an unhelpful error
when missed:

- The `WITHOUT OVERLAPS` column must be a range or multirange type, and it must be last.
- The constraint needs at least two columns (`ERROR: constraint using WITHOUT OVERLAPS needs at least two columns`).
- Install `btree_gist` whenever a non-range key column is present, or the scalar column has no GiST operator class (`ERROR: data type integer has no default operator class for access method "gist"`).

```sql
CREATE EXTENSION btree_gist;   -- required for the int column below
CREATE TABLE reservation (
  room   int,
  during daterange,
  PRIMARY KEY (room, during WITHOUT OVERLAPS)
);
CREATE TABLE booking (
  id int, room int, during daterange,
  FOREIGN KEY (room, PERIOD during) REFERENCES reservation (room, PERIOD during)
);
```

A `PERIOD` foreign key demands that its target be covered for the referencing row's
whole duration, and the referenced table must already carry a `WITHOUT OVERLAPS` key.
The constraint is backed by a GiST index, not a btree.

## Constraints on a populated table [18]

- `NOT NULL ... NOT VALID` records the constraint without scanning the table; validate later. It lands in `pg_constraint` with a name, so `ALTER TABLE ... DROP CONSTRAINT <name>` works on it.
- `NOT ENFORCED` on a `CHECK` or foreign key declares intent for tooling and readers while skipping the runtime check — rows violating it are accepted, so use it to document a shape the application already guarantees, never to hide bad data.

```sql
ALTER TABLE t ADD CONSTRAINT t_a_nn NOT NULL a NOT VALID;
ALTER TABLE t VALIDATE CONSTRAINT t_a_nn;   -- when convenient
```

## Index design [18]

Btree **skip scan** uses a multicolumn index when the leading columns carry no equality
restriction, so one `(a, b)` index now serves `WHERE b = ?` as an index scan:

```
Index Only Scan using ss_a_b_idx on ss
  Index Cond: (b = 12345)
```

Order a composite index by the query that needs it most and drop the redundant
single-column index on a trailing column; keep a dedicated index only where measurement
shows the skip scan is too slow. Skip scan is most effective when the leading column has
few distinct values. GIN builds run in parallel on 18, and `IN`-list btree lookups are
faster on 17.

## SQL/JSON [17]

`JSON_TABLE` flattens a document into rows in `FROM`, replacing a `jsonb_array_elements`
plus `LATERAL` chain:

```sql
SELECT * FROM json_table(:doc, '$[*]' COLUMNS (a int PATH '$.a', b text PATH '$.b'));
```

`JSON_VALUE` extracts one scalar with a `RETURNING` type, `JSON_QUERY` returns a JSON
fragment, `JSON_EXISTS` tests a path. jsonpath gained `.integer()`, `.string()`,
`.timestamp()` and siblings for in-path conversion. On 18, `jsonb` `null` casts to a
scalar type as SQL `NULL` rather than erroring, and `jsonb_strip_nulls(doc, true)`
removes null array elements too.

## Bulk load

`COPY` tolerates malformed rows instead of losing the whole load:

```sql
COPY t FROM '/path/data.csv'
  WITH (format csv, on_error ignore, reject_limit 100, log_verbosity verbose);
```

- `on_error ignore` + `log_verbosity verbose` **[17]** skips bad rows and names each one.
- `reject_limit N` **[18]** is the maximum tolerated skips; the N+1th aborts the load. Set it rather than letting an unbounded `ignore` mask a broken file.
- `log_verbosity silent` **[18]** suppresses the per-row notices; `COPY TO` **[18]** reads a populated materialized view.

## Functions

| Need | Write | Ver |
| --- | --- | --- |
| Sort or reverse an array | `array_sort(a)`, `array_reverse(a)` | 18 |
| Case-insensitive compare, Unicode-correct | `casefold(s)` — use over `lower()` for matching | 18 |
| Aggregate whole arrays or composites | `min(col)`, `max(col)` | 18 |
| Checksum bytes | `crc32(b)`, `crc32c(b)` | 18 |
| Gamma functions | `gamma(x)`, `lgamma(x)` | 18 |
| Roman numerals | `to_number(s, 'RN')` | 18 |
| ISO week / negative-year quarter | `EXTRACT(WEEK FROM d)`, fixed `QUARTER` | 18 |
| Random integer in a range | `random(1, 10)` — no `floor(random()*n)` | 17 |
| Binary or octal text | `to_bin(n)`, `to_oct(n)` | 17 |
| A domain's underlying type | `pg_basetype('d'::regtype)` | 17 |
| Unbounded interval | `'infinity'::interval`, `'-infinity'::interval` | 17 |

## EXPLAIN

On 18 `EXPLAIN ANALYZE` reports `Buffers` unprompted, so add no `BUFFERS` flag; row
counts print fractionally (`actual rows=1.00`), disabled nodes are labeled, per-index
lookup counts appear, and `Material`, `WindowAgg`, and CTE nodes report memory or disk
use. On 17, `MEMORY` shows planner allocation and `SERIALIZE` shows the cost of forming
the result for the client:

```sql
EXPLAIN (ANALYZE, MEMORY, SERIALIZE) SELECT ...;
```

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
