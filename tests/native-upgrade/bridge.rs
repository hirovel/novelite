// Injected only by build.mjs in disposable CI builds; never linked into releases.
use serde_json::{json, Value};
use std::{fs, io::Write, path::PathBuf, sync::Mutex};

static REPORT_LOCK: Mutex<()> = Mutex::new(());

#[tauri::command]
pub fn upgrade_test(action: String, payload: Value, app: tauri::AppHandle) -> Result<Value, String> {
    let root = PathBuf::from(env!("NOVELITE_UPGRADE_TEST_DIR"));
    match action.as_str() {
        "config" => serde_json::from_slice(&fs::read(root.join("active.json")).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string()),
        "expected" => serde_json::from_slice(&fs::read(root.join("expected.json")).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string()),
        "mode" => {
            fs::write(root.join("mode.json"), payload.to_string()).map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "checkpoint" => {
            let ack: Value = fs::read(root.join("ack.json")).ok()
                .and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or(Value::Null);
            Ok(json!(ack["pid"] == std::process::id() && ack["stage"] == payload["stage"]))
        }
        "report" => {
            let _guard = REPORT_LOCK.lock().map_err(|e| e.to_string())?;
            if payload["stage"] == "save-guard" {
                fs::write(root.join("expected.json"), payload["snapshot"].to_string()).map_err(|e| e.to_string())?;
            }
            let record = json!({
                "nativeVersion": app.package_info().version.to_string(),
                "pid": std::process::id(),
                "executable": std::env::current_exe().map_err(|e| e.to_string())?,
                "payload": payload
            });
            let mut file = fs::OpenOptions::new().create(true).append(true)
                .open(root.join("events.jsonl")).map_err(|e| e.to_string())?;
            writeln!(file, "{record}").map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "exit" => { app.exit(0); Ok(Value::Null) }
        _ => Err("Unknown upgrade test command".into()),
    }
}
