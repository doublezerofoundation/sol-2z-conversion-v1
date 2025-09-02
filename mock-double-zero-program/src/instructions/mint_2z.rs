use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke_signed,
    pubkey::Pubkey,
};

use spl_token_2022::ID as TOKEN_PROGRAM_ID;

use crate::common::{
    seeds::MOCK_2Z_TOKEN_MINT_SEED,
    utils::assertion_utils::{assert_address, assert_pda}
};

pub fn mint_2z(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let user_token_account = next_account_info(account_info_iter)?;
    let double_zero_mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    let (mint_pda, mint_bump) = Pubkey::find_program_address(
        &[b"double_zero_mint"],
        program_id
    );

    // --- Validate accounts ---
    assert_pda(&mint_pda, double_zero_mint, "token mint")?;
    assert_address(TOKEN_PROGRAM_ID, token_program.key, "token program")?;

    invoke_signed(
        &spl_token_2022::instruction::mint_to(
            token_program.key,
            double_zero_mint.key,
            user_token_account.key,
            double_zero_mint.key,
            &[],
            amount,
        )?,
        &[double_zero_mint.clone(), user_token_account.clone()],
        &[&[MOCK_2Z_TOKEN_MINT_SEED, &[mint_bump]]],
    )?;

    Ok(())
}