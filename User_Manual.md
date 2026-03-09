# Ellen Ammann Dataset Manager - User Manual

Welcome to the Ellen Ammann Dataset Manager. This application provides a simple, beautiful interface to help you build and manage the Knowledge Base and Evaluation Questionnaire for your upcoming RAG (Retrieval-Augmented Generation) system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Session Management](#session-management)
3. [Managing the Knowledge Base (KB)](#managing-the-knowledge-base-kb)
4. [Managing the Questionnaire (QA)](#managing-the-questionnaire-qa)
5. [Editing and Deleting](#editing-and-deleting)
6. [Data Safety & Backups](#data-safety--backups-important)
7. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## 1. Getting Started

1. **Open the Application**:
   - On Windows, double-click the `start.bat` file in your main folder. This will automatically open a command prompt window (which runs the background server) and open your default web browser to the editor interface (`http://localhost:3000`).
   - On Linux/VM, use `start.sh` or run the Docker container as described in the README.
2. **Switch Views**: Use the toggle buttons at the top right to switch between the **Knowledge Base** (factual records) and the **Questionnaire** (evaluation Q&A).

---

## 2. Session Management

The system supports multiple **sessions**, allowing you to manage different, independent datasets (e.g., your real dataset vs. a testing dataset) without them mixing up.

- **Switching Sessions**: Use the dropdown menu in the top right corner to jump between your active projects.
- **Creating a New Session**: Click the **➕ (New Session)** button next to the dropdown. A secure dialog will ask for a name (use letters, numbers, hyphens, or underscores). This creates an isolated workspace for your data.
- **Importing a Session**: Click the **📂 (Import Session)** button to upload an existing `.jsonl` file from your device into a new session workspace.

---

## 3. Managing the Knowledge Base (KB)

The Knowledge Base is where you enter the factual data about Ellen Ammann. This data is saved in `sessions/<your-session-folder>/kb.jsonl`.

1. Click **+ New Record** to clear the form.
2. Fill out the **Required Fields**:
   - **Record ID**: A unique identifier for this fact (e.g., `ea_fact_0105`).
   - **Record Type & Category**: Select an existing option or type your own custom category. The system learns and auto-suggests new categories!
   - **Subject**: Usually "Ellen Ammann".
   - **Text**: The factual sentence you want the AI to retrieve.
   - **Source IDs**: Where did this fact come from? (e.g., `src_ndb_1953`). Use commas if there are multiple.
3. Click **Save to KB File**.

---

## 4. Managing the Questionnaire (QA)

The Questionnaire tests how accurately your RAG system can answer questions based *only* on the Knowledge Base. This data is saved in `sessions/<your-session-folder>/qa.jsonl`.

1. Click **+ New Question**.
2. Provide a unique **Question ID** (`Q01`), the **Question** string, and the **Ground Truth Answer**.
3. **Link to Evidence**: In the "Supporting Record IDs", type the ID of the KB record that proves this answer is correct (e.g., `ea_fact_0002`). This is critical for evaluating whether the AI found the right evidence.
4. Click **Save to QA File**.

---

## 5. Editing and Deleting

**To Edit:**

1. Click on any record in the list on the left side of the screen.
2. The form will automatically populate with that record's details.
3. Make your changes and click **Save**. Because the system recognizes the Record ID, it will **overwrite** the existing entry.

**To Delete:**

1. Click on an existing record to load it.
2. A red **Delete** button will appear next to the Save button.
3. Click Delete. A confirmation box prevents accidental deletions.

---

## 6. Data Safety & Backups (Important!)

The Dataset Manager has a built-in "Ring-Buffer" safety mechanism to protect against accidental edits.

- Every time you click Save or Delete, the system takes a snapshot of your database and saves it in the `sessions/<session-name>/backups/` folders.
- These folders keep your **10 most recent actions**. This acts as an immediate "undo"—if you accidentally mess up a record, simply open the backups folder, find the snapshot from 5 minutes ago, and copy its contents back into the main `.jsonl` file.

> [!WARNING]
> **Manual Long-Term Backups**
>
> Because the system only saves the last 10 actions, a heavy session of editing will quickly overwrite your morning's work.
> At the end of every day, click the **Download (↓)** button in the UI or manually copy your files to a separate "Permanent Backups" folder on your computer!

---

## 7. Troubleshooting & FAQ

**Q: The page isn't loading or says "Site cannot be reached".**

- Make sure the server script (`start.bat` or `start.sh`) is currently running in your terminal/command prompt. Do not close that black window while working.

**Q: I created a session, but my old data is gone!**

- Your data isn't gone; you are just looking at a fresh workspace. Use the session dropdown menu in the top right to switch back to your original session.

**Q: How do I completely start over?**

- To reset a session entirely, you can either create a new session via the ➕ button, or close the server and run `reset_database.bat` in your file explorer to wipe the original demo databases.
