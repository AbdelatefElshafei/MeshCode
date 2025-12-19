require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const net = require('net');
const { encryptAES } = require('../shared/cryptoUtil');

const app = express();
app.use(cors());
app.use(express.json());

// Database: PostgreSQL
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'disable'
        ? false
        : (process.env.DATABASE_SSL || process.env.PGSSLMODE ? { rejectUnauthorized: false } : false)
});

async function ensureUsersTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`);
    } finally {
        client.release();
    }
}

ensureUsersTable().catch(err => {
    console.error('Failed to ensure users table', { error: err.message });
});

async function ensureProblemTables() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS problems (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                gradient TEXT,
                starter_code TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_cases (
                id SERIAL PRIMARY KEY,
                problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
                input JSONB NOT NULL,
                expected JSONB NOT NULL
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
                code TEXT NOT NULL,
                encryption_type TEXT NOT NULL,
                status TEXT,
                total_tests INTEGER,
                passed_tests INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS submission_results (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
                input JSONB,
                expected JSONB,
                actual JSONB,
                passed BOOLEAN,
                error TEXT
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                level TEXT,
                message TEXT,
                meta JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } finally {
        client.release();
    }
}

async function seedProblemsIfEmpty() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM problems');
        if ((rows[0]?.c ?? 0) === 0) {
            const p1 = await client.query(
                'INSERT INTO problems(title, description, gradient, starter_code) VALUES($1,$2,$3,$4) RETURNING id',
                [
                    'Summation',
                    'Calculate the sum of the input array elements.',
                    'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                    "// Problem 1: Sum\n// input is an array e.g. [1, 2]\n\nresult = input[0] + input[1];"
                ]
            );
            const p2 = await client.query(
                'INSERT INTO problems(title, description, gradient, starter_code) VALUES($1,$2,$3,$4) RETURNING id',
                [
                    'Multiplication',
                    'Multiply the first element by 2.',
                    'linear-gradient(135deg, #93C5FD 0%, #E0F2FE 100%)',
                    "// Problem 2: Multiply\n// input is an array e.g. [5, 2]\n\nresult = input[0] * 2;"
                ]
            );
            const p1id = p1.rows[0].id;
            const p2id = p2.rows[0].id;
            const tc1 = [];
            for (let i = 0; i < 50; i++) {
                tc1.push(client.query(
                    'INSERT INTO test_cases(problem_id, input, expected) VALUES($1, $2::jsonb, $3::jsonb)',
                    [p1id, JSON.stringify([i, i + 1]), JSON.stringify(i + (i + 1))]
                ));
            }
            const tc2 = [];
            for (let i = 0; i < 50; i++) {
                tc2.push(client.query(
                    'INSERT INTO test_cases(problem_id, input, expected) VALUES($1, $2::jsonb, $3::jsonb)',
                    [p2id, JSON.stringify([i, 2]), JSON.stringify(i * 2)]
                ));
            }
            await Promise.all([...tc1, ...tc2]);
        }
    } finally {
        client.release();
    }
}

async function seedAdditionalProblemsIfNeeded() {
    const client = await pool.connect();
    try {
        const defs = [
            {
                title: 'Difference',
                description: 'Return the difference of two numbers: a - b.',
                gradient: 'linear-gradient(135deg, #F59E0B 0%, #FDE68A 100%)',
                starter_code: "// Difference\n// input: [a, b]\nresult = input[0] - input[1];",
                gen: () => Array.from({ length: 50 }, (_, i) => ({ input: [i + 1, i], expected: (i + 1) - i }))
            },
            {
                title: 'Max Of Two',
                description: 'Return the maximum of two numbers.',
                gradient: 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)',
                starter_code: "// Max Of Two\n// input: [a, b]\nresult = input[0] > input[1] ? input[0] : input[1];",
                gen: () => Array.from({ length: 50 }, (_, i) => ({ input: [i, 50 - i], expected: Math.max(i, 50 - i) }))
            },
            {
                title: 'Power',
                description: 'Compute a^b for small integers.',
                gradient: 'linear-gradient(135deg, #EF4444 0%, #FCA5A5 100%)',
                starter_code: "// Power\n// input: [a, b]\nresult = input[0] ** input[1];",
                gen: () => [
                    { input: [2, 0], expected: 1 },
                    { input: [2, 1], expected: 2 },
                    { input: [2, 5], expected: 32 },
                    { input: [3, 3], expected: 27 },
                    { input: [5, 2], expected: 25 },
                    ...Array.from({ length: 45 }, (_, i) => ({ input: [i % 5, (i % 3)], expected: (i % 5) ** (i % 3) }))
                ]
            },
            {
                title: 'Average Of Three',
                description: 'Return the average of three numbers.',
                gradient: 'linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%)',
                starter_code: "// Average Of Three\n// input: [a, b, c]\nresult = (input[0] + input[1] + input[2]) / 3;",
                gen: () => Array.from({ length: 50 }, (_, i) => ({ input: [i, i + 1, i + 2], expected: (i + i + 1 + i + 2) / 3 }))
            },
            {
                title: 'Is Even',
                description: 'Return true if n is even, else false.',
                gradient: 'linear-gradient(135deg, #6B7280 0%, #D1D5DB 100%)',
                starter_code: "// Is Even\n// input: [n]\nresult = input[0] % 2 === 0;",
                gen: () => Array.from({ length: 50 }, (_, i) => ({ input: [i], expected: i % 2 === 0 }))
            }
        ];
        for (const d of defs) {
            const exists = await client.query('SELECT id FROM problems WHERE title = $1 LIMIT 1', [d.title]);
            if (exists.rows.length > 0) continue;
            const ins = await client.query('INSERT INTO problems(title, description, gradient, starter_code) VALUES($1,$2,$3,$4) RETURNING id', [d.title, d.description, d.gradient, d.starter_code]);
            const pid = ins.rows[0].id;
            const cases = d.gen();
            const ops = cases.map(c => client.query('INSERT INTO test_cases(problem_id, input, expected) VALUES($1,$2::jsonb,$3::jsonb)', [pid, JSON.stringify(c.input), JSON.stringify(c.expected)]));
            await Promise.all(ops);
        }
    } finally {
        client.release();
    }
}

ensureProblemTables()
    .then(seedProblemsIfEmpty)
    .then(seedAdditionalProblemsIfNeeded)
    .catch(err => {
        console.error('Failed to ensure problem tables', { error: err.message });
    });

function getAuthUser(req) {
    try {
        const hdr = req.headers['authorization'] || '';
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
        if (!token) return null;
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded && decoded.uid ? decoded.uid : null;
    } catch {
        return null;
    }
}

function isAdmin(req) {
    try {
        const hdr = req.headers['authorization'] || '';
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
        if (!token) return false;
        const decoded = jwt.verify(token, JWT_SECRET);
        const email = decoded && decoded.email ? String(decoded.email).toLowerCase() : null;
        if (!email) return false;
        if (ADMIN_EMAILS.length === 0) return false;
        return ADMIN_EMAILS.includes(email);
    } catch {
        return false;
    }
}

const WORKER_BASES = [
    'http://localhost:4001',
    'http://localhost:4002',
    'http://localhost:4003',
    'http://localhost:4004',
    'http://localhost:4005',
];

const PROCESS_PATH = '/process-chunk';

function parseHostPort(base) {
    const url = new URL(base);
    return { host: url.hostname || 'localhost', port: Number(url.port) || 80 };
}

function sendTCP(host, port, payloadObj, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let buffer = '';
        let done = false;
        const finish = (err, data) => {
            if (done) return;
            done = true;
            try { socket.destroy(); } catch {}
            if (err) reject(err); else resolve({ data });
        };
        socket.setEncoding('utf8');
        socket.setTimeout(timeout, () => finish(new Error('TCP timeout')));
        socket.on('error', (e) => finish(e));
        socket.on('data', (chunk) => {
            buffer += chunk;
            const idx = buffer.indexOf('\n');
            if (idx !== -1) {
                const line = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                try {
                    const parsed = JSON.parse(line);
                    finish(null, parsed);
                } catch (e) {
                    finish(e);
                }
            }
        });
        try {
            socket.connect(port, host, () => {
                const msg = JSON.stringify(payloadObj) + '\n';
                socket.write(msg);
            });
        } catch (e) {
            finish(e);
        }
    });
}

const probePort = (host, port, timeout = 1000) => new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    const done = (ok) => { if (!resolved) { resolved = true; try { socket.destroy(); } catch {} resolve(ok); } };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    try {
        socket.connect(port, host);
    } catch {
        done(false);
    }
});

const getActiveWorkers = async () => {
    const checks = WORKER_BASES.map(async (base) => {
        // Try HTTP health endpoint first
        try {
            const res = await axios.get(`${base}/health`, { timeout: 1500 });
            if (res.status === 200 && res.data && res.data.ok) return base;
        } catch {}
        // Fallback: TCP port probe for cases where /health is not available yet
        try {
            const url = new URL(base);
            const host = url.hostname || 'localhost';
            const port = Number(url.port) || 80;
            const ok = await probePort(host, port, 1000);
            if (ok) return base;
        } catch {}
        return null;
    });
    const results = await Promise.all(checks);
    return results.filter(Boolean);
};

app.get('/workers/count', async (req, res) => {
    try {
        const active = await getActiveWorkers();
        res.json({ count: active.length });
    } catch (e) {
        res.json({ count: 0 });
    }
});

app.post('/users/me/photo', async (req, res) => {
    const uid = getAuthUser(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { dataUrl } = req.body || {};
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image data' });
        }
        if (dataUrl.length > 10 * 1024 * 1024) {
            return res.status(413).json({ error: 'Image too large' });
        }
        const r = await pool.query('UPDATE users SET photo_url = $2 WHERE id = $1 RETURNING photo_url', [uid, dataUrl]);
        if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ photo_url: r.rows[0].photo_url });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update photo' });
    }
});

app.get('/users/me', async (req, res) => {
    const uid = getAuthUser(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { rows } = await pool.query('SELECT id, email, photo_url FROM users WHERE id = $1', [uid]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load user' });
    }
});

app.post('/submit', async (req, res) => {
    const { questionId, userCode } = req.body;
    const uid = getAuthUser(req);
    try {
        const client = await pool.connect();
        try {
            const encryptionType = 'AES';
            const p = await client.query('SELECT id FROM problems WHERE id = $1', [questionId]);
            if (p.rows.length === 0) {
                return res.status(404).send('Problem not found');
            }
            const tcs = await client.query('SELECT input, expected FROM test_cases WHERE problem_id = $1 ORDER BY id', [questionId]);
            const testCases = tcs.rows.map(r => ({ input: r.input, expected: r.expected }));
            const activeWorkers = await getActiveWorkers();
            const workerCount = activeWorkers.length;
            if (workerCount === 0) {
                return res.status(503).json({ error: 'No active workers available' });
            }
            const submissionIns = await client.query(
                'INSERT INTO submissions(user_id, problem_id, code, encryption_type, status) VALUES($1,$2,$3,$4,$5) RETURNING id',
                [uid, questionId, String(userCode || ''), encryptionType, 'Running']
            );
            const submissionId = submissionIns.rows[0].id;
            const totalCases = testCases.length;
            const chunkSize = Math.ceil(totalCases / workerCount);
            const chunks = [];
            for (let i = 0; i < totalCases; i += chunkSize) {
                chunks.push(testCases.slice(i, i + chunkSize));
            }
            const dispatchChunk = async (chunk, index) => {
                const encryptionType = 'AES';
                const payloadPlain = JSON.stringify({ userCode, testCases: chunk });
                const encryptedPayload = encryptAES(payloadPlain);
                for (let attempt = 0; attempt < activeWorkers.length; attempt++) {
                    const base = activeWorkers[(index + attempt) % activeWorkers.length];
                    const { host, port } = parseHostPort(base);
                    try {
                        const resp = await sendTCP(host, port, { encryptedPayload, encryptionType }, 7000);
                        await client.query('INSERT INTO logs(submission_id, level, message, meta) VALUES($1,$2,$3,$4::jsonb)', [
                            submissionId,
                            'info',
                            'chunk_processed',
                            JSON.stringify({ index, size: chunk.length, host, port })
                        ]);
                        return resp;
                    } catch (err) {}
                }
                throw new Error('All workers failed for this chunk');
            };
            const settled = await Promise.allSettled(chunks.map((c, i) => dispatchChunk(c, i)));
            const successes = settled.filter(s => s.status === 'fulfilled').map(s => s.value);
            if (successes.length === 0) {
                await client.query('UPDATE submissions SET status = $2, total_tests = $3, passed_tests = $4 WHERE id = $1', [submissionId, 'Failed', totalCases, 0]);
                return res.status(503).json({ error: 'No workers could process any chunk' });
            }
            let aggregatedResults = [];
            successes.forEach(r => { aggregatedResults = aggregatedResults.concat(r.data.results.map(it => ({ ...it, workerId: r.data.workerId }))); });
            const totalPassed = aggregatedResults.filter(r => r.passed).length;
            for (const r of aggregatedResults) {
                await client.query(
                    'INSERT INTO submission_results(submission_id, input, expected, actual, passed, error) VALUES($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6)',
                    [
                        submissionId,
                        JSON.stringify(r.input ?? null),
                        JSON.stringify(r.expected ?? null),
                        JSON.stringify(r.actual ?? null),
                        !!r.passed,
                        r.error ? String(r.error) : null
                    ]
                );
            }
            await client.query('UPDATE submissions SET status = $2, total_tests = $3, passed_tests = $4 WHERE id = $1', [submissionId, totalPassed === totalCases ? 'Accepted' : 'Wrong Answer', totalCases, totalPassed]);
            res.json({ status: totalPassed === totalCases ? 'Accepted' : 'Wrong Answer', totalTests: totalCases, passedTests: totalPassed, workerCount, details: aggregatedResults, submissionId });
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'Submit failed' });
    }
});

// Authentication routes
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const hash = await bcrypt.hash(String(password), 10);
        const result = await pool.query(
            'INSERT INTO users(email, password_hash) VALUES($1, $2) ON CONFLICT(email) DO NOTHING RETURNING id',
            [String(email).toLowerCase(), hash]
        );
        if (result.rowCount === 0) return res.status(409).json({ error: 'Email already registered' });
        res.json({ ok: true });
    } catch (err) {
        console.error('Register error', { error: err.message });
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [String(email).toLowerCase()]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = rows[0];
        const ok = await bcrypt.compare(String(password), user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error('Login error', { error: err.message });
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/problems', async (req, res) => {
    try {
        try { await seedAdditionalProblemsIfNeeded(); } catch {}
        const { rows } = await pool.query('SELECT id, title, description, gradient, starter_code FROM problems ORDER BY id');
        res.json({ problems: rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list problems' });
    }
});

app.post('/problems', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { title, description, gradient, starter_code } = req.body || {};
        if (!title) return res.status(400).json({ error: 'title required' });
        const ins = await pool.query('INSERT INTO problems(title, description, gradient, starter_code) VALUES($1,$2,$3,$4) RETURNING id', [title, description || null, gradient || null, starter_code || null]);
        res.json({ id: ins.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create problem' });
    }
});

app.post('/problems/:id/testcases', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const id = Number(req.params.id);
        const { cases } = req.body || {};
        if (!Array.isArray(cases) || cases.length === 0) return res.status(400).json({ error: 'cases array required' });
        const client = await pool.connect();
        try {
            const exists = await client.query('SELECT id FROM problems WHERE id = $1', [id]);
            if (exists.rows.length === 0) return res.status(404).json({ error: 'problem not found' });
            const ops = cases.map(c => client.query('INSERT INTO test_cases(problem_id, input, expected) VALUES($1,$2::jsonb,$3::jsonb)', [id, JSON.stringify(c.input), JSON.stringify(c.expected)]));
            await Promise.all(ops);
            res.json({ ok: true, added: cases.length });
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to add testcases' });
    }
});

app.put('/problems/:id', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const id = Number(req.params.id);
        const { title, description, gradient, starter_code } = req.body || {};
        const fields = [];
        const values = [];
        let idx = 1;
        if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
        if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
        if (gradient !== undefined) { fields.push(`gradient = $${idx++}`); values.push(gradient); }
        if (starter_code !== undefined) { fields.push(`starter_code = $${idx++}`); values.push(starter_code); }
        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(id);
        const q = `UPDATE problems SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id`;
        const r = await pool.query(q, values);
        if (r.rowCount === 0) return res.status(404).json({ error: 'Problem not found' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update problem' });
    }
});

app.delete('/problems/:id', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const id = Number(req.params.id);
        const r = await pool.query('DELETE FROM problems WHERE id = $1', [id]);
        if (r.rowCount === 0) return res.status(404).json({ error: 'Problem not found' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete problem' });
    }
});

app.delete('/problems/:id/testcases', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const id = Number(req.params.id);
        const r = await pool.query('DELETE FROM test_cases WHERE problem_id = $1', [id]);
        res.json({ ok: true, deleted: r.rowCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete testcases' });
    }
});

app.get('/admin/stats', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const client = await pool.connect();
        try {
            const pc = await client.query('SELECT COUNT(*)::int AS c FROM problems');
            const sc = await client.query('SELECT COUNT(*)::int AS c FROM submissions');
            const active = await getActiveWorkers();
            res.json({ problems: pc.rows[0].c, submissions: sc.rows[0].c, workers: active.length });
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/auth/google', async (req, res) => {
    try {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
            return res.status(500).send('Google OAuth not configured: set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI');
        }
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent'
        });
        res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (err) {
        res.status(500).json({ error: 'Google auth init failed' });
    }
});

app.get('/auth/google/callback', async (req, res) => {
    try {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
            return res.status(500).send('Google OAuth not configured: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
        }
        const code = req.query.code;
        if (!code) return res.status(400).json({ error: 'Missing code' });

        const tokenParams = new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
        });
        const tokenResp = await axios.post('https://oauth2.googleapis.com/token', tokenParams.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenResp.data && tokenResp.data.access_token;
        if (!accessToken) return res.status(401).json({ error: 'Token exchange failed' });

        const userResp = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
        const email = userResp.data && userResp.data.email ? String(userResp.data.email).toLowerCase() : null;
        const picture = userResp.data && userResp.data.picture ? String(userResp.data.picture) : null;
        if (!email) return res.status(400).json({ error: 'Email not available' });

        const found = await pool.query('SELECT id, email, photo_url FROM users WHERE email = $1', [email]);
        let userId;
        if (found.rows.length === 0) {
            const ph = await bcrypt.hash(`oauth-google:${email}:${Date.now()}`, 10);
            const ins = await pool.query('INSERT INTO users(email, password_hash, photo_url) VALUES($1, $2, $3) RETURNING id', [email, ph, picture]);
            userId = ins.rows[0].id;
        } else {
            userId = found.rows[0].id;
            if (picture && picture !== (found.rows[0].photo_url || null)) {
                await pool.query('UPDATE users SET photo_url = $2 WHERE id = $1', [userId, picture]);
            }
        }

        const token = jwt.sign({ uid: userId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.redirect(`${CLIENT_URL}/login?token=${encodeURIComponent(token)}`);
    } catch (err) {
        res.status(500).json({ error: 'Google auth callback failed' });
    }
});

app.listen(3001, () => console.log('Orchestrator running on 3001'));
app.get('/dashboard', async (req, res) => {
    const uid = getAuthUser(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const client = await pool.connect();
        try {
            const u = await client.query('SELECT id, email, photo_url FROM users WHERE id = $1', [uid]);
            if (u.rows.length === 0) return res.status(404).json({ error: 'User not found' });
            const problems = await client.query(`
                SELECT p.id, p.title, p.description, p.gradient,
                       s.status AS latest_status
                FROM problems p
                LEFT JOIN LATERAL (
                    SELECT status
                    FROM submissions s
                    WHERE s.problem_id = p.id AND s.user_id = $1
                    ORDER BY s.created_at DESC, s.id DESC
                    LIMIT 1
                ) s ON true
                ORDER BY p.id DESC
                LIMIT 10
            `, [uid]);
            res.json({ user: u.rows[0], problems: problems.rows });
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});
