CREATE TABLE Users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(10) CHECK(role IN ('Teacher', 'Student')) NOT NULL
);



CREATE TABLE Questions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option VARCHAR(1) CHECK(correct_option IN ('a', 'b', 'c', 'd')) NOT NULL,
  teacher_id INT REFERENCES Users(id) ON DELETE CASCADE
);


CREATE TABLE Results (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES Users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
