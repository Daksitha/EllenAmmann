document.addEventListener('DOMContentLoaded', () => {
    // === Session Management ===
    let currentSession = localStorage.getItem('knowledge_architect_session') || 'default';
    const sessionSelect = document.getElementById('session-select');
    const newSessionBtn = document.getElementById('new-session-btn');
    const uploadSessionBtn = document.getElementById('upload-session-btn');
    const importInput = document.getElementById('import-session-input');

    async function loadSessions() {
        try {
            sessionSelect.disabled = true;
            const res = await fetch('/api/sessions');
            const sessions = await res.json();

            sessionSelect.innerHTML = sessions.map(s =>
                `<option value="${s}" ${s === currentSession ? 'selected' : ''}>${s}</option>`
            ).join('');

            if (!sessions.includes(currentSession)) {
                currentSession = sessions[0] || 'default';
                localStorage.setItem('knowledge_architect_session', currentSession);
            }
            sessionSelect.disabled = false;
        } catch (err) {
            console.error('Failed to load sessions', err);
            sessionSelect.disabled = false;
        }
    }

    sessionSelect.addEventListener('change', (e) => {
        currentSession = e.target.value;
        localStorage.setItem('knowledge_architect_session', currentSession);

        // Prevent data leakage: Clear any active form editing states
        if (typeof resetForm === 'function') {
            const kbFormEl = document.getElementById('kb-form');
            const kbDelBtn = document.getElementById('kb-delete-btn');
            const qaFormEl = document.getElementById('qa-form');
            const qaDelBtn = document.getElementById('qa-delete-btn');
            if (kbFormEl) resetForm(kbFormEl, kbDelBtn);
            if (qaFormEl) resetForm(qaFormEl, qaDelBtn);

            const kbMsg = document.getElementById('kb-form-msg');
            const qaMsg = document.getElementById('qa-form-msg');
            if (kbMsg) kbMsg.style.display = 'none';
            if (qaMsg) qaMsg.style.display = 'none';
        }

        refreshCurrentView();
    });

    const newSessionModal = document.getElementById('new-session-modal');
    const newSessionForm = document.getElementById('new-session-form');
    const newSessionNameInput = document.getElementById('new-session-name');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const createSessionBtn = document.getElementById('create-session-btn');
    const modalMsg = document.getElementById('modal-msg');

    function closeNewSessionModal() {
        newSessionModal.style.display = 'none';
        newSessionForm.reset();
        modalMsg.style.display = 'none';
        createSessionBtn.disabled = false;
        createSessionBtn.textContent = 'Create Session';
    }

    newSessionBtn.addEventListener('click', () => {
        newSessionModal.style.display = 'flex';
        newSessionNameInput.focus();
    });

    closeModalBtn.addEventListener('click', closeNewSessionModal);
    cancelModalBtn.addEventListener('click', closeNewSessionModal);

    newSessionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newSessionNameInput.value.trim();
        if (!name) return;

        createSessionBtn.disabled = true;
        createSessionBtn.textContent = 'Creating...';
        modalMsg.className = 'form-msg';
        modalMsg.textContent = 'Creating session...';
        modalMsg.style.display = 'block';

        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: name })
            });
            const result = await res.json();
            if (res.ok) {
                currentSession = result.sessionId;
                localStorage.setItem('knowledge_architect_session', currentSession);
                await loadSessions();
                refreshCurrentView();

                modalMsg.className = 'form-msg success';
                modalMsg.textContent = 'Session created successfully!';
                setTimeout(closeNewSessionModal, 1000);
            } else {
                modalMsg.className = 'form-msg error';
                modalMsg.textContent = result.error || 'Failed to create session';
                createSessionBtn.disabled = false;
                createSessionBtn.textContent = 'Create Session';
            }
        } catch (err) {
            modalMsg.className = 'form-msg error';
            modalMsg.textContent = 'Server error. Failed to create session.';
            createSessionBtn.disabled = false;
            createSessionBtn.textContent = 'Create Session';
        }
    });

    uploadSessionBtn.addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const sessionName = prompt('Enter a name for the imported session:', file.name.replace('.jsonl', ''));
        if (!sessionName) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            // We assume the file is a KB or QA file based on user choice or we can ask.
            // For simplicity, let's just upload it as KB and ask user if it's QA.
            const isQa = confirm('Is this a Questionnaire (QA) file? Click Cancel for Knowledge Base (KB).');

            try {
                const res = await fetch('/api/sessions/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: sessionName,
                        kbData: isQa ? null : content,
                        qaData: isQa ? content : null
                    })
                });
                if (res.ok) {
                    currentSession = sessionName;
                    localStorage.setItem('knowledge_architect_session', currentSession);
                    await loadSessions();
                    refreshCurrentView();
                }
            } catch (err) {
                alert('Upload failed');
            }
        };
        reader.readAsText(file);
    });

    function refreshCurrentView() {
        if (kbView.classList.contains('active')) loadKbRecords();
        else loadQaRecords();
    }

    // Header Helper
    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-session-id': currentSession
        };
    }

    // === Navigation Logic ===
    const navKbBtn = document.getElementById('nav-kb-btn');
    const navQaBtn = document.getElementById('nav-qa-btn');
    const kbView = document.getElementById('kb-view');
    const qaView = document.getElementById('qa-view');

    navKbBtn.addEventListener('click', () => switchView('kb'));
    navQaBtn.addEventListener('click', () => switchView('qa'));

    function switchView(view) {
        if (view === 'kb') {
            navKbBtn.classList.add('active');
            navQaBtn.classList.remove('active');
            kbView.classList.add('active');
            qaView.classList.remove('active');
            loadKbRecords();
        } else {
            navQaBtn.classList.add('active');
            navKbBtn.classList.remove('active');
            qaView.classList.add('active');
            kbView.classList.remove('active');
            loadQaRecords();
        }
    }

    // === Quick Guide Logic ===
    const guideBtn = document.getElementById('guide-dropdown-btn');
    const guidePanel = document.getElementById('quick-guide-panel');

    if (guideBtn && guidePanel) {
        guideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            guidePanel.style.display = guidePanel.style.display === 'none' ? 'block' : 'none';
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!guidePanel.contains(e.target) && e.target !== guideBtn) {
                guidePanel.style.display = 'none';
            }
        });
    }

    // === Global State ===
    let kbRecords = [];
    let qaRecords = [];

    // === KB Logic ===
    const kbListMenu = document.getElementById('kb-record-list');
    const kbSearch = document.getElementById('kb-search-input');
    const kbFilter = document.getElementById('kb-filter-select');
    const kbRefreshBtn = document.getElementById('kb-refresh-btn');
    const kbForm = document.getElementById('kb-form');
    const kbStatus = document.getElementById('kb-status');
    const kbConflictSetGroup = document.getElementById('conflict-set-group');
    const kbNewBtn = document.getElementById('kb-new-btn');
    const kbDeleteBtn = document.getElementById('kb-delete-btn');

    // Dynamic lists
    const typeOptionsList = document.getElementById('type-options');
    const catOptionsList = document.getElementById('cat-options');

    // Show conflict set ID input if status is disputed
    kbStatus.addEventListener('change', (e) => {
        if (e.target.value === 'disputed') {
            kbConflictSetGroup.style.display = 'flex';
        } else {
            kbConflictSetGroup.style.display = 'none';
        }
    });

    kbRefreshBtn.addEventListener('click', loadKbRecords);
    kbSearch.addEventListener('input', renderKbRecords);
    kbFilter.addEventListener('change', renderKbRecords);
    kbNewBtn.addEventListener('click', () => resetForm(kbForm));

    const kbDownloadBtn = document.getElementById('kb-download-btn');
    if (kbDownloadBtn) {
        kbDownloadBtn.addEventListener('click', () => { window.location.href = '/api/kb/download'; });
    }

    async function loadKbRecords() {
        kbListMenu.innerHTML = '<div class="loading-spinner">Loading records...</div>';
        try {
            const res = await fetch('/api/kb', { headers: getHeaders() });
            kbRecords = await res.json();
            updateKbDatalists();
            renderKbRecords();
        } catch (err) {
            console.error('Failed to load KB records', err);
            kbListMenu.innerHTML = `<div class="form-msg error" style="display:block">Failed to load records. Is the server running?</div>`;
        }
    }

    function updateKbDatalists() {
        const types = new Set(['fact', 'event', 'person_profile', 'quote', 'summary']);
        const cats = new Set(['personal_life', 'work_life', 'political_life', 'achievements', 'memory_event', 'legacy']);

        kbRecords.forEach(r => {
            if (r.record_type) types.add(r.record_type);
            if (r.category) cats.add(r.category);
        });

        typeOptionsList.innerHTML = Array.from(types).map(t => `<option value="${t}">`).join('');
        catOptionsList.innerHTML = Array.from(cats).map(c => `<option value="${c}">`).join('');
    }

    function renderKbRecords() {
        const query = kbSearch.value.toLowerCase();
        const category = kbFilter.value;

        const filtered = kbRecords.filter(r => {
            const matchesSearch = r.record_id?.toLowerCase().includes(query) ||
                r.text?.toLowerCase().includes(query);
            const matchesCat = category === 'all' || r.category === category;
            return matchesSearch && matchesCat;
        });

        kbListMenu.innerHTML = '';
        if (filtered.length === 0) {
            kbListMenu.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem;">No records found.</p>';
            return;
        }

        // Render from newest to oldest visually
        [...filtered].reverse().forEach(record => {
            const el = document.createElement('div');
            el.className = 'record-item';
            el.innerHTML = `
                <div class="record-meta">
                    <span class="record-id">${record.record_id}</span>
                    <span class="record-badge">${record.record_type}</span>
                </div>
                <div class="record-text">${record.text || '<em>No text</em>'}</div>
                <div class="record-meta" style="margin-top:auto">
                    <span>Sources: ${record.source_ids ? record.source_ids.length : 0}</span>
                    <span>${record.status || 'asserted'}</span>
                </div>
            `;
            el.addEventListener('click', () => populateKbForm(record));
            kbListMenu.appendChild(el);
        });
    }

    function populateKbForm(record) {
        document.getElementById('kb-record-id').value = record.record_id || '';
        document.getElementById('kb-record-type').value = record.record_type || 'fact';
        document.getElementById('kb-category').value = record.category || 'personal_life';
        document.getElementById('kb-subject').value = record.subject || 'Ellen Ammann';
        document.getElementById('kb-text').value = record.text || '';
        document.getElementById('kb-predicate').value = record.predicate || '';
        document.getElementById('kb-object').value = record.object || '';

        document.getElementById('kb-time-date').value = record.time?.date || '';
        document.getElementById('kb-time-precision').value = record.time?.precision || '';

        document.getElementById('kb-loc-name').value = record.location?.name || '';
        document.getElementById('kb-loc-country').value = record.location?.country || '';

        document.getElementById('kb-source-ids').value = (record.source_ids || []).join(', ');
        document.getElementById('kb-confidence').value = record.confidence || 'high';

        kbStatus.value = record.status || 'asserted';
        kbStatus.dispatchEvent(new Event('change')); // Trigger visibility update

        document.getElementById('kb-conflict-set').value = record.conflict_set_id || '';

        // Show delete button
        kbDeleteBtn.style.display = 'block';
    }

    kbForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('kb-form-msg');
        msgEl.className = 'form-msg';
        msgEl.textContent = 'Saving...';
        msgEl.style.display = 'block';

        const sourceIdsInput = document.getElementById('kb-source-ids').value;
        const source_ids = sourceIdsInput.split(',').map(s => s.trim()).filter(Boolean);

        const record = {
            record_id: document.getElementById('kb-record-id').value,
            record_type: document.getElementById('kb-record-type').value,
            category: document.getElementById('kb-category').value,
            subject: document.getElementById('kb-subject').value,
            text: document.getElementById('kb-text').value,
            confidence: document.getElementById('kb-confidence').value,
            status: document.getElementById('kb-status').value,
            source_ids: source_ids
        };

        const predicate = document.getElementById('kb-predicate').value;
        const objectVal = document.getElementById('kb-object').value;
        if (predicate) record.predicate = predicate;
        if (objectVal) record.object = objectVal;

        const timeDate = document.getElementById('kb-time-date').value;
        const timePrec = document.getElementById('kb-time-precision').value;
        if (timeDate || timePrec) {
            record.time = {};
            if (timeDate) record.time.date = timeDate;
            if (timePrec) record.time.precision = timePrec;
        }

        const locName = document.getElementById('kb-loc-name').value;
        const locCountry = document.getElementById('kb-loc-country').value;
        if (locName || locCountry) {
            record.location = {};
            if (locName) record.location.name = locName;
            if (locCountry) record.location.country = locCountry;
        }

        const conflictSet = document.getElementById('kb-conflict-set').value;
        if (record.status === 'disputed' && conflictSet) {
            record.conflict_set_id = conflictSet;
        }

        try {
            const res = await fetch('/api/kb', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(record)
            });

            if (!res.ok) throw new Error(await res.text());

            msgEl.className = 'form-msg success';
            msgEl.textContent = 'Record appended successfully!';
            resetForm(kbForm);
            loadKbRecords();
            setTimeout(() => { msgEl.style.display = 'none'; }, 3000);

        } catch (err) {
            console.error('KB Save Error:', err);
            msgEl.className = 'form-msg error';
            msgEl.textContent = 'Error saving record: ' + err.message;
        }
    });

    kbDeleteBtn.addEventListener('click', async () => {
        const id = document.getElementById('kb-record-id').value;
        if (!id || !confirm(`Are you sure you want to delete record ${id}?`)) return;

        const msgEl = document.getElementById('kb-form-msg');
        msgEl.className = 'form-msg';
        msgEl.textContent = 'Deleting...';
        msgEl.style.display = 'block';

        try {
            const res = await fetch(`/api/kb/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error(await res.text());

            msgEl.className = 'form-msg success';
            msgEl.textContent = 'Record deleted successfully!';
            resetForm(kbForm, kbDeleteBtn);
            loadKbRecords();
            setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
        } catch (err) {
            console.error('KB Delete Error:', err);
            msgEl.className = 'form-msg error';
            msgEl.textContent = 'Error deleting record: ' + err.message;
        }
    });


    // === QA Logic ===
    const qaListMenu = document.getElementById('qa-record-list');
    const qaSearch = document.getElementById('qa-search-input');
    const qaRefreshBtn = document.getElementById('qa-refresh-btn');
    const qaForm = document.getElementById('qa-form');
    const qaNewBtn = document.getElementById('qa-new-btn');
    const qaDeleteBtn = document.getElementById('qa-delete-btn');

    qaRefreshBtn.addEventListener('click', loadQaRecords);
    qaSearch.addEventListener('input', renderQaRecords);
    qaNewBtn.addEventListener('click', () => resetForm(qaForm));

    const qaDownloadBtn = document.getElementById('qa-download-btn');
    if (qaDownloadBtn) {
        qaDownloadBtn.addEventListener('click', () => { window.location.href = '/api/qa/download'; });
    }

    async function loadQaRecords() {
        qaListMenu.innerHTML = '<div class="loading-spinner">Loading questions...</div>';
        try {
            const res = await fetch('/api/qa', { headers: getHeaders() });
            qaRecords = await res.json();
            renderQaRecords();
        } catch (err) {
            console.error('Failed to load QA records', err);
            qaListMenu.innerHTML = `<div class="form-msg error" style="display:block">Failed to load records. Is the server running?</div>`;
        }
    }

    function renderQaRecords() {
        const query = qaSearch.value.toLowerCase();

        const filtered = qaRecords.filter(r => {
            return (r.qid?.toLowerCase().includes(query) ||
                r.question?.toLowerCase().includes(query) ||
                r.ground_truth_answer?.toLowerCase().includes(query));
        });

        qaListMenu.innerHTML = '';
        if (filtered.length === 0) {
            qaListMenu.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem;">No questions found.</p>';
            return;
        }

        [...filtered].reverse().forEach(record => {
            const el = document.createElement('div');
            el.className = 'record-item';
            el.innerHTML = `
                <div class="record-meta">
                    <span class="record-id">${record.qid}</span>
                    <span class="record-badge">${record.answer_type || 'text'}</span>
                </div>
                <div class="record-text" style="font-weight: 500; font-size:1rem;color:var(--text-main); margin-bottom: 0.25rem;">
                    Q: ${record.question}
                </div>
                <div class="record-text" style="color:var(--primary-color);">
                    A: ${record.ground_truth_answer}
                </div>
            `;
            el.addEventListener('click', () => populateQaForm(record));
            qaListMenu.appendChild(el);
        });
    }

    function populateQaForm(record) {
        document.getElementById('qa-qid').value = record.qid || '';
        document.getElementById('qa-question').value = record.question || '';
        document.getElementById('qa-gt-answer').value = record.ground_truth_answer || '';
        document.getElementById('qa-answer-type').value = record.answer_type || 'short_text';

        document.getElementById('qa-supporting-records').value = (record.supporting_record_ids || []).join(', ');
        document.getElementById('qa-supporting-sources').value = (record.supporting_source_ids || []).join(', ');

        // Show delete button
        qaDeleteBtn.style.display = 'block';
    }

    qaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('qa-form-msg');
        msgEl.className = 'form-msg';
        msgEl.textContent = 'Saving...';
        msgEl.style.display = 'block';

        const recIdsInput = document.getElementById('qa-supporting-records').value;
        const srcIdsInput = document.getElementById('qa-supporting-sources').value;

        const record = {
            qid: document.getElementById('qa-qid').value,
            question: document.getElementById('qa-question').value,
            ground_truth_answer: document.getElementById('qa-gt-answer').value,
            answer_type: document.getElementById('qa-answer-type').value,
            supporting_record_ids: recIdsInput.split(',').map(s => s.trim()).filter(Boolean),
            supporting_source_ids: srcIdsInput.split(',').map(s => s.trim()).filter(Boolean)
        };

        try {
            const res = await fetch('/api/qa', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(record)
            });

            if (!res.ok) throw new Error(await res.text());

            msgEl.className = 'form-msg success';
            msgEl.textContent = 'Question appended successfully!';
            resetForm(qaForm);
            loadQaRecords();
            setTimeout(() => { msgEl.style.display = 'none'; }, 3000);

        } catch (err) {
            console.error('QA Save Error:', err);
            msgEl.className = 'form-msg error';
            msgEl.textContent = 'Error saving question: ' + err.message;
        }
    });

    qaDeleteBtn.addEventListener('click', async () => {
        const id = document.getElementById('qa-qid').value;
        if (!id || !confirm(`Are you sure you want to delete question ${id}?`)) return;

        const msgEl = document.getElementById('qa-form-msg');
        msgEl.className = 'form-msg';
        msgEl.textContent = 'Deleting...';
        msgEl.style.display = 'block';

        try {
            const res = await fetch(`/api/qa/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error(await res.text());

            msgEl.className = 'form-msg success';
            msgEl.textContent = 'Question deleted successfully!';
            resetForm(qaForm, qaDeleteBtn);
            loadQaRecords();
            setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
        } catch (err) {
            console.error('QA Delete Error:', err);
            msgEl.className = 'form-msg error';
            msgEl.textContent = 'Error deleting question: ' + err.message;
        }
    });

    // === Helpers ===
    function resetForm(form, deleteBtn = null) {
        form.reset();
        if (form.id === 'kb-form') {
            kbStatus.dispatchEvent(new Event('change')); // hide conflict set on reset
        }
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        // Remove selection highlights from list
        document.querySelectorAll('.record-item').forEach(el => el.classList.remove('selected'));
    }

    // Initial Load
    loadSessions().then(() => {
        loadKbRecords();
    });
});
