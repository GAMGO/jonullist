CREATE TABLE blacklisted_tokens (
  id           NUMBER(19)      PRIMARY KEY,
  token        VARCHAR2(1024)  NOT NULL UNIQUE,
  user_id      VARCHAR2(100)   NOT NULL,
  expires_at   TIMESTAMP       NOT NULL,
  created_at   TIMESTAMP       NOT NULL,
  reason       VARCHAR2(100)
);

CREATE SEQUENCE BLK_TOK_SEQ START WITH 1 INCREMENT BY 1 NOCACHE;
