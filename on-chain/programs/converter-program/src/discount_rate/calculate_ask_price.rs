use anchor_lang::{prelude::*, solana_program::program::set_return_data};
use rust_decimal::{prelude::{FromPrimitive, ToPrimitive}, Decimal};

use crate::{
    common::{
        constant::TOKEN_DECIMALS, error::DoubleZeroError, seeds::seed_prefixes::SeedPrefixes, structs::OraclePriceData, utils::attestation_utils::verify_attestation
    },
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry,
    discount_rate::discount_utils::{
        calculate_conversion_rate_with_discount, calculate_discount_rate, calculate_sol_demand,
    },
    state::program_state::{ProgramStateAccount, TradeHistory},
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

    #[account(
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,
}

impl<'info> CalculateAskPrice<'info> {
    pub fn get_conversion_rate(&mut self, oracle_price_data: OraclePriceData) -> Result<u64> {
        // check if the signer is in the deny list
        if self
            .deny_list_registry
            .denied_addresses
            .contains(&self.signer.key())
        {
            return Err(error!(DoubleZeroError::UserInsideDenyList));
        }

        // checking attestation
        verify_attestation(
            &oracle_price_data,
            self.configuration_registry.oracle_pubkey,
            self.configuration_registry.price_maximum_age,
        )?;

        // Calculate conversion rate
        let conversion_rate = calculate_conversion_rate_with_oracle_price_data(
            oracle_price_data,
            &self.program_state.trade_history_list,
            self.configuration_registry.sol_quantity,
            self.configuration_registry.steepness,
            self.configuration_registry.max_discount_rate,
        )?;

        set_return_data(conversion_rate.to_le_bytes().as_slice());
        Ok(conversion_rate)
    }
}

/// A convenience function to calculate the conversion rate with the oracle price data
///
/// ### Arguments
/// * `oracle_price_data` - The oracle price data
///
/// ### Returns
/// * `Result<u64>` - The conversion rate in basis points
pub fn calculate_conversion_rate_with_oracle_price_data(
    oracle_price_data: OraclePriceData,
    trade_history_list: &Vec<TradeHistory>,
    sol_quantity: u64,
    steepness: u64,
    max_discount_rate: u64,
) -> Result<u64> {
    let sol_demand_bps = calculate_sol_demand(trade_history_list, sol_quantity)?;

    let discount_rate = calculate_discount_rate(sol_demand_bps, steepness, max_discount_rate)?;

    let conversion_rate = calculate_conversion_rate_with_discount(oracle_price_data.swap_rate, discount_rate)?;

    let conversion_rate_u64 = conversion_rate
        .checked_mul(Decimal::from_u64(TOKEN_DECIMALS).ok_or(error!(DoubleZeroError::InvalidConversionRate))?)
        .ok_or(error!(DoubleZeroError::InvalidConversionRate))?
        .to_u64()
        .ok_or(error!(DoubleZeroError::InvalidConversionRate))?;

    Ok(conversion_rate_u64)
}
