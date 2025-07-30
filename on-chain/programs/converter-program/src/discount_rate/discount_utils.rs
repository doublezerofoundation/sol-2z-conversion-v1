use anchor_lang::prelude::*;
use rust_decimal::{prelude::FromPrimitive, Decimal};

use crate::{common::errors::ConverterError, state::program_state::TradeHistory};

pub fn calculate_sol_demand(_trade_history: Vec<TradeHistory>) -> Result<u64> {
    // TODO: Implement the calculation of sol demand
    Ok(100_000)
}

pub fn discount_function(x: u64) -> Result<Decimal> {
    let x_decimal = Decimal::from_u64(x).ok_or(error!(ConverterError::InvalidDiscountRate))?;

    // TODO: Implement the discount function
    let result = x_decimal;
    Ok(result)
}

#[allow(dead_code)]
pub fn calculate_discount_rate(sol_demand: u64) -> Result<Decimal> {
    // TODO: Implement the calculation of discount rate
    discount_function(sol_demand)
}

#[allow(dead_code)]
pub fn calculate_ask_price_with_discount(
    sol_quantity: u64,
    oracle_swap_rate: u64,
    discount_rate: u64,
) -> Result<u64> {
    let discount_rate_decimal = Decimal::from_u64(discount_rate).ok_or(error!(ConverterError::InvalidDiscountRate))?;
    let oracle_swap_rate_decimal = Decimal::from_u64(oracle_swap_rate).ok_or(error!(ConverterError::InvalidOracleSwapRate))?;
    let sol_quantity_decimal = Decimal::from_u64(sol_quantity).ok_or(error!(ConverterError::InvalidSolQuantity))?;
    let one_decimal = Decimal::from_u64(1).unwrap();

    // Calculate the ask price
    // Ask price = sol_quantity * oracle_swap_rate
    let ask_price = sol_quantity_decimal.checked_mul(oracle_swap_rate_decimal).ok_or(error!(ConverterError::InvalidAskPrice))?;
    // Apply the discount rate
    // Ask price = Ask price * (1 - discount_rate)
    let discount_inverse_decimal = one_decimal.checked_sub(discount_rate_decimal).ok_or(error!(ConverterError::InvalidDiscountRate))?;
    let ask_price = ask_price.checked_mul(discount_inverse_decimal).ok_or(error!(ConverterError::InvalidAskPrice))?;

    let ask_price_string = ask_price.to_string();
    let ask_price_u64 = ask_price_string.parse::<u64>().map_err(|_| error!(ConverterError::InvalidAskPrice))?;
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