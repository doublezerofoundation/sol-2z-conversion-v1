#![allow(unexpected_cfgs)]
#![allow(deprecated)]

mod system_management;
mod common;
pub mod configuration_registry;
mod deny_list_registry;
mod discount_rate;
mod fills_registry;
mod initialize;
mod state;
mod user_flow;

use system_management::set_admin::*;
use system_management::system_state::*;
use anchor_lang::prelude::*;
use common::structs::*;
use configuration_registry::update_configuration::*;
use configuration_registry::update_dequeuers::*;
use deny_list_registry::deny_list_registry::*;
use discount_rate::calculate_ask_price::*;
use initialize::init_system::*;
use user_flow::buy_sol::*;

declare_id!("YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z");
#[program]
pub mod converter_program {
    use super::*;

    //////////////////////// ADMIN FLOW ////////////////////////

    pub fn initialize_system(
        ctx: Context<InitializeSystem>,
        oracle_pubkey: Pubkey,
        sol_quantity: u64,
        slot_threshold: u64,
        price_maximum_age: i64,
        max_fills_storage: u64,
        steepness: u64,
        max_discount_rate: u64
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
            max_fills_storage,
            steepness,
            max_discount_rate
        )
    }

    pub fn update_configuration_registry(
        ctx: Context<ConfigurationRegistryUpdate>,
        input: ConfigurationRegistryInput
    ) -> Result<()> {
        ctx.accounts.process_update(input)
    }

    pub fn add_dequeuer(
        ctx: Context<UpdateDequeuers>,
        new_pubkey: Pubkey,
    ) -> Result<()> {
        ctx.accounts.add_dequeuer(new_pubkey)
    }

    pub fn remove_dequeuer(
        ctx: Context<UpdateDequeuers>,
        remove_pubkey: Pubkey,
    ) -> Result<()> {
        ctx.accounts.remove_dequeuer(remove_pubkey)
    }

    pub fn add_to_deny_list(ctx: Context<UpdateDenyList>, address: Pubkey) -> Result<()> {
        ctx.accounts.add_to_deny_list(address)
    }

    pub fn remove_from_deny_list(ctx: Context<UpdateDenyList>, address: Pubkey) -> Result<()> {
        ctx.accounts.remove_from_deny_list(address)
    }

    pub fn set_admin(ctx: Context<SetAdmin>, new_admin: Pubkey) -> Result<()> {
        ctx.accounts.process(new_admin)
    }

    pub fn toggle_system_state(ctx: Context<SystemState>, set_to: bool) -> Result<()> {
        ctx.accounts.process(set_to)
    }

    //////////////////////// USER FLOW ////////////////////////

    pub fn buy_sol(
        ctx: Context<BuySol>,
        bid_price: u64,
        swap_rate: String,
        timestamp: i64,
        attestation: String,
    ) -> Result<()> {
        ctx.accounts
            .process(bid_price, swap_rate, timestamp, attestation)
    }

    pub fn calculate_ask_price(
        ctx: Context<CalculateAskPrice>,
        oracle_price_data: OraclePriceData,
    ) -> Result<u64> {
        ctx.accounts.process(oracle_price_data)
    }
}
