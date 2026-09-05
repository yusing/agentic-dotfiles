---
name: postgres-17-18-features
description: Choose version-compatible PostgreSQL 17/18 features for SQL, schema, or local-server work.
---

# PostgreSQL 17 and 18 features

Establish the target server version before emitting version-specific syntax. Use the declared
project target or, when a server query is needed, read it without changing state:

```sql
SELECT current_setting('server_version_num')::int;  -- 180000 = 18.x, 170000 = 17.x
```

References tag features with the first supported version. Choose a feature because it meets the
requested contract, not merely because it is newer. This skill targets a local single-machine
server; it is not a general database audit or an automatic migration.

## References

- For generated columns, keys, constraints, MERGE, or RETURNING, read
  [schema-and-dml.md](references/schema-and-dml.md).
- For indexes, SQL/JSON, bulk loading, functions, or EXPLAIN, read
  [queries-and-loading.md](references/queries-and-loading.md).
- For server settings, vacuum, statistics, or upgrade mechanics, read
  [operations.md](references/operations.md).

Load only the branch needed. Feature availability does not authorize data writes, DDL, extension
installation, maintenance, or a server restart. Complete the requested change with version and
contract checks; do not convert neighboring SQL or tune the server without an in-scope need.
