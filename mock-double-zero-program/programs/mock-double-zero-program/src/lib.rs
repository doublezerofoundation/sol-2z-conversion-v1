#![allow(unexpected_cfgs)]
mod instructions;

use anchor_lang::prelude::*;
use instructions::initialize::*;
use instructions::withdraw_sol::*;
use instructions::mint_2z::*;

declare_id!("8S2TYzrr1emJMeQ4FUgKhsLyux3vpMhMojMTNKzPebww");
#[program]
pub mod mock_transfer_program {
    use super::*;
    pub fn initialize(
        ctx: Context<InitializeAccounts>
    ) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        amount_out: u64
    ) -> Result<()> {
        ctx.accounts.process(
            amount_out,
            ctx.bumps.vault_account
        )
    }

    pub fn mint_2z(
        ctx: Context<Mint2Z>,
        amount: u64
    ) -> Result<()> {
        ctx.accounts.process(amount, ctx.bumps.double_zero_mint)
    }
}
