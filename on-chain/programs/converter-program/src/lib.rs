#![allow(unexpected_cfgs)]

mod common;
pub mod configuration_registry;
mod state;
mod validator_deposit;
mod deny_list_registry;
mod fills_registry;
mod initialize;
mod user_flow;

use anchor_lang::prelude::*;
use initialize::init_system::*;
use configuration_registry::configuration_registry::*;
use user_flow::buy_sol::*;

declare_id!("YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z");
#[program]
pub mod converter_program {
    use super::*;


    // Admin Flow
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

    pub fn update_configuration_registry(
        ctx: Context<ConfigurationRegistryUpdate>,
        input: ConfigurationRegistryInput
    ) -> Result<()> {
        ctx.accounts.process_update(input)
    }

    // User Flow
    pub fn buy_sol(
        ctx: Context<BuySol>,
        bid_price: u64,
        swap_rate: u64,
        timestamp: u64,
        attestation: String
    ) -> Result<()> {
        ctx.accounts.process(
            bid_price,
            swap_rate,
            timestamp,
            attestation
        )
    }
}
