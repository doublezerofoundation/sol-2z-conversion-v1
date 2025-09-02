use crate::error::ReviewError;
use crate::instruction::MockProgramInstruction;
use solana_program::program_pack::Pack;
use solana_program::{account_info::{next_account_info, AccountInfo}, entrypoint::ProgramResult, msg, program::invoke_signed, program_error::ProgramError, pubkey::Pubkey, rent, system_instruction, system_program, sysvar, sysvar::{rent::Rent, Sysvar}};
use spl_token_2022::instruction::initialize_account;
use spl_token_2022::{instruction::initialize_mint, ID as TOKEN_PROGRAM_ID};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = MockProgramInstruction::unpack(instruction_data)?;
    match instruction {
        MockProgramInstruction::Initialize => initialize(program_id, accounts),
        MockProgramInstruction::WithdrawSol { amount} => withdraw_sol(program_id, accounts, amount),
        MockProgramInstruction::Mint2Z { amount } => mint_2z(program_id, accounts, amount),
    }
}

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

    let (mint_pda, mint_bump) = Pubkey::find_program_address(
        &[b"double_zero_mint"],
        program_id
    );

    let (program_config_pda, config_bump) = Pubkey::find_program_address(
        &[b"config"],
        program_id
    );

    let (journal_pda, journal_bump) = Pubkey::find_program_address(
        &[b"jour"],
        program_id
    );

    let (protocol_treasury_pda, treasury_bump) = Pubkey::find_program_address(
        &[b"protocol_treasury"],
        program_id
    );

    if mint_pda != *double_zero_mint.key {
        msg!("Incorrect token mint account");
        return Err(ReviewError::InvalidPDA.into());
    }

    if program_config_pda != *program_config.key {
        msg!("Incorrect config account");
        return Err(ReviewError::InvalidPDA.into());
    }

    if journal_pda != *journal.key {
        msg!("Incorrect journal account");
        return Err(ReviewError::InvalidPDA.into());
    }

    if protocol_treasury_pda != *protocol_treasury_token_account.key {
        msg!("Incorrect protocol treasury account");
        return Err(ReviewError::InvalidPDA.into());
    }

    if *token_program.key != TOKEN_PROGRAM_ID {
        msg!("Incorrect token program");
        return Err(ReviewError::InvalidPDA.into());
    }

    if *system_program.key != system_program::ID {
        msg!("Incorrect system program");
        return Err(ReviewError::InvalidPDA.into());
    }

    if *sysvar_rent.key != sysvar::rent::ID {
        msg!("Incorrect rent program");
        return Err(ReviewError::InvalidPDA.into());
    }

    let rent = Rent::get()?;
    let mint_length = spl_token_2022::state::Mint::LEN;
    let rent_lamports = rent.minimum_balance(mint_length);

    invoke_signed(
        &system_instruction::create_account(
            signer.key,
            double_zero_mint.key,
            rent_lamports,
            mint_length as u64,
            token_program.key,
        ),
        &[
            signer.clone(),
            double_zero_mint.clone(),
            system_program.clone(),
        ],
        &[&[b"double_zero_mint", &[mint_bump]]],
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
        &[&[b"double_zero_mint", &[mint_bump]]],
    )?;

    msg!("Initialized token mint");

    let rent = Rent::get()?;
    let token_account_length = spl_token_2022::state::Account::LEN;
    let rent_lamports = rent.minimum_balance(token_account_length);

    invoke_signed(
        &system_instruction::create_account(
            signer.key,
            protocol_treasury_token_account.key,
            rent_lamports,
            token_account_length as u64,
            token_program.key,
        ),
        &[
            signer.clone(),
            protocol_treasury_token_account.clone(),
            system_program.clone(),
        ],
        &[&[b"protocol_treasury", &[treasury_bump]]],
    )?;

    msg!("Created token account");

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
        &[&[b"protocol_treasury", &[treasury_bump]]],
    )?;
    msg!("Initialized token account");

    let rent = Rent::get()?;
    let account_length = 8;
    let rent_lamports = rent.minimum_balance(account_length);

    invoke_signed(
        &system_instruction::create_account(
            signer.key,
            program_config.key,
            rent_lamports,
            account_length as u64,
            program_id,
        ),
        &[
            signer.clone(),
            program_config.clone(),
            system_program.clone(),
        ],
        &[&[b"config", &[config_bump]]],
    )?;

    msg!("Created program_config account");

    invoke_signed(
        &system_instruction::create_account(
            signer.key,
            journal.key,
            rent_lamports,
            account_length as u64,
            program_id,
        ),
        &[
            signer.clone(),
            journal.clone(),
            system_program.clone(),
        ],
        &[&[b"jour", &[journal_bump]]],
    )?;

    msg!("Created journal account");
    Ok(())
}

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

    if !withdraw_sol_authority.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (program_config_pda, _) = Pubkey::find_program_address(
        &[b"config"],
        program_id
    );

    let (journal_pda, _) = Pubkey::find_program_address(
        &[b"jour"],
        program_id
    );

    if program_config_pda != *program_config_key.key {
        msg!("Incorrect config account");
        return Err(ReviewError::InvalidPDA.into());
    }

    if journal_pda != *journal.key {
        msg!("Incorrect journal account");
        return Err(ReviewError::InvalidPDA.into());
    }

    if **journal.lamports.borrow() < amount {
        return Err(ProgramError::InsufficientFunds);
    }

    // Subtract from sender
    **journal.try_borrow_mut_lamports()? -= amount;
    // Add to recipient
    **sol_recipient.try_borrow_mut_lamports()? += amount;
    Ok(())
}

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

    if *double_zero_mint.key != mint_pda {
        msg!("Incorrect token mint");
        return Err(ReviewError::InvalidPDA.into());
    }

    if *token_program.key != TOKEN_PROGRAM_ID {
        msg!("Incorrect token program");
        return Err(ReviewError::InvalidPDA.into());
    }

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
        &[&[b"double_zero_mint", &[mint_bump]]],
    )?;

    Ok(())
}