// Anchor framework prelude
use anchor_lang::prelude::*;

// Base64 decoding
use base64::engine::general_purpose::STANDARD;
use base64::Engine;

// Ed25519 signature verification
use ed25519_dalek::{PublicKey, Signature, Verifier};

use crate::common::error::DoubleZeroError;

pub fn verify_attestation(
    swap_rate: u64,
    timestamp: u64,
    attestation: String,
    oracle_public_key: Pubkey
) -> Result<()> {

    let message_string = format!("{}|{}", swap_rate, timestamp);
    let dalek_pubkey = PublicKey::from_bytes(oracle_public_key.as_ref())
        .map_err(|_| error!(DoubleZeroError::InvalidOraclePublicKey))?;

    // Parse the signature
    let attestation_vec = STANDARD
        .decode(&attestation)
        .map_err(|_| error!(DoubleZeroError::InvalidAttestation))?;

    let signature = Signature::from_bytes(&attestation_vec)
        .map_err(|_| error!(DoubleZeroError::InvalidAttestation))?;

    dalek_pubkey.verify(message_string.as_ref(), &signature)
        .map_err(|_| error!(DoubleZeroError::AttestationVerificationError))?;

    Ok(())
}