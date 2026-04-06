use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use argon2::Argon2;
use rand::Rng;

const MAGIC: &[u8; 4] = b"STN1";
const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; KEY_LEN], String> {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Key derivation failed: {e}"))?;
    Ok(key)
}

/// Encrypts `plaintext` with the given `password`.
///
/// Returns binary payload: `MAGIC(4) + salt(32) + nonce(12) + AES-256-GCM ciphertext`.
#[tauri::command]
pub fn encrypt_content(password: String, plaintext: String) -> Result<Vec<u8>, String> {
    let mut rng = rand::thread_rng();
    let salt: [u8; SALT_LEN] = rng.gen();
    let nonce_bytes: [u8; NONCE_LEN] = rng.gen();

    let key_bytes = derive_key(&password, &salt)?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {e}"))?;

    let mut out = Vec::with_capacity(4 + SALT_LEN + NONCE_LEN + ciphertext.len());
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(&salt);
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);

    Ok(out)
}

/// Decrypts a payload previously produced by `encrypt_content`.
///
/// Returns the original plaintext or an error string (wrong password, corrupt file).
#[tauri::command]
pub fn decrypt_content(password: String, data: Vec<u8>) -> Result<String, String> {
    // 4 magic + 32 salt + 12 nonce + 16 GCM auth tag = 64 bytes minimum
    if data.len() < 4 + SALT_LEN + NONCE_LEN + 16 {
        return Err("Invalid encrypted file: too short".into());
    }
    if &data[0..4] != MAGIC {
        return Err("Not a valid See the Unseen encrypted file".into());
    }

    let salt = &data[4..4 + SALT_LEN];
    let nonce_bytes = &data[4 + SALT_LEN..4 + SALT_LEN + NONCE_LEN];
    let ciphertext = &data[4 + SALT_LEN + NONCE_LEN..];

    let key_bytes = derive_key(&password, salt)?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext_bytes = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Wrong password or corrupted file".to_string())?;

    String::from_utf8(plaintext_bytes).map_err(|e| format!("Invalid UTF-8 in decrypted content: {e}"))
}
