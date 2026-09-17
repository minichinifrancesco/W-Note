PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  data_nascita DATETIME NOT NULL,
  genere TEXT NOT NULL DEFAULT 'NON_SPECIFICATO',
  peso REAL,
  altezza_cm REAL,
  data_registrazione DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  obiettivo_allenamento TEXT NOT NULL DEFAULT 'GENERALE',
  livello_allenamento TEXT NOT NULL DEFAULT 'PRINCIPIANTE',
  giorni_target_settimanali INTEGER NOT NULL DEFAULT 3,

  CHECK (peso IS NULL OR peso >= 0),
  CHECK (altezza_cm IS NULL OR altezza_cm >= 0),
  CHECK (genere IN ('MASCHIO', 'FEMMINA', 'NON_SPECIFICATO')),
  CHECK (obiettivo_allenamento IN ('GENERALE', 'MASSA', 'FORZA', 'DIMAGRIMENTO', 'MANTENIMENTO')),
  CHECK (livello_allenamento IN ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZATO')),
  CHECK (giorni_target_settimanali BETWEEN 1 AND 7)
);

CREATE TABLE password_reset_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CHECK (attempts >= 0)
);

CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  tema TEXT NOT NULL DEFAULT 'system',
  preferred_load_unit TEXT NOT NULL DEFAULT 'KG',
  tempo_recupero_default_secondi INTEGER NOT NULL DEFAULT 60,
  rest_timer_sound BOOLEAN NOT NULL DEFAULT 1,
  rest_timer_haptic BOOLEAN NOT NULL DEFAULT 1,
  note_esercizi_abilitate BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CHECK (tema IN ('light', 'dark', 'system')),
  CHECK (preferred_load_unit IN ('KG', 'LBS')),
  CHECK (tempo_recupero_default_secondi >= 0),
  CHECK (rest_timer_sound IN (0, 1)),
  CHECK (rest_timer_haptic IN (0, 1)),
  CHECK (note_esercizi_abilitate IN (0, 1))
);

CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descrizione TEXT,
  gruppo_muscolare TEXT NOT NULL,
  tipo_attrezzatura TEXT NOT NULL DEFAULT 'ALTRO',
  tipo_tracciamento TEXT NOT NULL,
  origine TEXT NOT NULL DEFAULT 'BASE',
  user_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CHECK (tipo_attrezzatura IN ('MACCHINARI', 'CORPO_LIBERO', 'PESI_LIBERI', 'CON_PESI', 'CAVI', 'CARDIO_MACHINE', 'ALTRO')),
  CHECK (tipo_tracciamento IN ('WEIGHT_REPS', 'REPS', 'TIMED')),
  CHECK (origine IN ('BASE', 'CUSTOM')),
  CHECK (
    (origine = 'BASE' AND user_id IS NULL)
    OR
    (origine = 'CUSTOM' AND user_id IS NOT NULL)
  )
);

CREATE TABLE workout_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  attiva BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CHECK (attiva IN (0, 1))
);

CREATE TABLE workout_plan_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_plan_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  ordine INTEGER NOT NULL,
  note TEXT,
  tempo_recupero_secondi INTEGER NOT NULL DEFAULT 60,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CHECK (ordine > 0),
  CHECK (tempo_recupero_secondi >= 0),
  UNIQUE (workout_plan_id, ordine)
);

CREATE TABLE planned_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_plan_exercise_id INTEGER NOT NULL,
  numero_serie INTEGER NOT NULL,
  carico_target REAL,
  ripetizioni_target INTEGER,
  durata_target_secondi INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workout_plan_exercise_id) REFERENCES workout_plan_exercises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CHECK (numero_serie > 0),
  CHECK (carico_target IS NULL OR carico_target >= 0),
  CHECK (ripetizioni_target IS NULL OR ripetizioni_target >= 0),
  CHECK (durata_target_secondi IS NULL OR durata_target_secondi >= 0),
  UNIQUE (workout_plan_exercise_id, numero_serie)
);

CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  workout_plan_id INTEGER,
  nome_snapshot TEXT NOT NULL,
  ora_inizio DATETIME NOT NULL,
  ora_fine DATETIME,
  durata_secondi INTEGER NOT NULL DEFAULT 0,
  completato BOOLEAN NOT NULL DEFAULT 0,
  note_generali TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CHECK (durata_secondi >= 0),
  CHECK (completato IN (0, 1)),
  CHECK (ora_fine IS NULL OR ora_fine >= ora_inizio)
);

CREATE TABLE workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_id INTEGER,
  nome_snapshot TEXT NOT NULL,
  gruppo_muscolare_snapshot TEXT NOT NULL,
  tipo_tracciamento_snapshot TEXT NOT NULL,
  ordine INTEGER NOT NULL,
  note TEXT,
  tempo_recupero_secondi INTEGER NOT NULL DEFAULT 60,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workout_id) REFERENCES workouts(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CHECK (tipo_tracciamento_snapshot IN ('WEIGHT_REPS', 'REPS', 'TIMED')),
  CHECK (ordine > 0),
  CHECK (tempo_recupero_secondi >= 0),
  UNIQUE (workout_id, ordine)
);

CREATE TABLE executed_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_exercise_id INTEGER NOT NULL,
  numero_serie INTEGER NOT NULL,
  carico REAL,
  ripetizioni INTEGER,
  durata_secondi INTEGER,
  completata BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CHECK (numero_serie > 0),
  CHECK (carico IS NULL OR carico >= 0),
  CHECK (ripetizioni IS NULL OR ripetizioni >= 0),
  CHECK (durata_secondi IS NULL OR durata_secondi >= 0),
  CHECK (completata IN (0, 1)),
  UNIQUE (workout_exercise_id, numero_serie)
);

CREATE TABLE badge_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codice TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descrizione TEXT,
  icona TEXT,
  categoria TEXT
);

CREATE TABLE user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_definition_id INTEGER NOT NULL,
  exercise_id INTEGER,
  workout_id INTEGER,
  workout_exercise_id INTEGER,
  executed_set_id INTEGER,
  valore REAL,
  ottenuto_il DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  FOREIGN KEY (badge_definition_id) REFERENCES badge_definitions(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  FOREIGN KEY (workout_id) REFERENCES workouts(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  FOREIGN KEY (executed_set_id) REFERENCES executed_sets(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CHECK (valore IS NULL OR valore >= 0)
);

CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_password_reset_codes_user_id ON password_reset_codes(user_id);
CREATE INDEX idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);
CREATE INDEX idx_exercises_origine ON exercises(origine);
CREATE INDEX idx_exercises_gruppo_muscolare ON exercises(gruppo_muscolare);
CREATE INDEX idx_exercises_tipo_attrezzatura ON exercises(tipo_attrezzatura);

CREATE UNIQUE INDEX idx_unique_custom_exercise_per_user
ON exercises(user_id, nome, gruppo_muscolare)
WHERE origine = 'CUSTOM';

CREATE INDEX idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX idx_workout_plans_user_attiva ON workout_plans(user_id, attiva);

CREATE INDEX idx_workout_plan_exercises_plan_id
ON workout_plan_exercises(workout_plan_id);

CREATE INDEX idx_workout_plan_exercises_exercise_id
ON workout_plan_exercises(exercise_id);

CREATE INDEX idx_planned_sets_plan_exercise_id
ON planned_sets(workout_plan_exercise_id);

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_plan_id ON workouts(workout_plan_id);
CREATE INDEX idx_workouts_ora_inizio ON workouts(ora_inizio);
CREATE INDEX idx_workouts_user_ora_inizio ON workouts(user_id, ora_inizio);

CREATE INDEX idx_workout_exercises_workout_id
ON workout_exercises(workout_id);

CREATE INDEX idx_workout_exercises_exercise_id
ON workout_exercises(exercise_id);

CREATE INDEX idx_executed_sets_workout_exercise_id
ON executed_sets(workout_exercise_id);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_definition_id ON user_badges(badge_definition_id);
CREATE INDEX idx_user_badges_exercise_id ON user_badges(exercise_id);
CREATE INDEX idx_user_badges_workout_id ON user_badges(workout_id);
CREATE INDEX idx_user_badges_workout_exercise_id ON user_badges(workout_exercise_id);
CREATE INDEX idx_user_badges_executed_set_id ON user_badges(executed_set_id);
CREATE INDEX idx_user_badges_ottenuto_il ON user_badges(ottenuto_il);
CREATE INDEX idx_user_badges_user_ottenuto_il ON user_badges(user_id, ottenuto_il);
