use anchor_lang::prelude::*;

use crate::{common::seeds::seed_prefixes::SeedPrefixes, configuration_registry::configuration_registry::ConfigurationRegistry, discount_rate::discount_utils::{calculate_discount_rate, calculate_sol_demand}, state::program_state::ProgramStateAccount};

#[derive(Accounts)]
pub struct CalculateDiscountRate<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub program_state: Account<'info, ProgramStateAccount>,

    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
}

impl<'info> CalculateDiscountRate<'info> {
    pub fn process(&mut self) -> Result<()> {
        // TODO: Implement
        let sol_demand = calculate_sol_demand(self.program_state.trade_history_list)?;
        let discount_rate = calculate_discount_rate(sol_demand)?;
        Ok(())
    }
}