use serde::Serialize;
#[cfg(windows)] use std::os::windows::ffi::OsStrExt;
use std::{fs,path::PathBuf,process::Command};
use tauri_plugin_dialog::DialogExt;
#[derive(Serialize)] struct OpenedDocument{name:String,path:String,content:String}
#[tauri::command] async fn open_document(app:tauri::AppHandle)->Result<Option<OpenedDocument>,String>{let Some(p)=app.dialog().file().blocking_pick_file()else{return Ok(None)};let path:PathBuf=p.into_path().map_err(|e|e.to_string())?;let m=fs::metadata(&path).map_err(|e|e.to_string())?;if m.len()>20*1024*1024{return Err("Text file exceeds 20 MB".into())}let content=fs::read_to_string(&path).map_err(|e|e.to_string())?;let name=path.file_name().and_then(|n|n.to_str()).unwrap_or("Document").to_string();Ok(Some(OpenedDocument{name,path:path.to_string_lossy().into_owned(),content}))}
#[tauri::command] async fn save_document(app:tauri::AppHandle,path:Option<String>,content:String)->Result<Option<String>,String>{let target=if let Some(p)=path{PathBuf::from(p)}else{let Some(p)=app.dialog().file().blocking_save_file()else{return Ok(None)};p.into_path().map_err(|e|e.to_string())?};if content.len()>20*1024*1024{return Err("Document exceeds 20 MB".into())}fs::write(&target,content.as_bytes()).map_err(|e|e.to_string())?;Ok(Some(target.to_string_lossy().into_owned()))}

#[derive(Serialize)]
struct RemovableDrive { root: String, label: String }

#[tauri::command]
fn list_removable_drives() -> Result<Vec<RemovableDrive>, String> {
    #[cfg(windows)] {
        let mask = unsafe { windows_sys::Win32::Storage::FileSystem::GetLogicalDrives() };
        if mask == 0 { return Err("Windows could not enumerate logical drives".into()); }
        let mut drives = Vec::new();
        for index in 0..26 {
            if (mask & (1u32 << index)) == 0 { continue; }
            let letter = (b'A' + index as u8) as char;
            let root = format!("{}:\\", letter);
            let wide: Vec<u16> = std::ffi::OsStr::new(&root).encode_wide().chain(Some(0)).collect();
            let kind = unsafe { windows_sys::Win32::Storage::FileSystem::GetDriveTypeW(wide.as_ptr()) };
            if kind == windows_sys::Win32::Storage::FileSystem::DRIVE_REMOVABLE {
                drives.push(RemovableDrive { root: root.clone(), label: format!("Removable storage ({})", root.trim_end_matches('\\')) });
            }
        }
        Ok(drives)
    }
    #[cfg(not(windows))] { Ok(Vec::new()) }
}

#[tauri::command]
fn save_to_usb(drive_root: String, filename: String, content: String) -> Result<String, String> {
    #[cfg(windows)] {
        use std::os::windows::ffi::OsStrExt;
        if drive_root.len() != 3 || !drive_root.ends_with(":\\") {
            return Err("Invalid removable drive root".into());
        }
        let wide: Vec<u16> = std::ffi::OsStr::new(&drive_root).encode_wide().chain(Some(0)).collect();
        let kind = unsafe { windows_sys::Win32::Storage::FileSystem::GetDriveTypeW(wide.as_ptr()) };
        if kind != windows_sys::Win32::Storage::FileSystem::DRIVE_REMOVABLE {
            return Err("The selected drive is no longer detected as removable storage".into());
        }
        if content.len() > 20 * 1024 * 1024 { return Err("Export exceeds the 20 MB safety limit".into()); }
        let clean: String = filename.chars().filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | ' ')).collect();
        let clean = clean.trim().trim_matches('.');
        if clean.is_empty() || clean.len() > 120 { return Err("Invalid export filename".into()); }
        let target = PathBuf::from(&drive_root).join(clean);
        fs::write(&target, content.as_bytes()).map_err(|e| format!("USB write failed: {}", e))?;
        Ok(target.to_string_lossy().into_owned())
    }
    #[cfg(not(windows))] { let _ = (drive_root, filename, content); Err("USB removable-drive export is supported on Windows only".into()) }
}


#[tauri::command]
fn pick_litert_model(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(path) = app.dialog().file().add_filter("LiteRT-LM model", &["litertlm"]).blocking_pick_file() else { return Ok(None); };
    let path: PathBuf = path.into_path().map_err(|e| e.to_string())?;
    if !path.is_file() { return Err("Selected model file does not exist".into()); }
    Ok(Some(path.to_string_lossy().into_owned()))
}

fn run_litert_python(code: &str, args: &[String]) -> Result<String, String> {
    let first = Command::new("python").arg("-c").arg(code).args(args).output();
    let output = match first {
        Ok(output) => output,
        Err(_) => Command::new("py").arg("-3").arg("-c").arg(code).args(args).output()
            .map_err(|e| format!("Python 3 was not found. Install Python and the offline LiteRT-LM runtime package. Details: {}", e))?,
    };
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("LiteRT-LM failed: {}", error.trim()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
async fn litert_status() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| run_litert_python("import litert_lm; print('LiteRT-LM Python API is ready')", &[])).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn litert_generate(model_path: String, prompt: String, backend: String, enable_thinking: bool, thinking_budget: u32, max_output_tokens: u32) -> Result<String, String> {
    if prompt.trim().is_empty() || prompt.len() > 30000 { return Err("Prompt must contain 1 to 30,000 bytes".into()); }
    if !matches!(backend.as_str(), "CPU" | "GPU" | "NPU") { return Err("Backend must be CPU, GPU or NPU".into()); }
    if thinking_budget > 8192 || max_output_tokens == 0 || max_output_tokens > 8192 {
        return Err("Thinking budget and output token limits are outside the supported safety range".into());
    }
    let model = PathBuf::from(&model_path);
    if model.extension().and_then(|x| x.to_str()) != Some("litertlm") || !model.is_file() {
        return Err("Select an existing .litertlm model file".into());
    }
    let metadata = fs::metadata(&model).map_err(|e| e.to_string())?;
    if metadata.len() == 0 { return Err("The selected model file is empty".into()); }
    let code = r#"
import sys, litert_lm
model_path, prompt, backend_name = sys.argv[1], sys.argv[2], sys.argv[3]
enable_thinking = sys.argv[4].lower() == "true"
thinking_budget = int(sys.argv[5])
max_output_tokens = int(sys.argv[6])
backend = getattr(litert_lm.Backend, backend_name)()
thinking = litert_lm.ThinkingConfig(enable_thinking=enable_thinking, thinking_token_budget=thinking_budget)
with litert_lm.Engine(model_path, backend=backend) as engine:
    with engine.create_conversation(thinking_config=thinking, max_output_tokens=max_output_tokens) as conversation:
        result = conversation.send_message(prompt)
        print(result["content"][0]["text"])
"#;
    let args = vec![model_path, prompt, backend, enable_thinking.to_string(), thinking_budget.to_string(), max_output_tokens.to_string()];
    tauri::async_runtime::spawn_blocking(move || run_litert_python(code, &args)).await.map_err(|e| e.to_string())?
}


use std::path::{Component, Path};

#[derive(Serialize)]
struct WorkspaceEntry { name: String, relative: String, is_dir: bool, size: u64 }

#[tauri::command]
fn pick_workspace_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(path) = app.dialog().file().blocking_pick_folder() else { return Ok(None); };
    let path: PathBuf = path.into_path().map_err(|e| e.to_string())?;
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.is_dir() { return Err("Selected workspace is not a folder".into()); }
    Ok(Some(canonical.to_string_lossy().into_owned()))
}

fn safe_workspace_target(root: &str, relative: &str) -> Result<(PathBuf, PathBuf), String> {
    let root_path = PathBuf::from(root).canonicalize().map_err(|e| format!("Workspace folder is unavailable: {}", e))?;
    if !root_path.is_dir() { return Err("Workspace root must be a directory".into()); }
    let relative_path = Path::new(relative);
    if relative.trim().is_empty() || relative_path.components().any(|part| !matches!(part, Component::Normal(_))) {
        return Err("Only safe relative file paths inside the selected workspace are allowed".into());
    }
    let target = root_path.join(relative_path);
    let parent = target.parent().ok_or("Invalid file parent path")?.canonicalize().map_err(|e| format!("Parent folder is unavailable: {}", e))?;
    if !parent.starts_with(&root_path) { return Err("Path escapes the selected workspace".into()); }
    Ok((root_path, parent.join(target.file_name().ok_or("Missing filename")?)))
}

#[tauri::command]
fn list_workspace_files(root: String) -> Result<Vec<WorkspaceEntry>, String> {
    let canonical = PathBuf::from(root).canonicalize().map_err(|e| e.to_string())?;
    if !canonical.is_dir() { return Err("Workspace root is not a directory".into()); }
    let mut entries = Vec::new();
    for item in fs::read_dir(&canonical).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        let kind = item.file_type().map_err(|e| e.to_string())?;
        if kind.is_symlink() { continue; }
        let name = item.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') { continue; }
        let metadata = item.metadata().map_err(|e| e.to_string())?;
        entries.push(WorkspaceEntry { name: name.clone(), relative: name, is_dir: kind.is_dir(), size: metadata.len() });
    }
    entries.sort_by(|a,b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    Ok(entries)
}

#[tauri::command]
fn read_workspace_file(root: String, relative: String) -> Result<String, String> {
    let (root_path, target) = safe_workspace_target(&root, &relative)?;
    let canonical = target.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.starts_with(&root_path) { return Err("File path escapes the selected workspace".into()); }
    let metadata = fs::metadata(&canonical).map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.len() > 5 * 1024 * 1024 { return Err("Only files up to 5 MB can be opened in the local file tools".into()); }
    fs::read_to_string(canonical).map_err(|e| format!("File is not readable UTF-8 text: {}", e))
}

#[tauri::command]
fn write_workspace_file(root: String, relative: String, content: String, overwrite: bool) -> Result<String, String> {
    if content.len() > 5 * 1024 * 1024 { return Err("File content exceeds the 5 MB safety limit".into()); }
    let (root_path, target) = safe_workspace_target(&root, &relative)?;
    if fs::symlink_metadata(&target).is_ok() {
        let link_metadata = fs::symlink_metadata(&target).map_err(|e| e.to_string())?;
        if link_metadata.file_type().is_symlink() { return Err("Symbolic links are not allowed as write targets".into()); }
        let canonical = target.canonicalize().map_err(|e| e.to_string())?;
        if !canonical.starts_with(&root_path) { return Err("Target path escapes the selected workspace".into()); }
        if !overwrite { return Err("File already exists; confirm overwrite before saving".into()); }
    }
    let mut options = fs::OpenOptions::new();
    options.write(true).create(overwrite).truncate(overwrite).create_new(!overwrite);
    use std::io::Write;
    let mut file = options.open(&target).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
fn delete_workspace_file(root: String, relative: String) -> Result<(), String> {
    let (root_path, target) = safe_workspace_target(&root, &relative)?;
    let canonical = target.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.starts_with(&root_path) { return Err("Target path escapes the selected workspace".into()); }
    if !canonical.is_file() { return Err("Only individual files can be deleted from this tool".into()); }
    fs::remove_file(canonical).map_err(|e| e.to_string())
}

pub fn run(){tauri::Builder::default().plugin(tauri_plugin_dialog::init()).invoke_handler(tauri::generate_handler![open_document,save_document,list_removable_drives,save_to_usb,pick_litert_model,litert_status,litert_generate,pick_workspace_folder,list_workspace_files,read_workspace_file,write_workspace_file,delete_workspace_file]).run(tauri::generate_context!()).expect("AI Agent Office startup failed");}