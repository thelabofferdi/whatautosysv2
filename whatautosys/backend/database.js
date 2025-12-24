const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

function initDatabase() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'whatautosys.db');
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Contacts table
    CREATE TABLE IF NOT EXISTS contacts (
      jid TEXT PRIMARY KEY,
      name TEXT,
      push_name TEXT,
      phone TEXT,
      profile_pic TEXT,
      is_group INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      last_message_at TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      lead_score INTEGER DEFAULT 0,
      custom_data TEXT DEFAULT '{}'
    );
    
    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      contact_jid TEXT NOT NULL,
      content TEXT,
      media_path TEXT,
      media_type TEXT,
      from_me INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      status TEXT DEFAULT 'sent',
      ai_generated INTEGER DEFAULT 0,
      FOREIGN KEY (contact_jid) REFERENCES contacts(jid)
    );
    
    -- Catalog products table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      features TEXT DEFAULT '[]',
      images TEXT DEFAULT '[]',
      base_price REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      price_unit TEXT DEFAULT 'mois',
      min_negotiable REAL,
      max_discount_percent REAL DEFAULT 0,
      negotiation_conditions TEXT,
      target_audience TEXT,
      objections_responses TEXT DEFAULT '{}',
      sales_arguments TEXT DEFAULT '[]',
      cta_primary TEXT,
      cta_secondary TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Conversation goals table
    CREATE TABLE IF NOT EXISTS conversation_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      tactics TEXT DEFAULT '[]',
      success_indicators TEXT DEFAULT '[]',
      abort_conditions TEXT DEFAULT '[]',
      escalation_rules TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Campaigns table
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      template TEXT,
      ai_prompt TEXT,
      contacts_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      settings TEXT DEFAULT '{}'
    );
    
    -- Campaign messages table
    CREATE TABLE IF NOT EXISTS campaign_messages (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      contact_jid TEXT NOT NULL,
      phone TEXT,
      name TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      error TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (contact_jid) REFERENCES contacts(jid)
    );
    
    -- Hot leads table
    CREATE TABLE IF NOT EXISTS hot_leads (
      id TEXT PRIMARY KEY,
      contact_jid TEXT NOT NULL,
      score INTEGER NOT NULL,
      signals TEXT DEFAULT '[]',
      detected_at TEXT DEFAULT (datetime('now')),
      notified INTEGER DEFAULT 0,
      handled INTEGER DEFAULT 0,
      handled_by TEXT,
      handled_at TEXT,
      notes TEXT,
      FOREIGN KEY (contact_jid) REFERENCES contacts(jid)
    );

    -- Licenses Management Table (Admin)
    CREATE TABLE IF NOT EXISTS generated_licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mistral_api_key TEXT NOT NULL,
      license_key TEXT NOT NULL UNIQUE,
      client_name TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Brain documents table (RAG)
    CREATE TABLE IF NOT EXISTS brain_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Negotiation logs table
    CREATE TABLE IF NOT EXISTS negotiation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_jid TEXT NOT NULL,
      product_id TEXT,
      requested_price REAL,
      final_price REAL,
      accepted INTEGER,
      conditions_applied TEXT,
      conversation_excerpt TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_jid) REFERENCES contacts(jid),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    -- Analytics events table
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      event_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_jid);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_hot_leads_score ON hot_leads(score);
    CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score);
  `);

  // Insert default settings if not exist
  const defaultSettings = [
    ['whatsapp_auto_connect', 'false'],
    ['anti_ban_min_delay', '15000'],
    ['anti_ban_max_delay', '45000'],
    ['anti_ban_typing_enabled', 'true'],
    ['hot_lead_threshold', '70'],
    ['telegram_bot_token', ''],
    ['telegram_chat_id', ''],
    ['co_pilot_enabled', 'true'],
    ['auto_reply_enabled', 'false'],
    ['theme', 'dark']
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  console.log('✅ Database initialized');
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDatabase, getDb, closeDatabase };
