// Prevents additional console window on Windows in release, do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::types::Value as SqlValue;
use rusqlite::{Connection, ParamsFromIter};
use serde_json::{json, Value as JsonValue};
use tauri::State;

// Estado gerenciado do banco de dados na memória do Tauri
struct DbState(Mutex<Option<Connection>>);

// Obtém o diretório do executável para garantir portabilidade completa
fn get_db_path() -> Result<PathBuf, String> {
  let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
  let dir = exe_path.parent().ok_or("Não foi possível encontrar a pasta de execução.")?;
  Ok(dir.join("acaua.db"))
}

// Converte serde_json::Value para rusqlite::types::Value
fn to_sql_value(val: &JsonValue) -> SqlValue {
  match val {
    JsonValue::Null => SqlValue::Null,
    JsonValue::Bool(b) => SqlValue::Integer(if *b { 1 } else { 0 }),
    JsonValue::Number(n) => {
      if let Some(i) = n.as_i64() {
        SqlValue::Integer(i)
      } else if let Some(f) = n.as_f64() {
        SqlValue::Real(f)
      } else {
        SqlValue::Text(n.to_string())
      }
    }
    JsonValue::String(s) => SqlValue::Text(s.clone()),
    JsonValue::Array(_) | JsonValue::Object(_) => SqlValue::Text(val.to_string()),
  }
}

// Converte rusqlite::types::ValueRef para serde_json::Value
fn to_json_value(val: rusqlite::types::ValueRef) -> JsonValue {
  match val {
    rusqlite::types::ValueRef::Null => JsonValue::Null,
    rusqlite::types::ValueRef::Integer(i) => JsonValue::Number(i.into()),
    rusqlite::types::ValueRef::Real(f) => {
      if let Some(num) = serde_json::Number::from_f64(f) {
        JsonValue::Number(num)
      } else {
        JsonValue::Null
      }
    }
    rusqlite::types::ValueRef::Text(t) => {
      let text_str = String::from_utf8_lossy(t);
      // Tenta fazer o parse de JSON caso seja uma string representando JSON (como anexos ou tools)
      if text_str.starts_with('{') && text_str.endsWith('}') {
        if let Ok(parsed) = serde_json::from_str::<JsonValue>(&text_str) {
          return parsed;
        }
      } else if text_str.starts_with('[') && text_str.endsWith(']') {
        if let Ok(parsed) = serde_json::from_str::<JsonValue>(&text_str) {
          return parsed;
        }
      }
      JsonValue::String(text_str.into_owned())
    }
    rusqlite::types::ValueRef::Blob(b) => {
      // Se for BLOB, convertemos para base64 string
      let encoded = base64::encode(b);
      JsonValue::String(encoded)
    }
  }
}

// Helper base64 encoding (simplificado, já que rusqlite bundled-sqlcipher não importa base64 por padrão)
mod base64 {
  pub fn encode(bytes: &[u8]) -> String {
    let mut result = String::new();
    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut i = 0;
    while i < bytes.len() {
      let b0 = bytes[i] as usize;
      let b1 = if i + 1 < bytes.len() { bytes[i + 1] as usize } else { 0 };
      let b2 = if i + 2 < bytes.len() { bytes[i + 2] as usize } else { 0 };

      let val = (b0 << 16) | (b1 << 8) | b2;
      let c0 = (val >> 18) & 63;
      let c1 = (val >> 12) & 63;
      let c2 = (val >> 6) & 63;
      let c3 = val & 63;

      result.push(alphabet[c0] as char);
      result.push(alphabet[c1] as char);
      if i + 1 < bytes.len() {
        result.push(alphabet[c2] as char);
      } else {
        result.push('=');
      }
      if i + 2 < bytes.len() {
        result.push(alphabet[c3] as char);
      } else {
        result.push('=');
      }
      i += 3;
    }
    result
  }
}

// Auxiliar para adicionar colunas apenas se não existirem
fn add_column_if_not_exists(conn: &Connection, table: &str, column: &str, col_type: &str) -> Result<(), String> {
  let pragma_query = format!("PRAGMA table_info({});", table);
  let mut stmt = conn.prepare(&pragma_query).map_err(|e| e.to_string())?;
  let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
  
  let mut exists = false;
  while let Some(row) = rows.next().map_err(|e| e.to_string())? {
    let name: String = row.get(1).map_err(|e| e.to_string())?;
    if name.to_lowercase() == column.to_lowercase() {
      exists = true;
      break;
    }
  }
  
  if !exists {
    let alter_query = format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, col_type);
    conn.execute(&alter_query, []).map_err(|e| e.to_string())?;
  }
  
  Ok(())
}

// Verifica se o arquivo .db já existe na pasta
#[tauri::command]
fn check_db_exists() -> Result<bool, String> {
  let db_path = get_db_path()?;
  Ok(db_path.exists())
}

// Abre o banco SQLite com a chave do SQLCipher (e cria se não existir)
#[tauri::command]
fn init_db(state: State<'_, DbState>, password: String) -> Result<(), String> {
  let db_path = get_db_path()?;
  let is_new = !db_path.exists();
  
  let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

  // Aplica a chave criptográfica SQLCipher
  let escaped_pass = password.replace("'", "''");
  conn.pragma_update(None, "key", escaped_pass.as_str()).map_err(|e| e.to_string())?;

  // Se o banco já existia, verifica se a chave descriptografa com sucesso
  if !is_new {
    let res: Result<String, _> = conn.query_row("PRAGMA quick_check(1);", [], |r| r.get(0));
    match res {
      Ok(status) => {
        if status != "ok" {
          return Err("Integridade do banco de dados comprometida.".into());
        }
      }
      Err(_) => {
        return Err("Senha incorreta. Acesso negado.".into());
      }
    }
  }

  // Habilita suporte a chaves estrangeiras (essencial para cascade delete)
  conn.execute("PRAGMA foreign_keys = ON;", []).map_err(|e| e.to_string())?;

  // Se for um novo banco de dados, cria as tabelas estruturadas
  if is_new {
    let schema = "
      CREATE TABLE IF NOT EXISTS config (
          name TEXT,
          crp TEXT,
          contact TEXT,
          auto_lock_time INTEGER,
          theme TEXT
      );
      CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          cpf TEXT,
          birth_date TEXT,
          phone TEXT,
          address TEXT,
          emergency_contact TEXT,
          created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS evolutions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          title TEXT,
          content TEXT,
          created_at TEXT,
          FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          mime_type TEXT,
          data TEXT, -- base64/BLOB string
          created_at TEXT,
          FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS clinical_tools (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          data TEXT NOT NULL, -- JSON string
          created_at TEXT,
          FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER,
          patient_name TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          duration INTEGER,
          status TEXT NOT NULL,
          notes TEXT,
          FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS finance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER,
          type TEXT NOT NULL, -- INCOME / EXPENSE
          category TEXT,
          description TEXT,
          amount REAL,
          date TEXT NOT NULL,
          FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE SET NULL
      );
    ";
    conn.execute_batch(schema).map_err(|e| e.to_string())?;
  }

  // Garante que a coluna theme existe no banco antigo (evita erros em bancos existentes)
  let _ = add_column_if_not_exists(&conn, "config", "theme", "TEXT");

  // Garante que a coluna status existe na tabela de pacientes
  let _ = add_column_if_not_exists(&conn, "patients", "status", "TEXT DEFAULT 'FILA_ESPERA'");

  // Garante colunas de cobrança, contatos de crise e saúde na tabela de pacientes
  let _ = add_column_if_not_exists(&conn, "patients", "billing_model", "TEXT DEFAULT 'AVULSO'");
  let _ = add_column_if_not_exists(&conn, "patients", "sessions_remaining", "INTEGER DEFAULT 0");
  let _ = add_column_if_not_exists(&conn, "patients", "package_price", "REAL DEFAULT 0");
  let _ = add_column_if_not_exists(&conn, "patients", "session_price", "REAL DEFAULT 150");
  let _ = add_column_if_not_exists(&conn, "patients", "psychiatrist_contact", "TEXT");
  let _ = add_column_if_not_exists(&conn, "patients", "medical_conditions", "TEXT");
  let _ = add_column_if_not_exists(&conn, "patients", "kanban_order", "INTEGER DEFAULT 0");

  // Garante a coluna status na tabela de finanças
  let _ = add_column_if_not_exists(&conn, "finance", "status", "TEXT DEFAULT 'CONFIRMED'");

  // Garante a coluna custom_price na tabela de agendamentos
  let _ = add_column_if_not_exists(&conn, "appointments", "custom_price", "REAL");

  // Garante que a tabela de tarefas diárias existe
  let _ = conn.execute("
      CREATE TABLE IF NOT EXISTS daily_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          time TEXT NOT NULL,
          done INTEGER DEFAULT 0,
          date TEXT NOT NULL
      );
  ", []);

  // Garante a coluna important na tabela de tarefas diárias
  let _ = add_column_if_not_exists(&conn, "daily_tasks", "important", "INTEGER DEFAULT 0");

  // Grava o ponteiro de conexão no estado global
  let mut db_mutex = state.0.lock().unwrap();
  *db_mutex = Some(conn);

  Ok(())
}

// Fecha o banco e descarta a chave
#[tauri::command]
fn close_db(state: State<'_, DbState>) -> Result<(), String> {
  let mut db_mutex = state.0.lock().unwrap();
  *db_mutex = None;
  Ok(())
}

// Executa comandos de alteração de dados (INSERT, UPDATE, DELETE)
#[tauri::command]
fn db_execute(state: State<'_, DbState>, sql: String, params: Vec<JsonValue>) -> Result<u64, String> {
  let db_mutex = state.0.lock().unwrap();
  let conn = db_mutex.as_ref().ok_or("Banco de dados bloqueado ou não inicializado.")?;

  let sql_params: Vec<SqlValue> = params.iter().map(to_sql_value).collect();
  let params_iter = ParamsFromIter::from(sql_params.iter());

  let is_insert = sql.trim().to_lowercase().starts_with("insert");
  let affected = conn.execute(&sql, params_iter).map_err(|e| e.to_string())?;
  
  if is_insert {
    Ok(conn.last_insert_rowid() as u64)
  } else {
    Ok(affected as u64)
  }
}

// Executa consultas e retorna dados formatados como array JSON
#[tauri::command]
fn db_query(state: State<'_, DbState>, sql: String, params: Vec<JsonValue>) -> Result<JsonValue, String> {
  let db_mutex = state.0.lock().unwrap();
  let conn = db_mutex.as_ref().ok_or("Banco de dados bloqueado ou não inicializado.")?;

  let sql_params: Vec<SqlValue> = params.iter().map(to_sql_value).collect();
  let params_iter = ParamsFromIter::from(sql_params.iter());

  let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
  let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

  let rows = stmt.query_map(params_iter, |row| {
    let mut row_map = serde_json::Map::new();
    for (i, name) in col_names.iter().enumerate() {
      let val_ref = row.get_ref(i)?;
      row_map.insert(name.clone(), to_json_value(val_ref));
    }
    Ok(JsonValue::Object(row_map))
  }).map_err(|e| e.to_string())?;

  let mut results = Vec::new();
  for row_result in rows {
    results.push(row_result.map_err(|e| e.to_string())?);
  }

  Ok(JsonValue::Array(results))
}

// Realiza o backup físico do arquivo descriptografado/criptografado
#[tauri::command]
fn backup_db(dest_path: String) -> Result<(), String> {
  let db_path = get_db_path()?;
  if !db_path.exists() {
    return Err("Nenhum banco de dados existe para fazer backup.".into());
  }

  // Copia o arquivo SQLite com SQLCipher de forma idêntica
  fs::copy(db_path, &dest_path).map_err(|e| e.to_string())?;
  Ok(())
}

// Abre uma caixa de diálogo nativa para o profissional escolher onde salvar o backup
#[tauri::command]
fn select_backup_path() -> Result<Option<String>, String> {
  let path = rfd::FileDialog::new()
    .set_title("Escolher local para salvar a Cópia de Segurança")
    .add_filter("Base de Dados", &["db"])
    .set_file_name("acaua_backup.db")
    .save_file();
    
  Ok(path.map(|p| p.to_string_lossy().into_owned()))
}

// Deleta o arquivo .db local para permitir a criação de um novo banco limpo
#[tauri::command]
fn delete_db(state: State<'_, DbState>) -> Result<(), String> {
  if let Ok(mut lock) = state.0.lock() {
    if let Some(conn) = lock.take() {
      let _ = conn.close();
    }
  }
  let db_path = get_db_path()?;
  if db_path.exists() {
    let _ = fs::remove_file(&db_path);
  }
  let wal = db_path.with_extension("db-wal");
  if wal.exists() { let _ = fs::remove_file(&wal); }
  let shm = db_path.with_extension("db-shm");
  if shm.exists() { let _ = fs::remove_file(&shm); }
  let journal = db_path.with_extension("db-journal");
  if journal.exists() { let _ = fs::remove_file(&journal); }
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .manage(DbState(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![
      check_db_exists,
      init_db,
      close_db,
      delete_db,
      db_execute,
      db_query,
      backup_db,
      select_backup_path
    ])
    .run(tauri::generate_context!())
    .expect("Erro ao executar a aplicação Tauri");
}
