use anchor_lang::{prelude::*, solana_program::program::set_return_data};
use rust_decimal::{
    prelude::{FromPrimitive, ToPrimitive},
    Decimal,
};

use crate::{
    common::{
        constant::TOKEN_DECIMALS, error::DoubleZeroError, seeds::seed_prefixes::SeedPrefixes,
        structs::OraclePriceData, utils::attestation_utils::verify_attestation,
    },
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry,
    discount_rate::discount_utils::{
        calculate_conversion_rate_with_discount, calculate_discount_rate,
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
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,

    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump = program_state.bump_registry.configuration_registry_bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,

    #[account(
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump = program_state.bump_registry.deny_list_registry_bump,
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

        let clock = Clock::get()?;

        // Calculate conversion rate
        let conversion_rate = calculate_conversion_rate_with_oracle_price_data(
            oracle_price_data,
            self.configuration_registry.coefficient,
            self.configuration_registry.max_discount_rate,
            self.configuration_registry.min_discount_rate,
            self.program_state.last_trade_slot,
            clock.slot,
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
    coefficient: u64,
    max_discount_rate: u64,
    min_discount_rate: u64,
    s_last: u64,
    s_now: u64,
) -> Result<u64> {
    let discount_rate = calculate_discount_rate(
        coefficient,
        max_discount_rate,
        min_discount_rate,
        s_last,
        s_now,
    )?;

    let conversion_rate = calculate_conversion_rate_with_discount(
        oracle_price_data.swap_rate,
        discount_rate,
    )?;

    let conversion_rate_u64 = conversion_rate
        .checked_mul(
            Decimal::from_u64(TOKEN_DECIMALS)
                .ok_or(error!(DoubleZeroError::InvalidConversionRate))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidConversionRate))?
        .to_u64()
        .ok_or(error!(DoubleZeroError::InvalidConversionRate))?;

    Ok(conversion_rate_u64)
}
