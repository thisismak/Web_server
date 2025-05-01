import express, { Request, Response, Application, RequestHandler } from 'express';
import { print } from 'listening-on';
import { randomUUID } from 'node:crypto';
import sqlite3 from 'sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Define interfaces for SQLite query results
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

interface Post {
  id: number;
  user_id: number;
  name: string;
  type: string;
  function: string;
  features: string;
  category: string;
  tags: string;
  image: string | null;
  file: string | null;
  file_name: string | null;
  file_type: string | null;
  impact: string | null;
  username?: string;
}

// Define interface for Multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

// Initialize SQLite database
const db = new sqlite3.Database('db.sqlite3', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize Express app
const server: Application = express();

// Configure multer for file uploads to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

server.use(express.static('public'));
server.use('/Uploads', express.static(uploadDir)); // Serve uploads for images
server.use(express.urlencoded({ extended: true }));
server.use(express.json({ limit: '10mb' }));

const registerHandler: RequestHandler = (req: Request, res: Response): void => {
  const { username, password } = req.body;
  console.log('Register attempt:', { username, password });

  if (!username) {
    res.status(400).json({ error: 'missing username' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'missing password' });
    return;
  }

  db.get('SELECT id FROM user WHERE username = ?', [username], (err, row: User | undefined) => {
    if (err) {
      console.error('Database error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    if (row) {
      res.status(409).json({ error: 'username already exists' });
      return;
    }

    db.run(
      'INSERT INTO user (username, password, avatar, email) VALUES (?, ?, NULL, NULL)',
      [username, password],
      function (err) {
        if (err) {
          console.error('Insert user error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
        console.log('Registered user:', { id: this.lastID, username });
        res.status(200).json({ message: 'Register Success' });
      }
    );
  });
};

server.post('/register', registerHandler);

const loginHandler: RequestHandler = (req: Request, res: Response): void => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });

  if (!username) {
    res.status(400).json({ error: 'missing username' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'missing password' });
    return;
  }

  db.get('SELECT id, username, password FROM user WHERE username = ?', [username], (err, user: User | undefined) => {
    if (err) {
      console.error('Database error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    if (!user) {
      res.status(401).json({ error: 'wrong username' });
      return;
    }
    if (user.password !== password) {
      res.status(401).json({ error: 'wrong password' });
      return;
    }

    const token = randomUUID();
    db.run('INSERT INTO session (token, user_id) VALUES (?, ?)', [token, user.id], (err) => {
      if (err) {
        console.error('Insert session error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      res.status(200).json({ token });
    });
  });
};

server.post('/login', loginHandler);

const logoutHandler: RequestHandler = (req: Request, res: Response): void => {
  const token = req.query.token as string;
  db.run('DELETE FROM session WHERE token = ?', [token], (err) => {
    if (err) {
      console.error('Delete session error:', err.message);
    }
    res.redirect('/');
  });
};

server.get('/logout', logoutHandler);

const roleHandler: RequestHandler = (req: Request, res: Response): void => {
  const token = req.query.token as string || '';
  db.get('SELECT user_id FROM session WHERE token = ?', [token], (err, session: Session | undefined) => {
    if (err) {
      console.error('Database error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.status(200).json({
      role: session?.user_id ? 'user' : 'guest',
      user_id: session?.user_id,
    });
  });
};

server.get('/role', roleHandler);

const postsHandler: RequestHandler = (req: Request, res: Response): void => {
  db.all(
    'SELECT post.*, user.username FROM post LEFT JOIN user ON post.user_id = user.id',
    [],
    (err, rows: Post[]) => {
      if (err) {
        console.error('Database error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      res.status(200).json({ posts: rows });
    }
  );
};

server.get('/posts', postsHandler);

const uploadHandler: RequestHandler = (req: Request, res: Response): void => {
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const { name, type, function: func, features, category, tags, token, impact, file_name, file_type } = req.body;

    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }
    if (!name || !type || !func || !features || !category || !tags) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    db.get('SELECT user_id FROM session WHERE token = ?', [token], (err, session: Session | undefined) => {
      if (err) {
        console.error('Database error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      if (!session) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      // Explicitly type req.files as an object with field names
      const files = req.files as { [fieldname: string]: MulterFile[] } | undefined;

      const imagePath = files?.['image']?.[0] ? path.join('uploads', files['image'][0].filename) : null;
      const filePath = files?.['file']?.[0] ? path.join('uploads', files['file'][0].filename) : null;

      db.run(
        'INSERT INTO post (user_id, name, type, function, features, category, tags, image, file, file_name, file_type, impact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          session.user_id,
          name,
          type,
          func,
          features,
          category,
          tags,
          imagePath,
          filePath,
          file_name || (files?.['file']?.[0]?.originalname) || null,
          file_type || (files?.['file']?.[0]?.mimetype) || null,
          impact || null,
        ],
        (err) => {
          if (err) {
            console.error('Insert post error:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
          res.status(200).json({ message: 'Resource uploaded successfully' });
        }
      );
    });
  });
};

server.post('/upload', uploadHandler);

const downloadHandler: RequestHandler<{ postId: string }> = (req: Request<{ postId: string }>, res: Response): void => {
  const postId = parseInt(req.params.postId);
  db.get('SELECT file, file_name, file_type FROM post WHERE id = ?', [postId], (err, post: Post | undefined) => {
    if (err) {
      console.error('Database error:', err.message);
      res.status(500).send('Internal server error');
      return;
    }
    if (!post || !post.file || !post.file_name || !post.file_type) {
      res.status(404).send('File not found');
      return;
    }

    const filePath = path.join(__dirname, post.file);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('File not found on server');
      return;
    }

    res.set({
      'Content-Type': post.file_type,
      'Content-Disposition': `attachment; filename="${post.file_name}"`,
    });
    res.sendFile(filePath);
  });
};

server.get('/download/:postId', downloadHandler);

server.listen(3000, () => {
  print(3000);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});