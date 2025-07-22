use std::error::Error;
use std::str::FromStr;
use anchor_client::solana_sdk::pubkey::Pubkey;
use crate::core::error::INVALID_PUBLIC_KEY;

pub fn init(set_admin: Option<String>) -> Result<(), Box<dyn Error>> {
    println!("Initiating System");
    if let Some(pub_key_string) = set_admin {
        println!("👤 Setting admin...");

        let admin_pubkey = Pubkey::from_str(&pub_key_string)
            .map_err(|_| Box::<dyn Error>::from(INVALID_PUBLIC_KEY))?;

        println!("✅ Admin Public Key set to: {}", admin_pubkey);
    } else {
        println!("ℹ️ No admin to set. Proceeding without setting admin.");
    }
    Ok(())
}