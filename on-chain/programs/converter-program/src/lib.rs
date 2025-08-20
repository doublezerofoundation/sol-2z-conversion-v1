#![allow(unexpected_cfgs)]

mod system_management;
mod common;
pub mod configuration_registry;
mod calculate_ask_price;
mod fills_registry;
mod init_system;
mod program_state;
mod buy_sol;
mod migration;
mod deny_list_registry;

use system_management::set_admin::*;
use system_management::set_deny_list_authority::*;
use system_management::system_state::*;
use anchor_lang::prelude::*;
use common::structs::*;
use configuration_registry::update_configuration::*;
use configuration_registry::update_dequeuers::*;
use calculate_ask_price::*;
use init_system::*;
use buy_sol::*;
use deny_list_registry::*;
use fills_registry::dequeue_fills::*;
use fills_registry::fills_registry::*;
use migration::migrate_v1_to_v2::*;
use migration::rollback_v2_to_v1::*;

declare_id!("YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z");
#[program]
pub mod converter_program {
    use super::*;

    //////////////////////// ADMIN FLOW ////////////////////////

    pub fn initialize_system(
        ctx: Context<InitializeSystem>,
        oracle_pubkey: Pubkey,
        sol_quantity: u64,
        price_maximum_age: i64,
        coefficient: u64,
        max_discount_rate: u64,
        min_discount_rate: u64
    ) -> Result<()> {

        // Setting bumps values
        ctx.accounts.set_bumps(
            ctx.bumps.configuration_registry,
            ctx.bumps.program_state,
            ctx.bumps.deny_list_registry,
            ctx.bumps.withdraw_authority
        )?;

        // Calling Init instruction
        ctx.accounts.process(
            oracle_pubkey,
            sol_quantity,
            price_maximum_age,
            coefficient,
            max_discount_rate,
            min_discount_rate
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

    pub fn set_deny_list_authority(ctx: Context<SetDenyListAuthority>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.process(new_authority)
    }

    pub fn toggle_system_state(ctx: Context<SystemState>, set_to: bool) -> Result<()> {
        ctx.accounts.process(set_to)
    }

    //////////////////////// USER FLOW ////////////////////////

    pub fn buy_sol(
        ctx: Context<BuySol>,
        bid_price: u64,
        oracle_price_data: OraclePriceData
    ) -> Result<()> {
        ctx.accounts.process(
            bid_price,
            oracle_price_data
        )
    }

    pub fn get_conversion_rate(
        ctx: Context<CalculateAskPrice>,
        oracle_price_data: OraclePriceData,
    ) -> Result<u64> {
        ctx.accounts.get_conversion_rate(oracle_price_data)
    }

    //////////////////////// Integration Contract ////////////////////////
    pub fn dequeue_fills(
        ctx: Context<DequeueFills>,
        max_sol_amount: u64,
    ) -> Result<DequeueFillsResult> {
        ctx.accounts.process(max_sol_amount)
    }

    //////////////////////// Example Migration ////////////////////////
    //////////////////////// !!! Only as an example ////////////////////////
    pub fn migrate_v1_to_v2(
        ctx: Context<MigrateV1ToV2>,
    ) -> Result<()> {
        ctx.accounts.set_bumps(
            ctx.bumps.configuration_registry_new,
            ctx.bumps.deny_list_registry_new
        )?;
        ctx.accounts.process()
    }

    pub fn rollback_v2_to_v1(
        ctx: Context<RollbackV2toV1>,
    ) -> Result<()> {
        ctx.accounts.set_bumps(
            ctx.bumps.configuration_registry_new,
            ctx.bumps.deny_list_registry_new
        )?;

        ctx.accounts.process()
    }
}
