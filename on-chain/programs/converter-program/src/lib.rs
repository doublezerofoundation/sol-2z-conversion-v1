#![allow(unexpected_cfgs)]

mod common;
mod configuration;
mod state;
mod validator_deposit;
mod deny_list;
mod fill_data;
mod initialize;

use anchor_lang::prelude::*;

declare_id!("YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z");

#[program]
pub mod converter_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
