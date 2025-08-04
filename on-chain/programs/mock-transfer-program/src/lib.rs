#![allow(unexpected_cfgs)]
mod instructions;

use anchor_lang::prelude::*;
use instructions::initialize::*;
use instructions::buy_sol::*;
use instructions::withdraw_2z::*;
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

    pub fn buy_sol(
        ctx: Context<BuySol>,
        amount_2z: u64,
        amount_sol: u64
    ) -> Result<()> {
        ctx.accounts.process(
            amount_2z,
            amount_sol
        )
    }
    pub fn withdraw_2z(
        ctx: Context<Withdraw2Z>,
        amount: u64
    ) -> Result<()> {
        ctx.accounts.process(amount)
    }
    pub fn mint_2z(
        ctx: Context<Mint2Z>,
        amount: u64
    ) -> Result<()> {
        ctx.accounts.process(amount, ctx.bumps.double_zero_mint)
    }
}
