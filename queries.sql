-- Create the users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(10) CHECK(role IN ('Teacher', 'Student')) NOT NULL,
  quiz_completed BOOLEAN DEFAULT FALSE
);

-- Create the questions table
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option VARCHAR(1) CHECK(correct_option IN ('a', 'b', 'c', 'd')) NOT NULL,
  teacher_id INT REFERENCES users(id) ON DELETE CASCADE
);

-- Create the results table
CREATE TABLE results (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id) ON DELETE CASCADE,
  question_id INT REFERENCES questions(id) ON DELETE CASCADE,
  selected_option VARCHAR(1) CHECK(selected_option IN ('a', 'b', 'c', 'd')) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quiz_id INT NOT NULL,
  score INT DEFAULT 0,
  UNIQUE (student_id, question_id) -- Ensure one attempt per question per student
);
