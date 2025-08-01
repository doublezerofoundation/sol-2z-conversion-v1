use anchor_lang::prelude::*;

// NOTE: Anchor 0.30.1 adds 6000 for user error codes)
#[error_code]
pub enum DoubleZeroError {
    #[msg("User is blocked in the DenyList")]
    UserInsideDenyList, // 6000 0x1796

    #[msg("Unauthorized user")]
    UnauthorizedUser, // 6001

    #[msg("Provided Attestation is Invalid")]
    InvalidAttestation, // 6002

    #[msg("Oracle Public Key is Invalid")]
    InvalidOraclePublicKey, // 6003

    #[msg("Provided Attestation is not Authentic")]
    AttestationVerificationError, // 6004

    #[msg("Invalid Timestamp")]
    InvalidTimestamp, // 6005 
    
    #[msg("Provided Attestation is not Authentic")]
    StalePrice, // 6005
}