use anchor_lang::{
    prelude::*,
    solana_program::secp256k1_recover::secp256k1_recover
};
use base64::{
    Engine,
    engine::general_purpose::STANDARD
};
use brine_ed25519::sig_verify;
use crate::common::error::DoubleZeroError;

pub fn verify_attestation(
    swap_rate: String,
    timestamp: u64,
    attestation: String,
    oracle_public_key: Pubkey
) -> Result<()> {

    // Rebuild the message
    let message_string = format!("{}|{}", swap_rate, timestamp);
    let message_bytes = message_string.as_bytes();

    // Decode base64
    let attestation_vec = STANDARD
        .decode(&attestation)
        .map_err(|_| error!(DoubleZeroError::InvalidAttestation))?;

    // ed25519 signature verification
    sig_verify(&oracle_public_key.to_bytes(), &attestation_vec, message_bytes)
        .map_err(|_| error!(DoubleZeroError::AttestationVerificationError))?;

    Ok(())
}