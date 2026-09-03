-- English Haters Phase 1 database blueprint (Cloudflare D1 / SQLite compatible)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  current_track TEXT NOT NULL DEFAULT 'ssc',
  xp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_practice_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  track TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  UNIQUE(track,slug)
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  rule_html TEXT NOT NULL,
  examples_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(topic_id) REFERENCES topics(id)
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  track TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  subtopic TEXT,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  question_text TEXT NOT NULL,
  choices_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  source_type TEXT,
  source_name TEXT,
  source_year INTEGER,
  tags_json TEXT NOT NULL DEFAULT '[]',
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(topic_id) REFERENCES topics(id)
);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_index INTEGER,
  is_correct INTEGER NOT NULL,
  response_ms INTEGER,
  mode TEXT NOT NULL DEFAULT 'practice',
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(question_id) REFERENCES questions(id)
);

CREATE INDEX idx_questions_track_topic ON questions(track,topic_id,is_published);
CREATE INDEX idx_attempts_user_time ON attempts(user_id,attempted_at);
CREATE INDEX idx_attempts_user_question ON attempts(user_id,question_id);

-- Phase 1.3 future production helpers.
-- Mistake Book and mastery can be derived from attempts, but these tables can cache state at scale.
CREATE TABLE IF NOT EXISTS user_question_state (
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  recovery_correct INTEGER NOT NULL DEFAULT 0,
  last_wrong_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,question_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(question_id) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track TEXT NOT NULL,
  topic_id TEXT,
  mode TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_question_state_user ON user_question_state(user_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions(user_id,started_at);

-- Phase 1.4 exam / question-bank blueprint.
CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track TEXT NOT NULL,
  topic_id TEXT,
  difficulty TEXT,
  duration_seconds INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  auto_submitted INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_answers (
  exam_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_index INTEGER,
  is_correct INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(exam_id, question_id),
  FOREIGN KEY(exam_id) REFERENCES exam_sessions(id),
  FOREIGN KEY(question_id) REFERENCES questions(id)
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user ON exam_sessions(user_id,started_at);


-- Phase 1.5 account/profile additions for the older SQLite blueprint.
-- The actual cloud beta uses supabase-setup.sql (Postgres + Supabase Auth/Storage/RLS).
ALTER TABLE users ADD COLUMN avatar_path TEXT;

CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_key TEXT NOT NULL,
  device_name TEXT,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_key),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id,last_seen_at);
