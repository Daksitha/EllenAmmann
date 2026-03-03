# Ellen Ammann Dataset Manager - User Manual

Welcome to the Ellen Ammann Dataset Manager. This application provides a simple, beautiful interface to help you build and manage the Knowledge Base and Evaluation Questionnaire for your upcoming RAG (Retrieval-Augmented Generation) system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing the Knowledge Base (KB)](#managing-the-knowledge-base-kb)
3. [Managing the Questionnaire (QA)](#managing-the-questionnaire-qa)
4. [Editing and Deleting](#editing-and-deleting)
5. [Data Safety & Backups (Important!)](#data-safety--backups-important)
6. [Starting from Scratch (Database Reset)](#starting-from-scratch-database-reset)

---

## 1. Getting Started

1. **Open the Application**: Double-click the `start.bat` file in your main folder. This will automatically open a command prompt window (which runs the background server) and open your default web browser to the editor interface (`http://localhost:3000`).
2. **Switch Views**: Use the toggle buttons at the top right to switch between the **Knowledge Base** (factual records) and the **Questionnaire** (evaluation Q&A).

---

## 2. Managing the Knowledge Base (KB)

The Knowledge Base is where you enter the factual data about Ellen Ammann. This data is saved in `ellen_ammann_kb.jsonl`.

1. Click **+ New Record** to clear the form.
2. Fill out the **Required Fields**:
   * **Record ID**: A unique identifier for this fact (e.g., `ea_fact_0105`).
   * **Record Type & Category**: You can either select an existing option from the dropdown menu OR type your own custom category. If you type a new one, the system will remember it and auto-suggest it next time!
   * **Subject**: Usually "Ellen Ammann".
   * **Text**: The actual factual sentence you want the AI to retrieve.
   * **Source IDs**: Where did this fact come from? (e.g., `src_ndb_1953`). Use commas if there are multiple.
3. Click **Save to KB File**.

---

## 3. Managing the Questionnaire (QA)

The Questionnaire tests how accurately your RAG system can answer questions based *only* on the Knowledge Base. This data is saved in `ellen_ammann_eval_qa.jsonl`.

1. Click **+ New Question**.
2. Provide a unique **Question ID** (`Q01`), the **Question** string, and the ultimate **Ground Truth Answer**.
3. **Link to Evidence**: In the "Supporting Record IDs", type the ID of the KB record that proves this answer is correct (e.g., `ea_fact_0002`). This is critical for evaluating whether the AI found the right evidence.
4. Click **Save to QA File**.

---

## 4. Editing and Deleting

**To Edit:**

1. Click on any record in the list on the left side of the screen.
2. The form will automatically populate with that record's details.
3. Make your changes and click **Save**. Because the system recognizes the Record ID, it will **overwrite** the existing entry rather than creating a duplicate.

**To Delete:**

1. Click on an existing record in the list to load it into the form.
2. A red **Delete** button will appear next to the Save button.
3. Click Delete. A confirmation box will appear to make sure you didn't click it by accident.

---

## 5. Data Safety & Backups (Important!)

The Dataset Manager has a built-in "Ring-Buffer" safety mechanism to protect against accidental edits.

* Every single time you click Save or Delete, the system takes a snapshot of your database and saves it in the `data/kb/` or `data/qa/` folders.
* These folders keep your **10 most recent actions**. This is great for an immediate "undo"—if you accidentally mess up a record, simply open the `data/kb/` folder, find the snapshot from 5 minutes ago, and copy its contents back into `ellen_ammann_kb.jsonl`.

### ⚠️ Manual Long-Term Backups

Because the system only saves the last 10 actions (to prevent your hard drive from filling up), a heavy session of editing will quickly overwrite your morning's work.
**Best Practice**: At the end of every day, manually copy `ellen_ammann_kb.jsonl` and `ellen_ammann_eval_qa.jsonl` to a separate "Permanent Backups" folder on your computer to ensure you have a hard copy that will not be automatically deleted by the ring buffer!

---

## 6. Starting from Scratch (Database Reset)

If you are just playing around with dummy data today and want to clean the system entirely before the real work begins, you can run the reset script.

1. Close the application browser window.
2. In your folder, double-click **`reset_database.bat`**.
3. **What it does**: This script will move your current working databases (`ellen_ammann_kb.jsonl` and `ellen_ammann_eval_qa.jsonl`) into an archive folder named `data/archive_timestamp/`. It then creates fresh, completely empty database files.
4. **Oops, I didn't mean to reset!**: If you run this by accident, don't panic. Go into the `data/archive...` folder, copy your old `.jsonl` files, and paste them back into the main directory to restore everything.
