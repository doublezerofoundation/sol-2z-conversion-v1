use anchor_lang::{prelude::*, solana_program::program::set_return_data};

use crate::{
    common::{seeds::seed_prefixes::SeedPrefixes, structs::OraclePriceData},
    configuration_registry::configuration_registry::ConfigurationRegistry,
    discount_rate::discount_utils::{
        calculate_ask_price_with_discount, calculate_discount_rate, calculate_sol_demand,
    },
    state::program_state::ProgramStateAccount,
};

#[derive(Accounts)]
pub struct CalculateAskPrice<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,

    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
}

impl<'info> CalculateAskPrice<'info> {
    pub fn process(&mut self, oracle_price_data: OraclePriceData) -> Result<u64> {
        // // checking attestation
        // verify_attestation(
        //     oracle_price_data.swap_rate,
        //     oracle_price_data.timestamp,
        //     oracle_price_data.signature,
        //     self.configuration_registry.oracle_pubkey
        // )?;

        // Calculate sol demand
        let sol_demand_bps = calculate_sol_demand(
            self.program_state.trade_history_list.clone(),
            self.configuration_registry.sol_quantity,
        )?;

        // Calculate discount rate
        let discount_rate = calculate_discount_rate(
            sol_demand_bps,
            self.configuration_registry.steepness,
            self.configuration_registry.max_discount_rate,
        )?;

        // Calculate ask price
        let ask_price_bps = calculate_ask_price_with_discount(
            self.configuration_registry.sol_quantity,
            oracle_price_data.swap_rate,
            discount_rate,
        )?;
        set_return_data(ask_price_bps.to_le_bytes().as_slice());
        Ok(ask_price_bps)
    }
}
