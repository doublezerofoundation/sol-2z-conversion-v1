use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DoubleZeroError {
    #[error("Account not initialized yet")]
    UninitializedAccount,

    #[error("PDA derived does not equal PDA passed in")]
    InvalidPDA,

    #[error("Provided account is not correct")]
    InvalidAccount,

    #[error("Input data exceeds max length")]
    InvalidDataLength,

    #[error("Rating greater than 5 or less than 1")]
    InvalidRating,
}

impl From<DoubleZeroError> for ProgramError {
    fn from(e: DoubleZeroError) -> Self {
        ProgramError::Custom(e as u32)
    }
}