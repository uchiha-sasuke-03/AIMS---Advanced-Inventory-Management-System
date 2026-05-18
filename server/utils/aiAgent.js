const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/db');

const SCHEMA_CONTEXT = `
You are a MySQL SQL query generator for an Employee Inventory Management System.
The database has the following schema:

TABLE: users
- id INT PRIMARY KEY AUTO_INCREMENT
- emp_id VARCHAR(20) UNIQUE (format: EMP001, EMP002...)
- name VARCHAR(100)
- age INT
- salary DECIMAL(12,2) (in Indian Rupees)
- email VARCHAR(150) UNIQUE
- department VARCHAR(100) (Engineering, HR, Finance, Marketing, Operations)
- role ENUM('admin', 'employee')
- created_at TIMESTAMP
- updated_at TIMESTAMP

TABLE: asset_categories
- id INT PRIMARY KEY AUTO_INCREMENT
- name VARCHAR(100) UNIQUE (Laptops, Monitors, Phones, Accessories)
- description TEXT

TABLE: assets
- id INT PRIMARY KEY AUTO_INCREMENT
- category_id INT (FK -> asset_categories.id)
- name VARCHAR(150)
- model VARCHAR(150)
- serial_number VARCHAR(100) UNIQUE
- purchase_date DATE
- price DECIMAL(12,2) (in Indian Rupees)
- status ENUM('in_stock', 'allocated', 'damaged', 'retired')
- location VARCHAR(100) (IT Department, Server Room, Storage Room, Main Office, Sales Room, Reception)
- created_at TIMESTAMP

TABLE: allocations
- id INT PRIMARY KEY AUTO_INCREMENT
- asset_id INT (FK -> assets.id)
- user_id INT (FK -> users.id)
- allocated_at TIMESTAMP
- allocated_by INT (FK -> users.id)
- expected_return_date DATE
- returned_at TIMESTAMP NULL (NULL means currently allocated)
- condition_on_return VARCHAR(50)
- notes TEXT

TABLE: damage_reports
- id INT PRIMARY KEY AUTO_INCREMENT
- asset_id INT (FK -> assets.id)
- reported_by INT (FK -> users.id)
- reported_at TIMESTAMP
- description TEXT
- photo_path VARCHAR(500)
- severity ENUM('low', 'medium', 'high', 'critical')
- resolved BOOLEAN
- resolution_note TEXT

IMPORTANT RULES:
1. For financial values, amounts are stored in Indian Rupees (INR).
2. An active allocation is one where returned_at IS NULL.
3. Asset status should be derived from events when possible.
4. Always use proper JOINs when querying related data.
5. For INSERT queries, generate valid INSERT statements.
6. For UPDATE queries, always include a WHERE clause.
7. NEVER generate DROP, TRUNCATE, or ALTER TABLE statements.
8. NEVER modify the password_hash column.
9. Return ONLY the raw SQL query, nothing else. No markdown, no explanations.
10. The 'users' table does NOT have a 'location' column. To query the location of a user/employee, JOIN 'users' with 'allocations' and 'assets', filtering for active allocations (returned_at IS NULL) and matching the asset's location.

FEW-SHOT EXAMPLES:
* User request: "how many employees in Reception?"
Query: SELECT COUNT(DISTINCT u.id) FROM users u JOIN allocations al ON u.id = al.user_id JOIN assets a ON al.asset_id = a.id WHERE a.location = 'Reception' AND al.returned_at IS NULL;

* User request: "show all laptops in stock in Server Room"
Query: SELECT a.* FROM assets a JOIN asset_categories c ON a.category_id = c.id WHERE c.name = 'Laptops' AND a.status = 'in_stock' AND a.location = 'Server Room';

* User request: "How many assets are allocated?"
Query: SELECT COUNT(*) FROM assets WHERE status = 'allocated';
`;

async function generateSQL(prompt) {
  if (process.env.NVIDIA_API_KEY) {
    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-flash",
          messages: [
            { role: "system", content: SCHEMA_CONTEXT },
            { role: "user", content: `User request: ${prompt}\n\nGenerate ONLY the raw MySQL query. No markdown formatting, no code blocks, no explanations.` }
          ],
          temperature: 0.1,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`NVIDIA API Error: ${errData.message || response.statusText}`);
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response from NVIDIA API");
      }

      let sql = data.choices[0].message.content.trim();
      // Clean up any markdown code blocks
      sql = sql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
      return sql;
    } catch (err) {
      console.error("NVIDIA query failed, trying Gemini fallback...", err.message);
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Neither NVIDIA_API_KEY nor GEMINI_API_KEY is configured');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    { text: SCHEMA_CONTEXT },
    { text: `User request: ${prompt}\n\nGenerate ONLY the raw MySQL query. No markdown formatting, no code blocks, no explanations.` }
  ]);

  let sql = result.response.text().trim();

  // Clean up any markdown code blocks
  sql = sql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();

  return sql;
}

async function executeQuery(sql) {
  // Safety checks
  const upperSQL = sql.toUpperCase().trim();

  const forbidden = ['DROP ', 'TRUNCATE ', 'ALTER TABLE', 'CREATE TABLE', 'CREATE DATABASE', 'DROP DATABASE', 'GRANT ', 'REVOKE '];
  for (const keyword of forbidden) {
    if (upperSQL.includes(keyword)) {
      throw new Error(`Forbidden SQL operation detected: ${keyword.trim()}`);
    }
  }

  // Don't allow modifications to password_hash
  if (upperSQL.includes('PASSWORD_HASH')) {
    throw new Error('Cannot modify password fields via AI agent');
  }

  const isSelect = upperSQL.startsWith('SELECT');
  const connection = await pool.getConnection();

  try {
    if (!isSelect) {
      await connection.beginTransaction();
    }

    const [results] = await connection.query(sql);

    if (!isSelect) {
      await connection.commit();
    }

    connection.release();

    if (isSelect) {
      return { type: 'select', data: results, rowCount: results.length };
    } else {
      return {
        type: 'mutation',
        affectedRows: results.affectedRows,
        insertId: results.insertId || null,
        message: `Query executed successfully. ${results.affectedRows} row(s) affected.`
      };
    }
  } catch (error) {
    if (!isSelect) {
      await connection.rollback();
    }
    connection.release();
    throw error;
  }
}

async function askLlama(prompt, systemPrompt = "You are a helpful IT operations and financial assistant.") {
  if (process.env.NVIDIA_API_KEY) {
    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
          return data.choices[0].message.content.trim();
        }
      }
    } catch (err) {
      console.error("NVIDIA askLlama failed, fallback to Gemini:", err.message);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: prompt }
      ]);
      return result.response.text().trim();
    } catch (err) {
      console.error("Gemini fallback failed inside askLlama:", err.message);
    }
  }

  return "AI justification could not be generated due to missing credentials. Please review the budget details in the adjacent table.";
}

module.exports = { generateSQL, executeQuery, askLlama };
