BEGIN;

CREATE TABLE IF NOT EXISTS "polls"(
  "name" VARCHAR(50) NOT NULL,
  "address" VARCHAR(50) UNIQUE NOT NULL,
  "startTimestamp" TIMESTAMP NOT NULL,
  "endTimestamp" TIMESTAMP NOT NULL,
  "intentions" TEXT[] NOT NULL,
  "description" VARCHAR(100) DEFAULT NULL,
  "transactionId" VARCHAR(64) UNIQUE NOT NULL,
  FOREIGN KEY("transactionId") REFERENCES transactions(id) ON DELETE CASCADE
);

COMMIT;


/* Alter transactions table */
DO $$
    BEGIN
        BEGIN
            ALTER TABLE transactions ADD COLUMN payload VARCHAR(50) default NULL;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column payload already exists in transactions, skipping';
            CREATE INDEX IF NOT EXISTS "transaction_payload" ON "transactions"("payload");
        END;
        BEGIN
        END;
    END;
$$
