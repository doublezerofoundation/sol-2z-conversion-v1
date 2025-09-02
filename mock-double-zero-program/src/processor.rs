#![allow(unexpected_cfgs)]

use crate::{
    instruction::MockProgramInstruction,
    instructions::{
        initialize::initialize,
        mint_2z::mint_2z,
        withdraw_sol::withdraw_sol,
    }
};
use solana_program::{account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, pubkey::Pubkey};

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = MockProgramInstruction::unpack(instruction_data)?;

    match instruction {
        MockProgramInstruction::Initialize => initialize(program_id, accounts),
        MockProgramInstruction::WithdrawSol { amount } => withdraw_sol(program_id, accounts, amount),
        MockProgramInstruction::Mint2Z { amount } => mint_2z(program_id, accounts, amount),
    }
}