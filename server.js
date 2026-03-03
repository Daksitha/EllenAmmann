const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const KB_PATH = path.join(__dirname, 'ellen_ammann_kb.jsonl');
const QA_PATH = path.join(__dirname, 'ellen_ammann_eval_qa.jsonl');
const BACKUP_DIR_KB = path.join(__dirname, 'data', 'kb');
const BACKUP_DIR_QA = path.join(__dirname, 'data', 'qa');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
async function ensureFileExists(filePath) {
    try {
        await fs.access(filePath);
    } catch {
        await fs.writeFile(filePath, '', 'utf8');
    }
}

async function ensureDirExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// Ensure startup directories and files
ensureFileExists(KB_PATH);
ensureFileExists(QA_PATH);
ensureDirExists(BACKUP_DIR_KB);
ensureDirExists(BACKUP_DIR_QA);

// Helper to safely read a JSONL file
async function readJsonlFile(filePath) {
    try {
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

// Backup logic (Ring Buffer style - max 10 files)
async function createBackup(type) {
    const isKb = type === 'kb';
    const sourceFilePath = isKb ? KB_PATH : QA_PATH;
    const backupDir = isKb ? BACKUP_DIR_KB : BACKUP_DIR_QA;
    const maxBackups = 10;

    try {
        // Read current file content
        const data = await fs.readFile(sourceFilePath, 'utf8');
        if (!data.trim()) return; // Don't backup empty files

        // Generate timestamp
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');

        const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}_${ms}`;
        const backupFileName = `${type}_backup_${timestamp}.jsonl`;
        const backupFilePath = path.join(backupDir, backupFileName);

        // Save backup
        await fs.writeFile(backupFilePath, data, 'utf8');

        // Check if we need to prune old backups
        const files = await fs.readdir(backupDir);
        if (files.length > maxBackups) {
            // Sort files by modification time (oldest first)
            const fileStats = await Promise.all(
                files.map(async file => {
                    const filePath = path.join(backupDir, file);
                    const stats = await fs.stat(filePath);
                    return { file, filePath, mtime: stats.mtimeMs };
                })
            );

            fileStats.sort((a, b) => a.mtime - b.mtime);

            // Delete oldest files until we have exactly maxBackups
            const filesToDelete = fileStats.slice(0, fileStats.length - maxBackups);
            for (const f of filesToDelete) {
                await fs.unlink(f.filePath);
            }
        }
    } catch (err) {
        console.error('Error creating backup:', err);
        // We log but don't throw to prevent blocking the main save operation
    }
}

// Helper to overwrite the entire JSONL file with an array of objects
async function writeJsonlFile(filePath, records) {
    const jsonString = records.map(record => JSON.stringify(record)).join('\n') + '\n';
    await fs.writeFile(filePath, jsonString, 'utf8');
}


// --- API ENDPOINTS ---

// 1. Knowledge Base (KB)
app.get('/api/kb', async (req, res) => {
    try {
        const records = await readJsonlFile(KB_PATH);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read KB file', details: err.message });
    }
});

// Create or Update KB Record
app.post('/api/kb', async (req, res) => {
    try {
        const record = req.body;
        if (!record || !record.record_id) {
            return res.status(400).json({ error: 'Invalid record format. Must provide record_id.' });
        }

        const records = await readJsonlFile(KB_PATH);
        const index = records.findIndex(r => r.record_id === record.record_id);

        if (index !== -1) {
            records[index] = record; // Overwrite
        } else {
            records.push(record); // Append
        }

        await createBackup('kb');
        await writeJsonlFile(KB_PATH, records);

        res.status(200).json({ message: 'Record saved successfully', record });
    } catch (err) {
        res.status(500).json({ error: 'Failed to write to KB file', details: err.message });
    }
});

// Delete KB Record
app.delete('/api/kb/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const records = await readJsonlFile(KB_PATH);
        const filteredRecords = records.filter(r => r.record_id !== id);

        if (records.length === filteredRecords.length) {
            return res.status(404).json({ error: 'Record not found' });
        }

        await createBackup('kb');
        await writeJsonlFile(KB_PATH, filteredRecords);

        res.status(200).json({ message: 'Record deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete from KB file', details: err.message });
    }
});

// 2. Questionnaire (QA)
app.get('/api/qa', async (req, res) => {
    try {
        const records = await readJsonlFile(QA_PATH);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read QA file', details: err.message });
    }
});

// Create or Update QA Record
app.post('/api/qa', async (req, res) => {
    try {
        const record = req.body;
        if (!record || !record.qid) {
            return res.status(400).json({ error: 'Invalid record format. Must provide qid.' });
        }

        const records = await readJsonlFile(QA_PATH);
        const index = records.findIndex(r => r.qid === record.qid);

        if (index !== -1) {
            records[index] = record; // Overwrite
        } else {
            records.push(record); // Append
        }

        await createBackup('qa');
        await writeJsonlFile(QA_PATH, records);

        res.status(200).json({ message: 'Question saved successfully', record });
    } catch (err) {
        res.status(500).json({ error: 'Failed to write to QA file', details: err.message });
    }
});

// Delete QA Record
app.delete('/api/qa/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const records = await readJsonlFile(QA_PATH);
        const filteredRecords = records.filter(r => r.qid !== id);

        if (records.length === filteredRecords.length) {
            return res.status(404).json({ error: 'Question not found' });
        }

        await createBackup('qa');
        await writeJsonlFile(QA_PATH, filteredRecords);

        res.status(200).json({ message: 'Question deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete from QA file', details: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
