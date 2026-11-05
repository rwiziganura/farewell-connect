# Database migration recovery

These SQL files are manually applied migrations; this project does not currently
track migration execution in a migration ledger. Inspect TiDB's
`INFORMATION_SCHEMA` before applying or recovering a migration. Do not blindly
rerun a file after a partial failure.

## Username migration recovery

`20261104_add_users_username.sql` has already been applied to TiDB Cloud. Do not
rerun it as a whole.

Check whether the `users.username` column and its `uq_users_username` index exist:

```sql
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'username';

SELECT INDEX_NAME, NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND INDEX_NAME = 'uq_users_username';
```

- If both exist and the index has `NON_UNIQUE = 0`, no recovery is needed.
- If the column exists but the index does not, first check for duplicate
  non-NULL usernames:

  ```sql
  SELECT username, COUNT(*) AS duplicate_count
  FROM users
  WHERE username IS NOT NULL
  GROUP BY username
  HAVING COUNT(*) > 1;
  ```

  If there are no duplicates, create only the missing index:

  ```sql
  CREATE UNIQUE INDEX uq_users_username ON users (username);
  ```

  If duplicates exist, stop and resolve them through an approved data
  remediation before creating the index. Do not modify user data as part of
  migration recovery.
- If the column is missing and the index is also missing, the migration has not
  been applied; apply the migration once through the normal deployment process.
- If the index appears to exist while the column is missing, or the metadata is
  otherwise inconsistent, stop and ask the database administrator to investigate.

## Token version migration

`20261104_add_users_token_version.sql` is a new, one-time migration. Check
`INFORMATION_SCHEMA.COLUMNS` for `users.token_version` before applying it. Apply
it manually before deploying the application version that requires token
versioning. It is not safe to run repeatedly.
