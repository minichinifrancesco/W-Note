-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "data_nascita" DATETIME NOT NULL,
    "genere" TEXT NOT NULL DEFAULT 'NON_SPECIFICATO',
    "peso" REAL,
    "altezza_cm" REAL,
    "data_registrazione" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "obiettivo_allenamento" TEXT NOT NULL DEFAULT 'GENERALE',
    "livello_allenamento" TEXT NOT NULL DEFAULT 'PRINCIPIANTE',
    "giorni_target_settimanali" INTEGER NOT NULL DEFAULT 3,

    CHECK ("genere" IN ('MASCHIO', 'FEMMINA', 'NON_SPECIFICATO')),
    CHECK ("peso" IS NULL OR "peso" >= 0),
    CHECK ("altezza_cm" IS NULL OR "altezza_cm" >= 0),
    CHECK ("obiettivo_allenamento" IN ('GENERALE', 'MASSA', 'FORZA', 'DIMAGRIMENTO', 'MANTENIMENTO')),
    CHECK ("livello_allenamento" IN ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZATO')),
    CHECK ("giorni_target_settimanali" BETWEEN 1 AND 7)
);
INSERT INTO "new_users" ("altezza_cm", "cognome", "created_at", "data_nascita", "data_registrazione", "email", "genere", "id", "nome", "password_hash", "peso", "updated_at") SELECT "altezza_cm", "cognome", "created_at", "data_nascita", "data_registrazione", "email", "genere", "id", "nome", "password_hash", "peso", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
