#![allow(unexpected_cfgs)]

mod common;
pub mod configuration_registry;
mod state;
mod validator_deposit;
mod deny_list_registry;
mod fills_registry;
mod initialize;

use anchor_lang::prelude::*;
use initialize::init_system::*;

declare_id!("YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z");
#[program]
pub mod converter_program {
    use super::*;

    pub fn initialize_system(
        ctx: Context<InitializeSystem>,
        oracle_pubkey: Pubkey,
        sol_quantity: u64,
        slot_threshold: u64,
        price_maximum_age: u64,
        max_fills_storage: u64
    ) -> Result<()> {

        // Setting bumps values
        ctx.accounts.set_bumps(
            ctx.bumps.configuration_registry,
            ctx.bumps.program_state,
            ctx.bumps.fills_registry,
            ctx.bumps.deny_list_registry
        )?;

        // Calling Init instruction
        ctx.accounts.process(
            oracle_pubkey,
            sol_quantity,
            slot_threshold,
            price_maximum_age,
            max_fills_storage
        )
    }
}
