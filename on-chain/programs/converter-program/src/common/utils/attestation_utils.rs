use anchor_lang::prelude::*;
use base64::{
    Engine,
    engine::general_purpose::STANDARD
};
use brine_ed25519::sig_verify;
use crate::common::error::DoubleZeroError;

pub fn verify_attestation(
    swap_rate: String,
    attestation_timestamp: i64,
    signature: String,
    oracle_public_key: Pubkey,
    price_maximum_age: i64,
) -> Result<()> {
    // Rebuild the message
    let message_string = format!("{}|{}", swap_rate, attestation_timestamp);
    let message_bytes = message_string.as_bytes();

    // Decode base64
    let signature_vec = STANDARD
        .decode(&signature)
        .map_err(|_| error!(DoubleZeroError::InvalidAttestation))?;

    // ed25519 signature verification
    sig_verify(&oracle_public_key.to_bytes(), &signature_vec, message_bytes)
            .map_err(|_| error!(DoubleZeroError::AttestationVerificationError))?;
    msg!("Signature Verified Successfully");

    // timestamp verification
    let current_timestamp = Clock::get()?.unix_timestamp;
    let difference = current_timestamp - attestation_timestamp;

    require!(
        difference <= price_maximum_age,
        DoubleZeroError::StalePrice
    );
    msg!("Timestamp Verified Successfully");

    Ok(())
}