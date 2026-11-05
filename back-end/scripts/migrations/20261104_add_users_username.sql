ALTER TABLE users
  ADD COLUMN username VARCHAR(30) NULL DEFAULT NULL;

CREATE UNIQUE INDEX uq_users_username ON users (username);
