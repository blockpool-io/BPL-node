/* Create Schema
 *
 */

BEGIN;

/* Tables */
CREATE TABLE IF NOT EXISTS "autoupdates"(
  "transactionId" VARCHAR(64) UNIQUE NOT NULL,
  "versionLabel" VARCHAR(12) NOT NULL,
  "triggerHeight" INT NOT NULL,
  "ipfsHash" VARCHAR(46) NOT NULL,
  "verifyingTransactionId" VARCHAR(64) DEFAULT NULL,
  "cancellationStatus" BOOLEAN DEFAULT FALSE,
  FOREIGN KEY("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE,
  FOREIGN KEY("verifyingTransactionId") REFERENCES "transactions"("id") ON DELETE CASCADE
);

COMMIT;
