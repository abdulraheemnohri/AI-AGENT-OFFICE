use serde::Serialize;
#[cfg(windows)] use std::os::windows::ffi::OsStrExt;
use std::{fs,path::PathBuf};
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

pub fn run(){tauri::Builder::default().plugin(tauri_plugin_dialog::init()).invoke_handler(tauri::generate_handler![open_document,save_document,list_removable_drives,save_to_usb]).run(tauri::generate_context!()).expect("AI Agent Office startup failed");}