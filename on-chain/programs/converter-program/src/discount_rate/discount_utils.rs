use anchor_lang::prelude::*;
use rust_decimal::{
    prelude::{FromPrimitive, ToPrimitive},
    Decimal,
};

use crate::{
    common::{constant::DECIMAL_PRECISION, error::DoubleZeroError},
    state::program_state::TradeHistory,
};

/// Calculate the sol demand
///
/// ### Arguments
/// * `trade_history` - The trade history
/// * `sol_quantity_bps` - The sol quantity in basis points
///
/// ### Returns
/// * `Result<u64>` - The sol demand in basis points
pub fn calculate_sol_demand(
    trade_history: &Vec<TradeHistory>,
    sol_quantity_bps: u64,
) -> Result<u64> {
    let mut sol_demand = 0;
    for trade in trade_history {
        sol_demand += trade.num_of_trades * sol_quantity_bps;
    }
    Ok(sol_demand)
}

/// Discount function
///
/// `D = Dmax * ( 1 / e ^ ( x * c ))`
///
/// Where:
/// - `D` is the discount rate
/// - `Dmax` is the maximum discount rate
/// - `x` is the sol demand
/// - `c` is the steepness of the discount function
///
/// ### Arguments
/// * `sol_demand` - The sol demand
///
/// ### Returns
/// * `Result<Decimal>` - The discount rate
pub fn calculate_discount_rate(
    sol_demand_bps: u64,
    steepness_bps: u64,
    max_discount_rate_bps: u64,
) -> Result<Decimal> {
    let sol_demand_decimal = Decimal::from_u64(sol_demand_bps)
        .ok_or(error!(DoubleZeroError::InvalidSolDemand))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidSolDemand))?;
    let steepness_decimal = Decimal::from_u64(steepness_bps)
        .ok_or(error!(DoubleZeroError::InvalidSteepness))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidSteepness))?;
    let max_discount_rate_decimal = Decimal::from_u64(max_discount_rate_bps)
        .ok_or(error!(DoubleZeroError::InvalidMaxDiscountRate))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidMaxDiscountRate))?;

    // Validate D_max is between 0 and 1
    if max_discount_rate_decimal > Decimal::from_u64(1).unwrap()
        || max_discount_rate_decimal < Decimal::from_u64(0).unwrap()
    {
        return Err(error!(DoubleZeroError::InvalidMaxDiscountRate));
    }

    // (x * c)
    let exponent = sol_demand_decimal
        .checked_mul(steepness_decimal)
        .ok_or(error!(DoubleZeroError::DiscountCalculationError))?;
    let exponent_f64 = exponent
        .to_f64()
        .ok_or(error!(DoubleZeroError::DiscountCalculationError))?;

    // e^(-x * c)
    let decay = (-exponent_f64).exp();
    let decay_decimal =
        Decimal::from_f64(decay).ok_or(error!(DoubleZeroError::DiscountCalculationError))?;

    // Dmax * e^(-x * c)
    let discount_rate_decimal = max_discount_rate_decimal
        .checked_mul(decay_decimal)
        .ok_or(error!(DoubleZeroError::DiscountCalculationError))?;
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
) -> Result<u64> {
    let oracle_swap_rate_decimal = Decimal::from_u64(oracle_swap_rate)
        .ok_or(error!(DoubleZeroError::InvalidOracleSwapRate))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
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
    let conversion_rate_u64 = coversion_rate
        .checked_mul(
            Decimal::from_u64(DECIMAL_PRECISION).ok_or(error!(DoubleZeroError::InvalidAskPrice))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?
        .to_u64()
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    msg!("Conversion rate u64: {}", conversion_rate_u64);
    Ok(conversion_rate_u64)
}

/// Calculate the ask price with the conversion rate
///
/// `P = Q * P_rate`
///
/// Where:
/// - `P` is the ask price
/// - `Q` is the sol quantity
/// - `P_rate` is the conversion rate
///
/// ### Arguments
/// * `conversion_rate` - The conversion rate
/// * `sol_quantity` - The sol quantity
///
/// ### Returns
/// * `Result<Decimal>` - The ask price
pub fn calculate_ask_price_with_conversion_rate(
    conversion_rate_bps: u64,
    sol_quantity: u64,
) -> Result<u64> {
    let conversion_rate_decimal =
        Decimal::from_u64(conversion_rate_bps).ok_or(error!(DoubleZeroError::InvalidConversionRate))?;
    let sol_quantity_decimal =
        Decimal::from_u64(sol_quantity).ok_or(error!(DoubleZeroError::InvalidSolQuantity))?;

    let ask_price = sol_quantity_decimal
        .checked_mul(conversion_rate_decimal)
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;
    let ask_price_u64 = ask_price
        .to_u64()
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    msg!("Ask price u64: {}", ask_price_u64);
    Ok(ask_price_u64)
}
