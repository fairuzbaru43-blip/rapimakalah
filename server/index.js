import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import connectPgSimple from 'connect-pg-simple';
import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Pool } from 'pg';
import { normalizeEmail, validateDocument, validateRegistration } from './validation.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(directory, '..');
const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;

if (!databaseUrl) throw new Error('DATABASE_URL wajib diatur di file .env.');
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET wajib diatur di file .env dengan minimal 32 karakter.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});
const app = express();
const PgSessionStore = connectPgSimple(session);
const sessionStore = new PgSessionStore({
  pool,
  tableName: 'user_sessions',
  createTableIfMissing: true
});

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }));
app.use(express.json({ limit: '40mb' }));
app.use((request, response, next) => {
  const origin = request.get('origin');
  if (origin) {
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      response.status(403).json({ error: 'Asal permintaan tidak diizinkan.' });
      return;
    }
    if (originHost !== request.get('host')) {
      response.status(403).json({ error: 'Asal permintaan tidak diizinkan.' });
      return;
    }
  }
  next();
});
app.use(session({
  name: 'rapimakalah.sid',
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi beberapa saat.' }
});

function requireAuthentication(request, response, next) {
  if (!request.session.user) {
    response.status(401).json({ error: 'Silakan masuk untuk melanjutkan.' });
    return;
  }
  next();
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(request) {
  return new Promise((resolve, reject) => {
    request.session.save((error) => error ? reject(error) : resolve());
  });
}

app.get('/api/health', (request, response) => response.json({ status: 'ok' }));

app.get('/api/auth/me', (request, response) => {
  response.json({ user: request.session.user || null });
});

app.post('/api/auth/register', authenticationLimiter, async (request, response, next) => {
  const validation = validateRegistration(request.body || {});
  if (!validation.valid) {
    response.status(400).json({ error: validation.message });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(request.body.password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [validation.name, validation.email, passwordHash]
    );
    const user = publicUser(result.rows[0]);
    await regenerateSession(request);
    request.session.user = user;
    await saveSession(request);
    response.status(201).json({ user });
  } catch (error) {
    if (error.code === '23505') {
      response.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
      return;
    }
    next(error);
  }
});

app.post('/api/auth/login', authenticationLimiter, async (request, response, next) => {
  const email = normalizeEmail(request.body && request.body.email);
  const password = request.body && request.body.password;
  if (!email || email.length > 254 || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) {
    response.status(400).json({ error: 'Email dan password wajib diisi.' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    const account = result.rows[0];
    if (!account || !(await bcrypt.compare(password, account.password_hash))) {
      response.status(401).json({ error: 'Email atau password tidak sesuai.' });
      return;
    }
    const user = publicUser(account);
    await regenerateSession(request);
    request.session.user = user;
    await saveSession(request);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

app.put('/api/auth/password', requireAuthentication, authenticationLimiter, async (request, response, next) => {
  const { currentPassword, newPassword, passwordConfirmation } = request.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
      newPassword.length < 10 || Buffer.byteLength(newPassword, 'utf8') > 72 || newPassword !== passwordConfirmation) {
    response.status(400).json({ error: 'Password baru harus 10–72 karakter dan konfirmasinya harus cocok.' });
    return;
  }
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [request.session.user.id]);
    if (!result.rows[0] || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      response.status(400).json({ error: 'Password saat ini tidak sesuai.' });
      return;
    }
    const user = request.session.user;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, request.session.user.id]);
    await regenerateSession(request);
    request.session.user = user;
    await saveSession(request);
    response.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (request, response, next) => {
  request.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }
    response.clearCookie('rapimakalah.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    response.status(204).end();
  });
});

app.get('/api/documents', requireAuthentication, async (request, response, next) => {
  try {
    const result = await pool.query(
      'SELECT document_data, created_at, updated_at FROM documents WHERE user_id = $1 ORDER BY updated_at DESC',
      [request.session.user.id]
    );
    response.json(result.rows.map((row) => ({
      ...row.document_data,
      createdAt: row.document_data.createdAt || row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    })));
  } catch (error) {
    next(error);
  }
});

app.put('/api/documents', requireAuthentication, async (request, response, next) => {
  const document = request.body;
  const validation = validateDocument(document);
  if (!validation.valid) {
    response.status(400).json({ error: validation.message });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ownerId = request.session.user.id;
    const previous = await client.query(
      'SELECT document_data FROM documents WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [document.id, ownerId]
    );
    if (previous.rowCount === 0) {
      const conflictingId = await client.query('SELECT 1 FROM documents WHERE id = $1', [document.id]);
      if (conflictingId.rowCount) {
        await client.query('ROLLBACK');
        response.status(404).json({ error: 'Dokumen tidak ditemukan.' });
        return;
      }
    }

    const result = await client.query(
      `INSERT INTO documents (id, user_id, title, document_data)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE
       SET title = EXCLUDED.title, document_data = EXCLUDED.document_data, updated_at = NOW()
       WHERE documents.user_id = EXCLUDED.user_id
       RETURNING created_at, updated_at`,
      [document.id, ownerId, document.title.trim() || 'Dokumen tanpa judul', JSON.stringify(document)]
    );
    if (result.rowCount !== 1) {
      await client.query('ROLLBACK');
      response.status(404).json({ error: 'Dokumen tidak ditemukan.' });
      return;
    }

    const previousData = previous.rows[0] && previous.rows[0].document_data;
    let versionType = !previousData ? 'created' : null;
    if (previousData && previousData.sourceHtml !== document.sourceHtml) versionType = 'source';
    else if (previousData && previousData.formattedAt !== document.formattedAt && document.formattedAt) versionType = 'formatted';
    if (versionType) {
      await client.query(
        'INSERT INTO document_versions (document_id, user_id, version_type, snapshot) VALUES ($1, $2, $3, $4::jsonb)',
        [document.id, ownerId, versionType, JSON.stringify(document)]
      );
    }

    await client.query('COMMIT');
    response.json({
      ...document,
      title: document.title.trim() || 'Dokumen tanpa judul',
      createdAt: document.createdAt || result.rows[0].created_at.toISOString(),
      updatedAt: result.rows[0].updated_at.toISOString()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

app.get('/api/documents/:id/versions', requireAuthentication, async (request, response, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)) {
    response.status(400).json({ error: 'ID dokumen tidak valid.' });
    return;
  }
  try {
    const result = await pool.query(
      `SELECT id, version_type AS "versionType", snapshot, created_at AS "createdAt"
       FROM document_versions WHERE document_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [request.params.id, request.session.user.id]
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/documents/:id', requireAuthentication, async (request, response, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)) {
    response.status(400).json({ error: 'ID dokumen tidak valid.' });
    return;
  }
  try {
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2',
      [request.params.id, request.session.user.id]
    );
    if (!result.rowCount) {
      response.status(404).json({ error: 'Dokumen tidak ditemukan.' });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(projectDirectory, 'dist')));
  app.get(/.*/, (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      response.status(404).json({ error: 'Endpoint tidak ditemukan.' });
      return;
    }
    response.sendFile(path.join(projectDirectory, 'dist', 'index.html'), (error) => error && next(error));
  });
}

app.use((error, request, response, next) => {
  console.error('Request gagal:', error);
  if (response.headersSent) {
    next(error);
    return;
  }
  response.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const schema = await readFile(path.join(directory, 'schema.sql'), 'utf8');
await pool.query(schema);
const server = createServer(app);
server.listen(port, () => console.log('RapiMakalah API berjalan pada port ' + port));

async function shutdown() {
  server.close(async () => {
    await sessionStore.close();
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
