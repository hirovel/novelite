// Release verification uses the same signature verifier as the native updater.
use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let public_key = String::from_utf8(STANDARD.decode(std::fs::read_to_string(&args[1])?.trim())?)?;
    let key = PublicKey::decode(&public_key)?;
    for path in &args[2..] {
        let mut data = std::fs::read(path)?;
        let encoded = std::fs::read_to_string(format!("{path}.sig"))?;
        let text = String::from_utf8(STANDARD.decode(encoded.trim())?)?;
        let signature = Signature::decode(&text)?;
        key.verify(&data, &signature, true)?;
        data[0] ^= 1;
        assert!(key.verify(&data, &signature, true).is_err(), "Tampered update accepted");
        println!("PASS signed artifact and tamper rejection: {path}");
    }
    Ok(())
}
