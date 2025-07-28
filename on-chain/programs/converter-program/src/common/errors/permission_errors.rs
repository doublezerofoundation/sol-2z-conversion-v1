use anchor_lang::prelude::*;

#[error_code]
pub enum PermissionError {
    #[msg("User does not have required permission")]
    PermissionDenied
}
