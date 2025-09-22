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
        constant::{
            TOKEN_UNITS,
            BPS
        },
        error::DoubleZeroError,
        seeds::seed_prefixes::SeedPrefixes,
        structs::OraclePriceData, attestation_utils::verify_attestation,
    },
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::DenyListRegistry,
    program_state::ProgramStateAccount,
};

#[derive(Accounts)]
pub struct CalculateAskPrice<'info> {
    pub signer: Signer<'info>,
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(
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
        ).ok_or(DoubleZeroError::AskPriceCalculationError)?;

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
) -> Option<u64> {

    // discount_rate = max(min(γ * (S_now - S_last) + Dmin, Dmax), Dmin)
    let coefficient_decimal = Decimal::from_u64(coefficient)?
        / Decimal::from_u64(100_000_000)?;

    let max_discount_rate_decimal = Decimal::from_u64(max_discount_rate)?
        / Decimal::from_u16(BPS * 100)?;

    let min_discount_rate_decimal = Decimal::from_u64(min_discount_rate)?
        / Decimal::from_u16(BPS * 100)?;

    let s_diff = s_now.checked_sub(s_last)?;
    let s_diff_decimal = Decimal::from_u64(s_diff)?;

    let discount_rate_decimal = coefficient_decimal
        .checked_mul(s_diff_decimal)?
        .checked_add(min_discount_rate_decimal)?
        .min(max_discount_rate_decimal);

    // conversion_rate = oracle_swap_rate * (1 - discount_rate)
    let oracle_swap_rate_decimal = Decimal::from_u64(oracle_price_data.swap_rate)?
        / Decimal::from_u64(TOKEN_UNITS)?;
    let one_decimal = Decimal::from_u64(1)?;
    let discount_inverse_decimal = one_decimal
        .checked_sub(discount_rate_decimal)?;

    let conversion_rate = oracle_swap_rate_decimal
        .checked_mul(discount_inverse_decimal)?;

    let conversion_rate_u64 = conversion_rate
        .checked_mul(Decimal::from_u64(TOKEN_UNITS)?)?.to_u64()?;

    Some(conversion_rate_u64)
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_calculate_conversion_rate() {
        for (swap_rate, coefficient, max_discount_rate, min_discount_rate, s_last, s_now, expected_rate) in [

            // 0% to 100% discounts under unbounded limits based on slot differences
            (1_000_000_000, 50_000, 10_000, 0, 100, 100, 1_000_000_000), // 0% discount
            (1_000_000_000, 50_000, 10_000, 0, 100, 300, 900_000_000), // 10% discount
            (1_000_000_000, 50_000, 10_000, 0, 100, 600, 750_000_000), // 25% discount
            (1_000_000_000, 50_000, 10_000, 0, 100, 1_100, 500_000_000), // 50% discount
            (1_000_000_000, 50_000, 10_000, 0, 100, 1_600, 250_000_000), // 75% discount
            (1_000_000_000, 50_000, 10_000, 0, 100, 2_100, 0), // 100% discount
            (1_000_000_000, 50_000, 10_000, 0, 100, 3_000, 0), // 100% discount beyond max slot diff

            // 0% to 50% discounts under [10%, 50%] bounds based on slot differences
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 100, 900_000_000), // 10% discount 0 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 200, 850_000_000), // 15% discount 100 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 300, 800_000_000), // 20% discount 200 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 400, 750_000_000), // 25% discount 300 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 500, 700_000_000), // 30% discount 400 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 600, 650_000_000), // 35% discount 500 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 700, 600_000_000), // 40% discount 600 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 800, 550_000_000), // 45% discount 700 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 900, 500_000_000), // 50% discount 800 slot diff
            (1_000_000_000, 50_000, 5_000, 1_000, 100, 1_000, 500_000_000), // 50% discount holds beyond 800 slot diff

            // default settings for different slot diffs, coefficient = 0.00004500, bounds [10%, 50%]
            (1_000_000_000, 4500, 5_000, 1_000, 100, 100, 900_000_000), // current slot is the same as last slot
            (1_000_000_000, 4500, 5_000, 1_000, 100, 101, 899_955_000), // current slot is one more than last slot
            (1_000_000_000, 4500, 5_000, 1_000, 100, 150, 897_750_000), // current slot is 50 more than last slot
            (1_000_000_000, 4500, 5_000, 1_000, 100, 200, 895_500_000), // current slot is 100 more than last slot
            (1_000_000_000, 4500, 5_000, 1_000, 100, 8_988, 500_040_000), // current slot is almost max slots
            (1_000_000_000, 4500, 5_000, 1_000, 100, 8_989, 500_000_000), // current slot is just passed max slots and capped at max
            (1_000_000_000, 4500, 5_000, 1_000, 100, 10_000, 500_000_000), // current slot is well beyond max slots and capped at max

            // edge cases
            (1_000_000_000, 0, 5_000, 1_000, 100, 200, 900_000_000), // min coefficient bounded at min discount
            (1_000_000_000, 100_000_000, 5_000, 1_000, 100, 200, 500_000_000), // max coefficient bounded at max discount
            (0, 4_500, 5_000, 1_000, 100, 200, 0), // zero swap rate

        ] {
            let oracle_price_data = OraclePriceData {
                swap_rate,
                timestamp: 0,
                signature: "unused".to_string(),
            };
            let conversion_rate = calculate_conversion_rate(
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


    #[test]
    fn test_calculate_conversion_rate_error() {
        for (swap_rate, coefficient, max_discount_rate, min_discount_rate, s_last, s_now) in [
            (1_000_000_000, 4_500, 5_000, 1_000, 200, 100), // invalid slot diff, s_last > s_now
        ] {
            let oracle_price_data = OraclePriceData {
                swap_rate,
                timestamp: 0,
                signature: "unused".to_string(),
            };
            let conversion_rate = calculate_conversion_rate(
                oracle_price_data,
                coefficient,
                max_discount_rate,
                min_discount_rate,
                s_last,
                s_now,
            );
            assert!(conversion_rate.is_none());
        }
    }
    
    #[test]
    #[should_panic]
    fn test_calculate_conversion_rate_panic() {
        for (swap_rate, coefficient, max_discount_rate, min_discount_rate, s_last, s_now) in [
            (u64::MAX, 4_500, 5_000, 1_000, 100, 200), // invalid oracle swap rate
            (1_000_000_000, u64::MAX, 5_000, 1_000, 100, 200), // invalid coefficient
            (1_000_000_000, 4_500, u64::MAX, 1_000, 100, 200), // invalid max discount rate
            (1_000_000_000, 4_500, 5_000, u64::MAX, 100, 200), // invalid min discount rate
            (1_000_000_000, 4_500, u64::MAX, u64::MAX, 100, 200), // invalid discount rates
            (1_000_000_000, 4_500, 5_000, 1_000, u64::MAX, 200), // invalid start slot
            (1_000_000_000, 4_500, 5_000, 1_000, 100, u64::MAX), // invalid start slot
            (1_000_000_000, 4_500, 5_000, 1_000, u64::MAX, u64::MAX), // invalid slots
        ] {
            let oracle_price_data = OraclePriceData {
                swap_rate,
                timestamp: 0,
                signature: "unused".to_string(),
            };
            let conversion_rate = calculate_conversion_rate(
                oracle_price_data,
                coefficient,
                max_discount_rate,
                min_discount_rate,
                s_last,
                s_now,
            );
            assert!(conversion_rate.is_none());
        }
    }
}