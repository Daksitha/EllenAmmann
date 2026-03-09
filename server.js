const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

let config = {
    host: "0.0.0.0",
    port: 3000,
    sessions_dir: "sessions",
    default_session: "default"
};

try {
    const configPath = path.join(__dirname, 'config.json');
    if (fsSync.existsSync(configPath)) {
        const userConfig = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
        config = { ...config, ...userConfig };
    }
} catch (e) {
    console.warn('Could not read config.json, using defaults.', e);
}

const app = express();
const PORT = process.env.PORT || config.port;
const HOST = process.env.HOST || config.host;
const SESSIONS_DIR = path.join(__dirname, config.sessions_dir);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Helpers
async function ensureDirExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        console.log(`Creating directory: ${dirPath}`);
        await fs.mkdir(dirPath, { recursive: true });
    }
}

async function getSessionPaths(sessionId) {
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    await ensureDirExists(sessionPath);
    await ensureDirExists(path.join(sessionPath, 'backups', 'kb'));
    await ensureDirExists(path.join(sessionPath, 'backups', 'qa'));

    return {
        kb: path.join(sessionPath, 'kb.jsonl'),
        qa: path.join(sessionPath, 'qa.jsonl'),
        backupKb: path.join(sessionPath, 'backups', 'kb'),
        backupQa: path.join(sessionPath, 'backups', 'qa')
    };
}

// Middleware to get session paths
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/kb') || req.path.startsWith('/api/qa')) {
        const sessionId = req.headers['x-session-id'] || req.query.session || config.default_session;
        const sanitizedId = sessionId.replace(/[^a-z0-9_-]/gi, '_');

        if (req.sessionId !== sanitizedId) {
            console.log(`Switching to session: ${sanitizedId}`);
        }

        req.sessionId = sanitizedId;
        req.sessionPaths = await getSessionPaths(sanitizedId);

        if (!fsSync.existsSync(req.sessionPaths.kb)) {
            console.log(`Initializing new KB file for session: ${sanitizedId}`);
            fsSync.writeFileSync(req.sessionPaths.kb, '', 'utf8');
        }
        if (!fsSync.existsSync(req.sessionPaths.qa)) {
            console.log(`Initializing new QA file for session: ${sanitizedId}`);
            fsSync.writeFileSync(req.sessionPaths.qa, '', 'utf8');
        }
    }
    next();
});

async function readJsonlFile(filePath) {
    try {
        console.log(`Reading file: ${path.basename(filePath)}`);
        const data = await fs.readFile(filePath, 'utf8');
        const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
        return lines.map(line => {
            try { return JSON.parse(line); }
            catch (e) { return null; }
        }).filter(item => item !== null);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}

async function createBackup(type, paths) {
    const isKb = type === 'kb';
    const sourceFilePath = isKb ? paths.kb : paths.qa;
    const backupDir = isKb ? paths.backupKb : paths.backupQa;
    const maxBackups = 10;

    try {
        const data = await fs.readFile(sourceFilePath, 'utf8');
        if (!data.trim()) return;

        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
        const backupFileName = `${type}_backup_${timestamp}.jsonl`;
        const backupFilePath = path.join(backupDir, backupFileName);

        console.log(`Creating backup: ${backupFileName}`);
        await fs.writeFile(backupFilePath, data, 'utf8');

        const files = await fs.readdir(backupDir);
        if (files.length > maxBackups) {
            const fileStats = await Promise.all(
                files.map(async file => {
                    const filePath = path.join(backupDir, file);
                    const stats = await fs.stat(filePath);
                    return { file, filePath, mtime: stats.mtimeMs };
                })
            );
            fileStats.sort((a, b) => a.mtime - b.mtime);
            const filesToDelete = fileStats.slice(0, fileStats.length - maxBackups);
            for (const f of filesToDelete) {
                console.log(`Pruning old backup: ${f.file}`);
                await fs.unlink(f.filePath);
            }
        }
    } catch (err) {
        console.error('Error creating backup:', err);
    }
}

async function writeJsonlFile(filePath, records) {
    console.log(`Writing ${records.length} records to ${path.basename(filePath)}`);
    const jsonString = records.map(record => JSON.stringify(record)).join('\n') + '\n';
    await fs.writeFile(filePath, jsonString, 'utf8');
}

// --- API ---

app.get('/api/sessions', async (req, res) => {
    try {
        await ensureDirExists(SESSIONS_DIR);
        const dirs = await fs.readdir(SESSIONS_DIR, { withFileTypes: true });
        const ids = dirs.filter(d => d.isDirectory()).map(d => d.name);
        res.json(ids);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/sessions', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'ID required' });
    const id = sessionId.replace(/[^a-z0-9_-]/gi, '_');
    console.log(`Creating new session: ${id}`);
    await getSessionPaths(id);
    res.json({ sessionId: id });
});

app.post('/api/sessions/upload', async (req, res) => {
    const { sessionId, kbData, qaData } = req.body;
    const id = sessionId.replace(/[^a-z0-9_-]/gi, '_');
    console.log(`Uploading data to session: ${id}`);
    const paths = await getSessionPaths(id);
    if (kbData) await fs.writeFile(paths.kb, kbData, 'utf8');
    if (qaData) await fs.writeFile(paths.qa, qaData, 'utf8');
    res.json({ sessionId: id });
});

app.get('/api/kb/download', (req, res) => {
    console.log(`Serving KB download for session: ${req.sessionId}`);
    res.download(req.sessionPaths.kb, `${req.sessionId}_kb.jsonl`);
});

app.get('/api/kb', async (req, res) => {
    const records = await readJsonlFile(req.sessionPaths.kb);
    res.json(records);
});

app.post('/api/kb', async (req, res) => {
    const record = req.body;
    if (!record || !record.record_id) return res.status(400).send('No ID');
    console.log(`Saving KB record ${record.record_id} to session ${req.sessionId}`);
    const records = await readJsonlFile(req.sessionPaths.kb);
    const idx = records.findIndex(r => r.record_id === record.record_id);
    if (idx !== -1) records[idx] = record; else records.push(record);
    await createBackup('kb', req.sessionPaths);
    await writeJsonlFile(req.sessionPaths.kb, records);
    res.json(record);
});

app.delete('/api/kb/:id', async (req, res) => {
    console.log(`Deleting KB record ${req.params.id} from session ${req.sessionId}`);
    const records = await readJsonlFile(req.sessionPaths.kb);
    const filtered = records.filter(r => r.record_id !== req.params.id);
    await createBackup('kb', req.sessionPaths);
    await writeJsonlFile(req.sessionPaths.kb, filtered);
    res.json({ message: 'Deleted' });
});

app.get('/api/qa/download', (req, res) => {
    console.log(`Serving QA download for session: ${req.sessionId}`);
    res.download(req.sessionPaths.qa, `${req.sessionId}_qa.jsonl`);
});

app.get('/api/qa', async (req, res) => {
    const records = await readJsonlFile(req.sessionPaths.qa);
    res.json(records);
});

app.post('/api/qa', async (req, res) => {
    const record = req.body;
    if (!record || !record.qid) return res.status(400).send('No QID');
    console.log(`Saving QA record ${record.qid} to session ${req.sessionId}`);
    const records = await readJsonlFile(req.sessionPaths.qa);
    const idx = records.findIndex(r => r.qid === record.qid);
    if (idx !== -1) records[idx] = record; else records.push(record);
    await createBackup('qa', req.sessionPaths);
    await writeJsonlFile(req.sessionPaths.qa, records);
    res.json(record);
});

app.delete('/api/qa/:id', async (req, res) => {
    console.log(`Deleting QA record ${req.params.id} from session ${req.sessionId}`);
    const records = await readJsonlFile(req.sessionPaths.qa);
    const filtered = records.filter(r => r.qid !== req.params.id);
    await createBackup('qa', req.sessionPaths);
    await writeJsonlFile(req.sessionPaths.qa, filtered);
    res.json({ message: 'Deleted' });
});

// Listen on dynamically assigned PORT (from config/ENV)
app.listen(PORT, HOST, () => console.log(`Knowledge Architect main instance running at http://${HOST}:${PORT}`));

// Also spin up a secondary listener on 5001 if requested
const SECONDARY_PORT = process.env.SECONDARY_PORT || 5001;
if (PORT !== SECONDARY_PORT) {
    app.listen(SECONDARY_PORT, HOST, () => console.log(`Knowledge Architect secondary instance running at http://${HOST}:${SECONDARY_PORT}`));
}
