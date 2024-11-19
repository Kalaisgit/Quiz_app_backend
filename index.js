import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT ? process.env.PORT : 5001;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

app.use(express.json());
app.use(cors());

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 1. User Registration
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await db.query(
      "INSERT INTO Users (username, password, role) VALUES ($1, $2, $3) RETURNING id",
      [username, hashedPassword, role]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM Users WHERE username = $1", [
      username,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET
    );
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Create Quiz Question (Teacher Only)
app.post("/questions", authenticateToken, async (req, res) => {
  if (req.user.role !== "Teacher")
    return res.status(403).json({ message: "Access denied" });

  const { question, option_a, option_b, option_c, option_d, correct_option } =
    req.body;
  const teacherId = req.user.id;

  try {
    const result = await db.query(
      "INSERT INTO Questions (question, option_a, option_b, option_c, option_d, correct_option, teacher_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        teacherId,
      ]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Get Quiz Questions (For Students)
app.get("/questions", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM Questions ORDER BY RANDOM() LIMIT 5"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Submit Quiz and Get Results (For Students)
app.post("/submit", authenticateToken, async (req, res) => {
  const { answers } = req.body;
  let score = 0;

  try {
    const questionsResult = await db.query(
      "SELECT * FROM Questions WHERE id = ANY($1)",
      [answers.map((ans) => ans.id)]
    );
    const questions = questionsResult.rows;

    answers.forEach((ans) => {
      const question = questions.find((q) => q.id === ans.id);
      if (question.correct_option === ans.selectedOption) {
        score += 1;
      }
    });

    // Save result in Results table
    await db.query("INSERT INTO Results (student_id, score) VALUES ($1, $2)", [
      req.user.id,
      score,
    ]);
    res.json({ score });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
