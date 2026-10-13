use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, io::Write, path::Path, sync::Mutex};
use tauri::Manager;

static CHECKPOINT_LOCK: Mutex<()> = Mutex::new(());

#[derive(Deserialize, Serialize)]
pub struct Checkpoint {
    id: String,
    entries: BTreeMap<String, String>,
}

fn read(path: &Path) -> Result<Option<Checkpoint>, String> {
    match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map(Some).map_err(|e| e.to_string()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn write(path: &Path, checkpoint: &Checkpoint) -> Result<(), String> {
    let parent = path.parent().ok_or("Missing checkpoint directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = path.with_extension("tmp");
    let bytes = serde_json::to_vec(checkpoint).map_err(|e| e.to_string())?;
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(&temporary).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(temporary, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_restart_checkpoint(app: tauri::AppHandle, checkpoint: Checkpoint) -> Result<(), String> {
    let _guard = CHECKPOINT_LOCK.lock().map_err(|e| e.to_string())?;
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("restart-checkpoint.json");
    write(&path, &checkpoint)
}

#[tauri::command]
pub fn read_restart_checkpoint(app: tauri::AppHandle) -> Result<Option<Checkpoint>, String> {
    let _guard = CHECKPOINT_LOCK.lock().map_err(|e| e.to_string())?;
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("restart-checkpoint.json");
    read(&path)
}

#[tauri::command]
pub fn clear_restart_checkpoint(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let _guard = CHECKPOINT_LOCK.lock().map_err(|e| e.to_string())?;
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("restart-checkpoint.json");
    if read(&path)?.is_some_and(|checkpoint| checkpoint.id == id) {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checkpoint_replacement_and_corruption_are_observable() {
        let directory = std::env::temp_dir().join(format!("novelite-checkpoint-test-{}", std::process::id()));
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("restart-checkpoint.json");
        assert!(read(&path).unwrap().is_none());
        for id in ["first", "second"] {
            write(&path, &Checkpoint { id: id.into(), entries: BTreeMap::from([("manuscript".into(), "未保存的文字 🌙".into())]) }).unwrap();
            let restored = read(&path).unwrap().unwrap();
            assert_eq!(restored.id, id);
            assert_eq!(restored.entries["manuscript"], "未保存的文字 🌙");
        }
        fs::write(&path, b"truncated{").unwrap();
        assert!(read(&path).is_err());
        fs::remove_file(path).unwrap();
        fs::remove_dir(directory).unwrap();
    }
}
