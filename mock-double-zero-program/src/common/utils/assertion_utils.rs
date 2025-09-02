use solana_program::{
    account_info::AccountInfo,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    entrypoint::ProgramResult
};
use crate::common::error::DoubleZeroError;

pub fn assert_pda(expected: &Pubkey, actual: &AccountInfo, name: &str) -> Result<(), ProgramError> {
    if expected != actual.key {
        msg!("Incorrect {} PDA", name);
        return Err(DoubleZeroError::InvalidPDA.into());
    }
    Ok(())
}

pub fn assert_address(expected: Pubkey, actual: &Pubkey, name: &str) -> Result<(), ProgramError> {
    if &expected != actual {
        msg!("Incorrect {} account", name);
        return Err(DoubleZeroError::InvalidAccount.into());
    }
    Ok(())
}

pub fn assert_signer(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }
    Ok(())
}