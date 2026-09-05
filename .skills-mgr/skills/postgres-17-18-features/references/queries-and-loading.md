# PostgreSQL 17/18: Queries and loading

## Index design [18]

Btree **skip scan** uses a multicolumn index when the leading columns carry no equality
restriction, so one `(a, b)` index now serves `WHERE b = ?` as an index scan:

```
Index Only Scan using ss_a_b_idx on ss
  Index Cond: (b = 12345)
```

Order a composite index by the queries it must serve. Treat a trailing-column index as a
removal candidate only after workload measurements establish that the remaining indexes preserve
its required behavior and performance. Skip scan is most effective when the leading column has
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

For `COPY FROM` in text/CSV format, `ON_ERROR ignore` can skip input-value conversion errors.
It does not skip structural errors such as missing columns or constraint violations. See the
[COPY error contract](https://www.postgresql.org/docs/18/sql-copy.html).

```sql
COPY t FROM '/path/data.csv'
  WITH (format csv, on_error ignore, reject_limit 100, log_verbosity verbose);
```

- `on_error ignore` + `log_verbosity verbose` **[17]** skips rows with input conversion errors and reports each one.
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
| Interval week / negative quarter | `EXTRACT(WEEK FROM interval_value)`, corrected negative-interval `QUARTER` | 18 |
| Random integer in a range | `random(1, 10)` — no `floor(random()*n)` | 17 |
| Binary or octal text | `to_bin(n)`, `to_oct(n)` | 17 |
| A domain's underlying type | `pg_basetype('d'::regtype)` | 17 |
| Unbounded interval | `'infinity'::interval`, `'-infinity'::interval` | 17 |

The version-18 extraction changes concern intervals, not ordinary ISO week extraction from dates
or timestamps. See the [upstream interval correction](https://github.com/postgres/postgres/commit/6be39d77a).

## EXPLAIN

On 18 `EXPLAIN ANALYZE` reports `Buffers` unprompted, so add no `BUFFERS` flag; row
counts print fractionally (`actual rows=1.00`), disabled nodes are labeled, per-index
lookup counts appear, and `Material`, `WindowAgg`, and CTE nodes report memory or disk
use. On 17, `MEMORY` shows planner allocation and `SERIALIZE` shows the cost of forming
the result for the client:

```sql
EXPLAIN (ANALYZE, MEMORY, SERIALIZE) SELECT ...;
```
