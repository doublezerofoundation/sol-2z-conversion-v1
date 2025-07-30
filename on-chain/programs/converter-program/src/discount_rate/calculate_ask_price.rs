use anchor_lang::prelude::*;

use crate::{
    common::seeds::seed_prefixes::SeedPrefixes,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    discount_rate::discount_utils::{
        calculate_ask_price_with_discount, calculate_discount_rate, calculate_sol_demand,
    },
    state::program_state::ProgramStateAccount,
};

#[derive(Accounts)]
pub struct CalculateAskPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

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
    pub fn process(&mut self, oracle_swap_rate_bps: u64) -> Result<()> {
        let sol_demand = calculate_sol_demand(self.program_state.trade_history_list.clone())?;
        let discount_rate = calculate_discount_rate(
            sol_demand,
            self.configuration_registry.steepness,
            self.configuration_registry.max_discount_rate,
        )?;
        self.program_state.ask_price_bps = calculate_ask_price_with_discount(
            self.configuration_registry.sol_quantity,
            oracle_swap_rate_bps,
            discount_rate,
        )?;
        Ok(())
    }
}
