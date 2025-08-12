use anchor_lang::prelude::*;
use rust_decimal::{
    prelude::FromPrimitive,
    Decimal,
};

use crate::common::{
        constant::{DECIMAL_PRECISION, TOKEN_DECIMALS},
        error::DoubleZeroError,
    };

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
pub fn calculate_discount_rate(
    coefficient: u64,
    max_discount_rate_bps: u64,
    min_discount_rate_bps: u64,
    s_last: u64,
    s_now: u64,
) -> Result<Decimal> {
    // Convert coefficient to decimal
    // γ = coefficient / 100000000
    // 0 <= γ <= 100
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
pub fn calculate_conversion_rate_with_discount(
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
    let coversion_rate = oracle_swap_rate_decimal
        .checked_mul(discount_inverse_decimal)
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    msg!("Conversion rate: {}", coversion_rate);

    // Convert to basis points
    Ok(coversion_rate)
}
