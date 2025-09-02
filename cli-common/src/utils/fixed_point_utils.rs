use std::{
    error::Error,
    str::FromStr
};
use anchor_client::solana_sdk::native_token::LAMPORTS_PER_SOL;
use rust_decimal::{
    Decimal,
    prelude::ToPrimitive
};
use rust_decimal::prelude::FromPrimitive;
use crate::constant::TOKEN_UNITS;

pub fn parse_token_value(token_value: &String) -> Result<u64, Box<dyn Error>> {
    let token_multiplier = Decimal::from(TOKEN_UNITS);
    let amount_input = Decimal::from_str(token_value)?;
    let bid_price_parsed = (amount_input * token_multiplier).to_u64()
        .expect("Token value overflow or conversion failed");
    Ok(bid_price_parsed)
}

pub fn parse_sol_value(sol_value: &String) -> Result<u64, Box<dyn Error>> {
    let lamports_per_sol = Decimal::from(LAMPORTS_PER_SOL);
    let amount_input = Decimal::from_str(sol_value)?;
    let sol_value_parsed = (amount_input * lamports_per_sol).to_u64()
        .expect("Sol value overflow or conversion failed");
    Ok(sol_value_parsed)
}

pub fn convert_sol_value(sol_amount: u64) -> Decimal {
    let sol_in_lamports = Decimal::from_u64(sol_amount).expect("Invalid sol value");
    let lamports_per_sol = Decimal::from_u64(LAMPORTS_PER_SOL).unwrap();
    sol_in_lamports / lamports_per_sol
}

pub fn convert_token_value(token_amount: u64) -> Decimal {
    let with_decimals = Decimal::from_u64(token_amount).expect("Invalid sol value");
    let token_val = Decimal::from_u64(TOKEN_UNITS).unwrap();
    with_decimals / token_val
}