use std::str::FromStr;

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
    trade_history: Vec<TradeHistory>,
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
#[allow(dead_code)]
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

/// Calculate the ask price with the discount rate
///
/// `P = Q * R * (1 - D)`
///
/// Where:
/// - `P` is the ask price
/// - `Q` is the sol quantity
/// - `R` is the oracle swap rate
/// - `D` is the discount rate
///
/// ### Arguments
/// * `sol_quantity` - The sol quantity
/// * `oracle_swap_rate` - The oracle swap rate
/// * `discount_rate` - The discount rate
///
/// ### Returns
/// * `Result<u64>` - The ask price in basis points
#[allow(dead_code)]
pub fn calculate_ask_price_with_discount(
    sol_quantity_bps: u64,
    oracle_swap_rate_string: String,
    discount_rate: Decimal,
) -> Result<u64> {
    let oracle_swap_rate_decimal = Decimal::from_str(&oracle_swap_rate_string)
        .map_err(|_| error!(DoubleZeroError::InvalidOracleSwapRate))?;
    let sol_quantity_decimal = Decimal::from_u64(sol_quantity_bps)
        .ok_or(error!(DoubleZeroError::InvalidSolQuantity))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(DoubleZeroError::InvalidSolQuantity))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidSolQuantity))?;
    let one_decimal = Decimal::from_u64(1).unwrap();

    // Calculate the ask price
    // P = Q * R
    let ask_price = sol_quantity_decimal
        .checked_mul(oracle_swap_rate_decimal)
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    // (1 - D)
    let discount_inverse_decimal = one_decimal
        .checked_sub(discount_rate)
        .ok_or(error!(DoubleZeroError::InvalidDiscountRate))?;

    // Apply the discount rate
    // P * (1 - D)
    let ask_price = ask_price
        .checked_mul(discount_inverse_decimal)
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    // Convert to basis points
    let ask_price_u64 = ask_price
        .checked_mul(
            Decimal::from_u64(DECIMAL_PRECISION).ok_or(error!(DoubleZeroError::InvalidAskPrice))?,
        )
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?
        .to_u64()
        .ok_or(error!(DoubleZeroError::InvalidAskPrice))?;

    Ok(ask_price_u64)
}
