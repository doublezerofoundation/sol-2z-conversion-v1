use anchor_lang::prelude::*;
use rust_decimal::{
    prelude::{FromPrimitive, ToPrimitive},
    Decimal,
};

use crate::{
    common::{constant::DECIMAL_PRECISION, errors::ConverterError},
    state::program_state::TradeHistory,
};

pub fn calculate_sol_demand(_trade_history: Vec<TradeHistory>) -> Result<u64> {
    // TODO: Implement the calculation of sol demand
    Ok(100_000)
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
        .ok_or(error!(ConverterError::InvalidSolDemand))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(ConverterError::InvalidDiscountRate))?,
        )
        .ok_or(error!(ConverterError::InvalidSolDemand))?;
    let steepness_decimal = Decimal::from_u64(steepness_bps)
        .ok_or(error!(ConverterError::InvalidSteepness))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(ConverterError::InvalidDiscountRate))?,
        )
        .ok_or(error!(ConverterError::InvalidSteepness))?;
    let max_discount_rate_decimal = Decimal::from_u64(max_discount_rate_bps)
        .ok_or(error!(ConverterError::InvalidMaxDiscountRate))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(ConverterError::InvalidDiscountRate))?,
        )
        .ok_or(error!(ConverterError::InvalidMaxDiscountRate))?;

    // (x * c)
    let exponent = sol_demand_decimal
        .checked_mul(steepness_decimal)
        .ok_or(error!(ConverterError::DiscountCalculationError))?;
    let exponent_f64 = exponent
        .to_f64()
        .ok_or(error!(ConverterError::DiscountCalculationError))?;

    // e^(-x * c)
    let decay = (-exponent_f64).exp();
    let decay_decimal =
        Decimal::from_f64(decay).ok_or(error!(ConverterError::DiscountCalculationError))?;

    // Dmax * e^(-x * c)
    let discount_rate_decimal = max_discount_rate_decimal
        .checked_mul(decay_decimal)
        .ok_or(error!(ConverterError::DiscountCalculationError))?;
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
    oracle_swap_rate_bps: u64,
    discount_rate: Decimal,
) -> Result<u64> {
    let oracle_swap_rate_decimal = Decimal::from_u64(oracle_swap_rate_bps)
        .ok_or(error!(ConverterError::InvalidOracleSwapRate))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(ConverterError::InvalidOracleSwapRate))?,
        )
        .ok_or(error!(ConverterError::InvalidOracleSwapRate))?;
    let sol_quantity_decimal = Decimal::from_u64(sol_quantity_bps)
        .ok_or(error!(ConverterError::InvalidSolQuantity))?
        .checked_div(
            Decimal::from_u64(DECIMAL_PRECISION)
                .ok_or(error!(ConverterError::InvalidSolQuantity))?,
        )
        .ok_or(error!(ConverterError::InvalidSolQuantity))?;
    let one_decimal = Decimal::from_u64(1).unwrap();

    // Calculate the ask price
    // P = Q * R
    let ask_price = sol_quantity_decimal
        .checked_mul(oracle_swap_rate_decimal)
        .ok_or(error!(ConverterError::InvalidAskPrice))?;

    // (1 - D)
    let discount_inverse_decimal = one_decimal
        .checked_sub(discount_rate)
        .ok_or(error!(ConverterError::InvalidDiscountRate))?;

    // Apply the discount rate
    // P * (1 - D)
    let ask_price = ask_price
        .checked_mul(discount_inverse_decimal)
        .ok_or(error!(ConverterError::InvalidAskPrice))?;

    // Convert to basis points
    let ask_price_u64 = ask_price
        .checked_mul(
            Decimal::from_u64(DECIMAL_PRECISION).ok_or(error!(ConverterError::InvalidAskPrice))?,
        )
        .ok_or(error!(ConverterError::InvalidAskPrice))?
        .to_u64()
        .ok_or(error!(ConverterError::InvalidAskPrice))?;

    Ok(ask_price_u64)
}

// #[derive(Debug, AnchorSerialize, AnchorDeserialize)]
// pub struct Attestation {
//     swap_rate: String,
//     timestamp: u64,
//     sol_price_usd: u64,
//     twoz_price_usd: u64,
//     cache_hit: bool,
//     signature: SignatureWrapper,
// }

// #[derive(Debug, AnchorSerialize, AnchorDeserialize)]
// pub struct SignatureWrapper {
//     pub signature: HashMap<String, u8>,
//     pub public_key: String,
// }
