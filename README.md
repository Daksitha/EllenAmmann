# Ellen Ammann Dataset Manager

This project is a lightweight, local web application designed to help non-technical users build a structured **Knowledge Base (KB)** and an **Evaluation Questionnaire (QA)** for Ellen Ammann. The resulting datasets are intended to be used for a Retrieval-Augmented Generation (RAG) system.

## Getting Started

**If you are looking to learn how to use this tool to build your dataset, please read the [User Manual](User_Manual.md) first!** The manual covers starting the application, making edits, deleting entries, and safely backing up your progress.

## Codebase Overview

The codebase is a simple, no-build-required, full-stack application. It prioritizes ease of use and aesthetics without overly complex dependencies.

### Tech Stack

* **Backend:** Node.js with Express.js (`server.js`)
* **Frontend:** Vanilla HTML (`public/index.html`), CSS (`public/style.css`), and JavaScript (`public/app.js`)
* **Data Storage:** Local `.jsonl` files (JSON Lines format)

### Directory Structure

* [`server.js`](server.js): The main backend server file. It exposes REST API endpoints (`GET`, `POST`, `DELETE`) to interact with the JSONL files.
* [`public/`](public): Contains the frontend assets.
  * [`index.html`](public/index.html): The semantic structure of the editor.
  * [`style.css`](public/style.css): A premium, dark-mode, glassmorphism design system.
  * [`app.js`](public/app.js): The client-side logic that handles fetching data, rendering lists, populating forms, and submitting changes via the `fetch` API.
* `data/`: A generated folder that holds ring-buffer backups of the datasets.
* `.bat` scripts: Helper scripts for Windows users to easily build, start, stop, and reset the application.

## How it uses JSONL Data

The core of this application is its interaction with JSON Lines (`.jsonl`) files. A `.jsonl` file operates differently than a standard `.json` file: instead of being one massive JSON array, **each individual line is a fully valid, standalone JSON object.**

This is ideal for large datasets (like training LLMs or building KBs) because a program can read or append one line at a time without having to parse the entire file into memory stringify it all at once.

### Backend Data Handling

1. **Reading**: When the frontend requests data (e.g., `GET /api/kb`), the backend Node.js server reads `ellen_ammann_kb.jsonl`. It splits the text file by line breaks (`\n`), parses each line using `JSON.parse()`, and sends the resulting array of objects to the frontend.
2. **Writing/Editing**: When a user saves a record, they send a JSON object to the backend (`POST /api/kb`). The backend reads the existing `.jsonl` file, checks if the `record_id` already exists, and either *replaces* that specific object in the array (if editing) or *pushes* a new object (if appending). It then converts the entire array back into a `\n` delineated string and overwrites the file.
3. **Deleting**: Similar to writing, the backend filters out the deleted ID and rewrites the remaining records to the file.

*Before any modification, the [`server.js`](server.js) script automatically generates a timestamped backup in the `data/` folder.*

## JSONL Data Structures

The system manages two distinct types of data:

### 1. Knowledge Base ([`ellen_ammann_kb.jsonl`](ellen_ammann_kb.jsonl))

This file stores factual claims, biographical events, quotes, and summaries about Ellen Ammann.

**JSON Architecture:**

```json
{
  "record_id": "ea_fact_0105",
  "record_type": "fact",  // e.g., fact, event, person_profile, quote
  "category": "personal_life", // e.g., personal_life, political_life
  "subject": "Ellen Ammann",
  "text": "Born in Stockholm (1870), she moved to Munich after marrying...",
  "predicate": "born", // Optional
  "object": "1870-07-01 in Stockholm", // Optional
  "time": "1870-07-01", // Optional
  "location": "Stockholm, Sweden", // Optional
  "source_ids": ["src_ndb_1953"], // Array of evidence sources
  "confidence": "High",
  "status": "Asserted", // Or "Disputed"
  "conflict_set_id": "" // Populated if status is "Disputed"
}
```

### 2. Evaluation Questionnaire ([`ellen_ammann_eval_qa.jsonl`](ellen_ammann_eval_qa.jsonl))

This file stores ground-truth questions and answers used to evaluate how well the RAG model retrieves the aforementioned KB facts.

**JSON Architecture:**

```json
{
  "qid": "Q01",
  "question": "In what year was Ellen Ammann born?",
  "ground_truth_answer": "Ellen Ammann was born in 1870.",
  "supporting_record_ids": ["ea_fact_0105"], // Points back to the KB record_id
  "supporting_source_ids": ["src_ndb_1953"]
}
```
