import express, { Request, Response, Application, RequestHandler } from 'express';
import { print } from 'listening-on';
import { randomUUID } from 'node:crypto';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

// Interfaces
interface User {
  id: number;
  username: string;
  password: string;
  avatar: string | null;
  email: string | null;
}

interface Session {
  id: number;
  token: string;
  user_id: number;
}

// Initialize SQLite database
const db = new sqlite3.Database('db.sqlite3', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create Express app
const server: Application = express();

// Middleware
server.use(express.static('public'));
server.use(express.urlencoded({ extended: true }));
server.use(express.json({ limit: '10mb' }));

// Root route to redirect to login
server.get('/', (req: Request, res: Response) => {
  res.redirect('/login.html');
});

// Authentication middleware
const authenticate: RequestHandler = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization || (req.query.token as string) || '';
  db.get('SELECT user_id FROM session WHERE token = ?', [token], (err, session: Session | undefined) => {
    if (err) {
      console.error('Database error in authenticate:', err.message, err.stack);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    (req as any).user_id = session.user_id;
    next();
  });
};

// Handle user registration
const registerHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;
  console.log('Registration attempt:', { username });

  // Validate input
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }
  if (username.length < 3 || username.length > 32) {
    res.status(400).json({ error: 'Username must be between 3 and 32 characters' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  // Check for duplicate username
  db.get('SELECT id FROM user WHERE username = ?', [username], async (err, row: User | undefined) => {
    if (err) {
      console.error('Database error in register:', err.message, err.stack);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    if (row) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Hash password
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      db.run(
        'INSERT INTO user (username, password, avatar, email) VALUES (?, ?, NULL, ?)',
        [username, hashedPassword, email || null],
        function (err) {
          if (err) {
            console.error('Insert user error:', err.message, err.stack);
            res.status(500).json({ error: 'Server error' });
            return;
          }
          console.log('Registration successful:', { id: this.lastID, username });
          res.status(200).json({ message: 'Registration successful' });
        }
      );
    } catch (hashErr) {
      console.error('Password hashing error:', hashErr);
      res.status(500).json({ error: 'Server error' });
    }
  });
};

server.post('/register', registerHandler);

// Handle user login
const loginHandler: RequestHandler = (req: Request, res: Response): void => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });

  // Validate input
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  // Check credentials
  db.get('SELECT id, username, password FROM user WHERE username = ?', [username], async (err, user: User | undefined) => {
    if (err) {
      console.error('Database error in login:', err.message, err.stack);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    if (!user) {
      res.status(401).json({ error: 'Invalid username' });
      return;
    }

    // Verify password
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid password' });
        return;
      }

      // Create session token
      const token = randomUUID();
      db.run('INSERT INTO session (token, user_id) VALUES (?, ?)', [token, user.id], (err) => {
        if (err) {
          console.error('Insert session error:', err.message, err.stack);
          res.status(500).json({ error: 'Server error' });
          return;
        }
        console.log('Login successful:', { user_id: user.id, token });
        res.status(200).json({ token });
      });
    } catch (hashErr) {
      console.error('Password verification error:', hashErr);
      res.status(500).json({ error: 'Server error' });
    }
  });
};

server.post('/login', loginHandler);

// Handle user logout
const logoutHandler: RequestHandler = (req: Request, res: Response): void => {
  const token = req.query.token as string;
  db.run('DELETE FROM session WHERE token = ?', [token], (err) => {
    if (err) {
      console.error('Delete session error:', err.message, err.stack);
    }
    res.redirect('/');
  });
};

server.get('/logout', logoutHandler);

// Get user info
const userHandler: RequestHandler = (req: Request, res: Response): void => {
  const user_id = (req as any).user_id;
  db.get('SELECT username, email FROM user WHERE id = ?', [user_id], (err, user: User | undefined) => {
    if (err) {
      console.error('Database error in user:', err.message, err.stack);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({ username: user.username, email: user.email });
  });
};

server.get('/user', authenticate, userHandler);

// Update user email
const updateEmailHandler: RequestHandler = (req: Request, res: Response): void => {
  const user_id = (req as any).user_id;
  const { email } = req.body;

  // Validate email
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  // Check for duplicate email
  db.get('SELECT id FROM user WHERE email = ? AND id != ?', [email, user_id], (err, row: User | undefined) => {
    if (err) {
      console.error('Database error in email check:', err.message, err.stack);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    if (row) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    // Update email
    db.run('UPDATE user SET email = ? WHERE id = ?', [email || null, user_id], function (err) {
      if (err) {
        console.error('Update email error:', err.message, err.stack);
        res.status(500).json({ error: 'Server error' });
        return;
      }
      console.log('Email updated:', { user_id, email: email || null, rowsAffected: this.changes });
      res.status(200).json({ message: 'Email updated successfully' });
    });
  });
};

server.patch('/user/email', authenticate, updateEmailHandler);

// Start server
server.listen(8100, () => {
  print(8100);
});