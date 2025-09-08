use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::common::{
    seeds::{MOCK_CONFIG_ACCOUNT_SEED, MOCK_JOURNAL_SEED},
    utils::assertion_utils::{assert_pda, assert_signer}
};

pub fn withdraw_sol(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let program_config_key = next_account_info(account_info_iter)?;
    let withdraw_sol_authority = next_account_info(account_info_iter)?;
    let journal = next_account_info(account_info_iter)?;
    let sol_recipient = next_account_info(account_info_iter)?;

    assert_signer(withdraw_sol_authority)?;

    // --- Derive PDAs ---
    let (program_config_pda, _) =
        Pubkey::find_program_address(&[MOCK_CONFIG_ACCOUNT_SEED], program_id);
    let (journal_pda, _) =
        Pubkey::find_program_address(&[MOCK_JOURNAL_SEED], program_id);

    // --- Validate accounts ---
    assert_pda(&program_config_pda, program_config_key, "config")?;
    assert_pda(&journal_pda, journal, "journal")?;

    if **journal.lamports.borrow() < amount {
        return Err(ProgramError::InsufficientFunds);
    }

    // Subtract from sender
    **journal.try_borrow_mut_lamports()? -= amount;
    // Add to recipient
    **sol_recipient.try_borrow_mut_lamports()? += amount;
    Ok(())
}