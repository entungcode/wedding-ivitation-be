const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wedding_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get all wishes with pagination
app.get('/wishes', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM wishes ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [total] = await pool.query('SELECT COUNT(*) as count FROM wishes');

    res.json({
      status: 'success',
      data: rows,
      pagination: {
        page,
        limit,
        total: total[0].count,
        totalPages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching wishes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch wishes'
    });
  }
});

// Add new wish with validation
app.post('/wishes', async (req, res) => {
  const { name, message } = req.body;

  // Validation
  if (!name || !message) {
    return res.status(400).json({
      status: 'error',
      message: 'Name and message are required'
    });
  }

  if (name.length < 3) {
    return res.status(400).json({
      status: 'error',
      message: 'Name must be at least 3 characters long'
    });
  }

  if (message.length < 10) {
    return res.status(400).json({
      status: 'error',
      message: 'Message must be at least 10 characters long'
    });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO wishes (name, message) VALUES (?, ?)',
      [name.trim(), message.trim()]
    );

    // Get the newly created wish
    const [newWish] = await pool.query(
      'SELECT * FROM wishes WHERE id = ?',
      [result.insertId]
    );

    res.json({
      status: 'success',
      message: 'Wish added successfully',
      data: newWish[0]
    });
  } catch (error) {
    console.error('Error adding wish:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add wish'
    });
  }
});

// Delete wish (optional, for admin)
app.delete('/wishes/:id', async (req, res) => {
  const { id } = req.params;
  const { adminKey } = req.headers;

  // Simple admin validation
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized'
    });
  }

  try {
    await pool.query('DELETE FROM wishes WHERE id = ?', [id]);
    res.json({
      status: 'success',
      message: 'Wish deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting wish:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete wish'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 