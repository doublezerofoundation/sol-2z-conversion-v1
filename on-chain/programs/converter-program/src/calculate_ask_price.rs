use anchor_lang::{prelude::*, solana_program::program::set_return_data};
use rust_decimal::{
    prelude::{FromPrimitive, ToPrimitive},
    Decimal,
};
use crate::{
    common::{
        constant::TOKEN_DECIMALS, error::DoubleZeroError, seeds::seed_prefixes::SeedPrefixes,
        structs::OraclePriceData, attestation_utils::verify_attestation,
    },
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::DenyListRegistry,
    program_state::ProgramStateAccount,
};
use crate::common::constant::DECIMAL_PRECISION;

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

/// Discount function
///
/// `D = min ( γ * (S_now - S_last) + Dmin, Dmax )`
///
/// Where:
/// - `D` is the discount rate
/// - `Dmax` is the maximum discount rate
/// - `Dmin` is the minimum discount rate
/// - `γ` is the coefficient
/// - `S_now` is the current sol demand
/// - `S_last` is the last sol demand
///
/// ### Arguments
/// * `coefficient` - The coefficient
/// * `max_discount_rate_bps` - The maximum discount rate
/// * `min_discount_rate_bps` - The minimum discount rate
/// * `s_last` - The last sol demand
/// * `s_now` - The current sol demand
///
/// ### Returns
/// * `Result<Decimal>` - The discount rate
fn calculate_discount_rate(
    coefficient: u64,
    max_discount_rate_bps: u64,
    min_discount_rate_bps: u64,
    s_last: u64,
    s_now: u64,
) -> Result<Decimal> {
    // Convert coefficient to decimal
    // γ = coefficient / 100000000
    // 0 <= γ <= 1
    let coefficient_decimal = Decimal::from_u64(coefficient)
        .ok_or(error!(DoubleZeroError::InvalidCoefficient))?
        .checked_div(
            Decimal::from_u64(100000000)
                .ok_or(error!(DoubleZeroError::InvalidCoefficient))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidCoefficient))?;

    // Dmax = max_discount_rate_bps / (DECIMAL_PRECISION * 100)
    // 0 <= Dmax <= 1
    let max_discount_rate_decimal = Decimal::from_u64(max_discount_rate_bps)
        .ok_or(error!(DoubleZeroError::InvalidMaxDiscountRate))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION * 100)
                .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidMaxDiscountRate))?;

    // Dmin = min_discount_rate_bps / (DECIMAL_PRECISION * 100)
    // 0 <= Dmin <= Dmax
    let min_discount_rate_decimal = Decimal::from_u64(min_discount_rate_bps)
        .ok_or(error!(DoubleZeroError::InvalidMinDiscountRate))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION * 100)
                .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidMinDiscountRate))?;

    // D = min ( γ * (S_now - S_last) + Dmin, Dmax )

    // S_now - S_last
    msg!("Current slot: {}", s_now);
    msg!("Last trade slot: {}", s_last);
    let s_diff = s_now.checked_sub(s_last).ok_or(error!(DoubleZeroError::InvalidTradeSlot))?;
    let s_diff_decimal = Decimal::from_u64(s_diff).ok_or(error!(DoubleZeroError::InvalidTradeSlot))?;

    // γ * (S_now - S_last) + Dmin
    let discount_rate_decimal = coefficient_decimal
        .checked_mul(s_diff_decimal)
        .ok_or(error!(DoubleZeroError::ArithmeticError))?
        .checked_add(min_discount_rate_decimal)
        .ok_or(error!(DoubleZeroError::ArithmeticError))?;

    // min ( γ * (S_now - S_last) + Dmin, Dmax )
    let discount_rate_decimal = discount_rate_decimal
        .min(max_discount_rate_decimal);

    Ok(discount_rate_decimal)
}

/// Calculate the conversion rate with the discount rate
///
/// `P_rate = R * (1 - D)`
///
/// Where:
/// - `P_rate` is the conversion rate
/// - `R` is the oracle swap rate
/// - `D` is the discount rate
///
/// ### Arguments
/// * `oracle_swap_rate` - The oracle swap rate
/// * `discount_rate` - The discount rate
///
/// ### Returns
/// * `Result<u64>` - The ask price in basis points
fn calculate_conversion_rate_with_discount(
    oracle_swap_rate: u64,
    discount_rate: Decimal,
) -> Result<Decimal> {
    let oracle_swap_rate_decimal = Decimal::from_u64(oracle_swap_rate)
        .ok_or(error!(DoubleZeroError::InvalidOracleSwapRate))?
        .checked_div(
            Decimal::from_u64(TOKEN_DECIMALS)
                .ok_or(error!(DoubleZeroError::InvalidOracleSwapRate))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidOracleSwapRate))?;
    let one_decimal = Decimal::from_u64(1).unwrap();

    msg!("Oracle swap rate: {}", oracle_swap_rate_decimal);
    msg!("Discount rate: {}", discount_rate);

    // (1 - D)
    let discount_inverse_decimal = one_decimal
        .checked_sub(discount_rate)
        .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?;

    // Apply the discount rate
    // P * (1 - D)
    let conversion_rate = oracle_swap_rate_decimal
        .checked_mul(discount_inverse_decimal)
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    msg!("Conversion rate: {}", conversion_rate);

    // Convert to basis points
    Ok(conversion_rate)
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_calculate_discount_rate_for_slot() {
        for (slot, expected) in [
            (100, "0.10"), // current slot is the same as last slot
            (101, "0.100045"), // current slot is one more than last slot
            (150, "0.102250"), // current slot is 50 more than last slot
            (8988, "0.499960"), // current slot is almost max slots
            (8989, "0.50"), // current slot is just passed max slots
            (10000, "0.50"), // current slot is well beyond max slots
        ] {
            let discount_rate = super::calculate_discount_rate(
                4500, // 0.000045
                5000, // 50%
                1000, // 10%
                100, // last slot
                slot, // current slot
            )
            .unwrap();

            assert_eq!(discount_rate.to_string(), expected);
        }
    }

    #[test]
    fn test_calculate_discount_rate_for_coefficient() {
        for (coefficient, expected) in [
            (0, "0.10"), // 0 coefficient
            (100000000, "0.50"), // max coefficient
        ] {
            let discount_rate = super::calculate_discount_rate(
                coefficient,
                5000, // 50%
                1000, // 10%
                100, // last slot
                200, // current slot
            )
            .unwrap();

            assert_eq!(discount_rate.to_string(), expected);
        }
    }

    #[test]
    fn test_calculate_conversion_rate_with_discount() {
        for (oracle_swap_rate, discount_rate, expected) in [
            (10000000, "0.00", "10"), // 0%
            (10000000, "0.10", "9.00"), // 10%
            (10000000, "0.25", "7.50"), // 25%
            (10000000, "0.50", "5.00"), // 50%
            (10000000, "0.75", "2.50"), // 75%
        ] {
            let discount_rate_decimal = discount_rate.parse().unwrap();
            let conversion_rate = super::calculate_conversion_rate_with_discount(
                oracle_swap_rate,
                discount_rate_decimal,
            )
            .unwrap();

            assert_eq!(conversion_rate.to_string(), expected);
        }
    }

    #[test]
    fn test_calculate_conversion_rate_with_oracle_price_data() {
        let oracle_price_data = super::OraclePriceData {
            swap_rate: 10000000, // 10.0 SOL
            timestamp: 0, // not used in this test
            signature: "unused".to_string(), // not used in this test
        };
        let coefficient = 4500; // 0.000045
        let max_discount_rate = 5000; // 50%
        let min_discount_rate = 1000; // 10%
        let s_last = 100; // last slot
        let s_now = 200; // current slot
        let conversion_rate = super::calculate_conversion_rate_with_oracle_price_data(
            oracle_price_data,
            coefficient,
            max_discount_rate,
            min_discount_rate,
            s_last,
            s_now,
        )
        .unwrap();

        assert_eq!(conversion_rate, 8955000); // 8.955 SOL in basis points
    }
}
