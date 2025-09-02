use crate::common::{
    seeds::{
        MOCK_2Z_TOKEN_MINT_SEED,
        MOCK_CONFIG_ACCOUNT_SEED,
        MOCK_JOURNAL_SEED,
        MOCK_PROTOCOL_TREASURY_SEED,
    },
    utils::{
        account_utils::create_pda_account,
        assertion_utils::{assert_address, assert_pda},
    },
};

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_pack::Pack,
    pubkey::Pubkey,
    system_program,
    sysvar,
};

use spl_token_2022::{
    instruction::{initialize_account, initialize_mint},
    state::{Account, Mint},
    ID as TOKEN_PROGRAM_ID,
};

pub fn initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let program_config = next_account_info(account_info_iter)?;
    let journal = next_account_info(account_info_iter)?;
    let double_zero_mint = next_account_info(account_info_iter)?;
    let protocol_treasury_token_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let sysvar_rent = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let signer = next_account_info(account_info_iter)?;

    // --- Derive PDAs ---
    let (mint_pda, mint_bump) =
        Pubkey::find_program_address(&[MOCK_2Z_TOKEN_MINT_SEED], program_id);
    let (program_config_pda, config_bump) =
        Pubkey::find_program_address(&[MOCK_CONFIG_ACCOUNT_SEED], program_id);
    let (journal_pda, journal_bump) =
        Pubkey::find_program_address(&[MOCK_JOURNAL_SEED], program_id);
    let (protocol_treasury_pda, treasury_bump) =
        Pubkey::find_program_address(&[MOCK_PROTOCOL_TREASURY_SEED], program_id);

    // --- Validate accounts ---
    assert_pda(&mint_pda, double_zero_mint, "token mint")?;
    assert_pda(&program_config_pda, program_config, "config")?;
    assert_pda(&journal_pda, journal, "journal")?;
    assert_pda(&protocol_treasury_pda.clone(), protocol_treasury_token_account, "protocol treasury")?;
    assert_address(TOKEN_PROGRAM_ID, token_program.key, "token program")?;
    assert_address(system_program::ID, system_program.key, "system program")?;
    assert_address(sysvar::rent::ID , sysvar_rent.key, "rent sys var")?;

    // --- Create & init Mint ---
    create_pda_account(
        signer,
        double_zero_mint,
        system_program,
        &[MOCK_2Z_TOKEN_MINT_SEED, &[mint_bump]],
        Mint::LEN,
        token_program.key,
    )?;
    msg!("Created token mint account");

    invoke_signed(
        &initialize_mint(
            token_program.key,
            double_zero_mint.key,
            double_zero_mint.key,
            None,
            8,
        )?,
        &[
            double_zero_mint.clone(),
            sysvar_rent.clone()
        ],
        &[&[MOCK_2Z_TOKEN_MINT_SEED, &[mint_bump]]],
    )?;

    msg!("Initialized token mint");

    // --- Create & init Treasury Token Account ---
    create_pda_account(
        signer,
        protocol_treasury_token_account,
        system_program,
        &[MOCK_PROTOCOL_TREASURY_SEED, &[treasury_bump]],
        Account::LEN,
        token_program.key,
    )?;
    msg!("Created protocol treasury token account");

    invoke_signed(
        &initialize_account(
            token_program.key,
            protocol_treasury_token_account.key,
            double_zero_mint.key,
            token_program.key,
        )?,
        &[
            protocol_treasury_token_account.clone(),
            double_zero_mint.clone(),
            sysvar_rent.clone()
        ],
        &[&[MOCK_PROTOCOL_TREASURY_SEED, &[treasury_bump]]],
    )?;
    msg!("Initialized token account");

    // --- Create program config ---
    create_pda_account(
        signer,
        program_config,
        system_program,
        &[MOCK_CONFIG_ACCOUNT_SEED, &[config_bump]],
        8,
        program_id,
    )?;
    msg!("Created program_config account");

    // --- Create journal ---
    create_pda_account(
        signer,
        journal,
        system_program,
        &[MOCK_JOURNAL_SEED, &[journal_bump]],
        8,
        program_id,
    )?;
    msg!("Created journal account");

    Ok(())
}