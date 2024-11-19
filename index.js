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
  if (!token) {
    console.log("No token provided"); // Log if no token is found
    return res.sendStatus(403); // Forbidden if no token
  }

  // Strip the "Bearer " prefix
  const tokenWithoutBearer = token.split(" ")[1];

  if (!tokenWithoutBearer) {
    console.log("Token format is incorrect"); // Log incorrect token format
    return res.sendStatus(403); // Forbidden if token format is incorrect
  }

  // Log the token being passed
  console.log("Token received:", tokenWithoutBearer);

  jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Token verification failed:", err); // Log token verification failure
      return res.sendStatus(403); // Forbidden if verification fails
    }

    // Log the decoded token
    console.log("Decoded user:", user);

    req.user = user;
    next();
  });
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role }, // Payload with user data
    process.env.JWT_SECRET, // Secret key (ensure this is set in .env)
    { expiresIn: "1h" } // Token expiration time
  );
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
    // Validate username with the database
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Compare the provided password with the stored hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        // Generate a JWT token with user id and role
        const token = generateToken(user);

        // Send response with token, id, and role
        res.status(200).json({
          token,
          id: user.id,
          role: user.role,
        });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. Create Quiz Question (Teacher Only)
app.post("/quiz", authenticateToken, async (req, res) => {
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
app.get("/quiz", async (req, res) => {
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

// Teacher Dashboard Route (Protected)

// Get all students
async function getStudents() {
  try {
    const result = await db.query(
      "SELECT id, username FROM Users WHERE role = 'Student'"
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching students:", err);
    throw new Error("Unable to fetch students");
  }
}

// Get top student based on score
async function getTopStudent() {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, r.score
       FROM Results r
       JOIN Users u ON r.student_id = u.id
       ORDER BY r.score DESC
       LIMIT 1`
    );
    return result.rows[0]; // The top student, with the highest score
  } catch (err) {
    console.error("Error fetching top student:", err);
    throw new Error("Unable to fetch top student");
  }
}

app.get("/teacher-dashboard", async (req, res) => {
  try {
    // Fetch students and top student data from your database
    const students = await getStudents(); // Replace with actual DB call
    const topStudent = await getTopStudent(); // Replace with actual DB call

    res.json({ students, topStudent });
  } catch (err) {
    console.error("Error in /teacher-dashboard route:", err);
    res.status(500).json({ error: "Unable to fetch teacher dashboard data" });
  }
});

// Example route to add a new question
// Add new question route
app.post("/add-question", async (req, res) => {
  const {
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option,
    teacher_id,
  } = req.body;

  console.log(teacher_id);

  if (!teacher_id) {
    return res.status(400).json({ error: "Teacher ID is required." });
  }

  try {
    const newQuestion = await db.query(
      `INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_option, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        teacher_id,
      ]
    );
    res.json({ question: newQuestion.rows[0] });
  } catch (err) {
    console.error("Error adding question:", err);
    res.status(500).send("Server Error");
  }
});

app.get("/questions", authenticateToken, async (req, res) => {
  try {
    // Check if the user is a Teacher
    if (req.user.role !== "Teacher") {
      console.log("Unauthorized role:", req.user.role); // Log unauthorized role
      return res
        .status(403)
        .json({ error: "You are not authorized to view the questions." });
    }

    console.log("Fetching questions for teacher ID:", req.user.id); // Log teacher ID

    // Fetch the questions from the database for the authenticated teacher
    const result = await db.query(
      "SELECT id, question, option_a, option_b, option_c, option_d, correct_option FROM Questions WHERE teacher_id = $1",
      [req.user.id]
    );

    console.log("Fetched questions:", result.rows); // Log the questions

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ error: "Unable to fetch questions" });
  }
});

app.put("/update-question/:id", async (req, res) => {
  const { id } = req.params;
  const { question, option_a, option_b, option_c, option_d, correct_option } =
    req.body;

  try {
    const updatedQuestion = await db.query(
      `UPDATE Questions SET 
        question = $1, 
        option_a = $2, 
        option_b = $3, 
        option_c = $4, 
        option_d = $5, 
        correct_option = $6
      WHERE id = $7 RETURNING *`,
      [question, option_a, option_b, option_c, option_d, correct_option, id]
    );

    res.json(updatedQuestion.rows[0]);
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({ error: "Unable to update question" });
  }
});

app.delete("/delete-question/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM Questions WHERE id = $1", [id]);
    res.status(200).json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).json({ error: "Unable to delete question" });
  }
});

app.get("/quiz/questions", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "Student") {
      return res
        .status(403)
        .json({ error: "Only students can attempt quizzes." });
    }

    // Fetch random questions for a quiz
    const result = await db.query(
      "SELECT id, question, option_a, option_b, option_c, option_d FROM questions ORDER BY RANDOM() LIMIT 5"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching quiz questions:", err);
    res.status(500).json({ error: "Unable to fetch quiz questions" });
  }
});

app.post("/quiz/submit", authenticateToken, async (req, res) => {
  const { answers } = req.body; // Array of { questionId, selectedOption }
  const studentId = req.user.id;

  try {
    let score = 0;

    // Validate and calculate score
    for (const answer of answers) {
      const { questionId, selectedOption } = answer;
      const questionResult = await db.query(
        "SELECT correct_option FROM questions WHERE id = $1",
        [questionId]
      );

      if (questionResult.rows.length === 0) {
        return res.status(400).json({ error: "Invalid question ID" });
      }

      const correctOption = questionResult.rows[0].correct_option;
      const isCorrect = correctOption === selectedOption;
      if (isCorrect) score++;

      await db.query(
        `INSERT INTO results (student_id, question_id, selected_option, is_correct, score, quiz_id) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (student_id, question_id) DO NOTHING`,
        [studentId, questionId, selectedOption, isCorrect, score, 1]
      );
    }

    res.json({ message: "Quiz submitted successfully", score });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ error: "Unable to submit quiz" });
  }
});

// Express route for checking quiz status
app.get("/quiz/status", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have user authentication logic
    const result = await db.query(
      "SELECT quiz_completed FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length > 0 && result.rows[0].quiz_completed) {
      res.json({ quizCompleted: true });
    } else {
      res.json({ quizCompleted: false });
    }
  } catch (error) {
    console.error("Error checking quiz status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Backend (Node.js + Express) - Example of how you can update the quiz completion status
app.post("/quiz/complete", async (req, res) => {
  const { userId } = req.body; // Ensure you're passing the user ID (from the token or session)
  try {
    const query = `UPDATE users SET quiz_completed = true WHERE id = $1`;
    await db.query(query, [userId]);
    res.status(200).json({ message: "Quiz completion status updated." });
  } catch (err) {
    console.error("Error updating quiz status:", err);
    res.status(500).json({ error: "Failed to update quiz status." });
  }
});

app.get("/student-performance", async (req, res) => {
  try {
    const query = `
      SELECT 
        u.username AS student_name,
        SUM(r.is_correct::int) AS total_score,
        MAX(r.updated_at) AS last_attempt
      FROM results r
      JOIN users u ON r.student_id = u.id
      WHERE u.role = 'Student'
      GROUP BY u.username
      ORDER BY total_score DESC, last_attempt DESC;
    `;
    const { rows } = await db.query(query); // Assuming `db.query` is your database query method
    res.json(rows);
  } catch (err) {
    console.error("Error fetching student performance:", err);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
