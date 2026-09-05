# PostgreSQL 17/18: Schema and DML

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
`uuid_extract_timestamp()` and `uuid_extract_version()` are available in **[17]**, but
timestamp extraction supports only v1 there and returns NULL for v7. Extracting a v7 timestamp
requires **[18]**. See the [17](https://www.postgresql.org/docs/17/functions-uuid.html) and
[18](https://www.postgresql.org/docs/18/functions-uuid.html) UUID contracts.

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
