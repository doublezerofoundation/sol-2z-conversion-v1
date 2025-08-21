use anchor_lang::{
    prelude::*,
    solana_program::program::set_return_data
};
use rust_decimal::{
    prelude::{
        FromPrimitive,
        ToPrimitive
    },
    Decimal,
};
use crate::{
    common::{
        constant::TOKEN_DECIMALS,
        error::DoubleZeroError,
        seeds::seed_prefixes::SeedPrefixes,
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
            .contains(&self.signer.key()) {
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
        let conversion_rate = calculate_conversion_rate(
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

pub fn calculate_conversion_rate(
    oracle_price_data: OraclePriceData,
    coefficient: u64,
    max_discount_rate: u64,
    min_discount_rate: u64,
    s_last: u64,
    s_now: u64,
) -> Result<u64> {

    // discount_rate = max(min(γ * (S_now - S_last) + Dmin, Dmax), Dmin)
    let coefficient_decimal = Decimal::from_u64(coefficient)
        .ok_or(error!(DoubleZeroError::InvalidCoefficient))?
        .checked_div(Decimal::from_u64(100000000)
            .ok_or(error!(DoubleZeroError::InvalidCoefficient))?)
        .ok_or(error!(DoubleZeroError::InvalidCoefficient))?;

    let max_discount_rate_decimal = Decimal::from_u64(max_discount_rate)
        .ok_or(error!(DoubleZeroError::InvalidMaxDiscountRate))?
        .checked_div(Decimal::from_u64(DECIMAL_PRECISION * 100)
            .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?)
        .ok_or(error!(DoubleZeroError::InvalidMaxDiscountRate))?;

    let min_discount_rate_decimal = Decimal::from_u64(min_discount_rate)
        .ok_or(error!(DoubleZeroError::InvalidMinDiscountRate))?
        .checked_div(Decimal::from_u64(DECIMAL_PRECISION * 100)
            .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?)
        .ok_or(error!(DoubleZeroError::InvalidMinDiscountRate))?;

    let s_diff = s_now.checked_sub(s_last)
        .ok_or(error!(DoubleZeroError::InvalidTradeSlot))?;
    let s_diff_decimal = Decimal::from_u64(s_diff)
        .ok_or(error!(DoubleZeroError::InvalidTradeSlot))?;

    let discount_rate_decimal = coefficient_decimal
        .checked_mul(s_diff_decimal)
        .ok_or(error!(DoubleZeroError::ArithmeticError))?
        .checked_add(min_discount_rate_decimal)
        .ok_or(error!(DoubleZeroError::ArithmeticError))?
        .min(max_discount_rate_decimal)
        .max(min_discount_rate_decimal);

    // conversion_rate = oracle_swap_rate * (1 - discount_rate)
    let oracle_swap_rate_decimal = Decimal::from_u64(oracle_price_data.swap_rate)
        .ok_or(error!(DoubleZeroError::InvalidOracleSwapRate))?
        .checked_div(Decimal::from_u64(TOKEN_DECIMALS)
            .ok_or(error!(DoubleZeroError::InvalidOracleSwapRate))?)
        .ok_or(error!(DoubleZeroError::InvalidOracleSwapRate))?;
    let one_decimal = Decimal::from_u64(1).unwrap();
    let discount_inverse_decimal = one_decimal
        .checked_sub(discount_rate_decimal)
        .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?;

    let conversion_rate = oracle_swap_rate_decimal
        .checked_mul(discount_inverse_decimal)
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    let conversion_rate_u64 = conversion_rate
        .checked_mul(Decimal::from_u64(TOKEN_DECIMALS)
            .ok_or(error!(DoubleZeroError::InvalidConversionRate))?)
        .ok_or(error!(DoubleZeroError::InvalidConversionRate))?
        .to_u64()
        .ok_or(error!(DoubleZeroError::InvalidConversionRate))?;

    Ok(conversion_rate_u64)
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_calculate_conversion_rate() {
        for (swap_rate, coefficient, max_discount_rate, min_discount_rate, s_last, s_now, expected_rate) in [

            // 0% to 100% discounts under unbounded limits based on slot differences
            (10000000, 50000, 10000, 0, 100, 100, 10000000), // 0% discount
            (10000000, 50000, 10000, 0, 100, 300, 9000000), // 10% discount
            (10000000, 50000, 10000, 0, 100, 600, 7500000), // 25% discount
            (10000000, 50000, 10000, 0, 100, 1100, 5000000), // 50% discount
            (10000000, 50000, 10000, 0, 100, 1600, 2500000), // 75% discount
            (10000000, 50000, 10000, 0, 100, 2100, 0), // 100% discount
            (10000000, 50000, 10000, 0, 100, 3000, 0), // 100% discount beyond max slot diff

            // 0% to 50% discounts under [10%, 50%] bounds based on slot differences
            (10000000, 50000, 5000, 1000, 100, 100, 9000000), // 10% discount 0 slot diff
            (10000000, 50000, 5000, 1000, 100, 200, 8500000), // 15% discount 100 slot diff
            (10000000, 50000, 5000, 1000, 100, 300, 8000000), // 20% discount 200 slot diff
            (10000000, 50000, 5000, 1000, 100, 400, 7500000), // 25% discount 300 slot diff
            (10000000, 50000, 5000, 1000, 100, 500, 7000000), // 30% discount 400 slot diff
            (10000000, 50000, 5000, 1000, 100, 600, 6500000), // 35% discount 500 slot diff
            (10000000, 50000, 5000, 1000, 100, 700, 6000000), // 40% discount 600 slot diff
            (10000000, 50000, 5000, 1000, 100, 800, 5500000), // 45% discount 700 slot diff
            (10000000, 50000, 5000, 1000, 100, 900, 5000000), // 50% discount 800 slot diff
            (10000000, 50000, 5000, 1000, 100, 1000, 5000000), // 50% discount holds beyond 800 slot diff

            // default settings for different slot diffs, coefficient = 0.00004500, bounds [10%, 50%]
            (10000000, 4500, 5000, 1000, 100, 100, 9000000), // current slot is the same as last slot
            (10000000, 4500, 5000, 1000, 100, 101, 8999550), // current slot is one more than last slot
            (10000000, 4500, 5000, 1000, 100, 150, 8977500), // current slot is 50 more than last slot
            (10000000, 4500, 5000, 1000, 100, 200, 8955000), // current slot is 100 more than last slot 
            (10000000, 4500, 5000, 1000, 100, 8988, 5000400), // current slot is almost max slots
            (10000000, 4500, 5000, 1000, 100, 8989, 5000000), // current slot is just passed max slots and capped at max
            (10000000, 4500, 5000, 1000, 100, 10000, 5000000), // current slot is well beyond max slots and capped at max

            // default settings for different slot diffs, bounds [10%, 50%]
            (10000000, 0, 5000, 1000, 100, 200, 9000000), // min coefficient bounded at min discount
            (10000000, 100000000, 5000, 1000, 100, 200, 5000000), // max coefficient bounded at max discount

        ] {
            let oracle_price_data = super::OraclePriceData {
                swap_rate: swap_rate,
                timestamp: 0,
                signature: "unused".to_string(),
            };
            let conversion_rate = super::calculate_conversion_rate(
                oracle_price_data,
                coefficient,
                max_discount_rate,
                min_discount_rate,
                s_last,
                s_now,
            )
            .unwrap();

            assert_eq!(conversion_rate, expected_rate);
        }
    }

}
