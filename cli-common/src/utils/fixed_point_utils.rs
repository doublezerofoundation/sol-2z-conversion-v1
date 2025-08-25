use std::{
    error::Error,
    str::FromStr
};
use anchor_client::solana_sdk::native_token::LAMPORTS_PER_SOL;
use rust_decimal::{
    Decimal,
    prelude::ToPrimitive
};
use crate::constant::TOKEN_DECIMALS;

pub fn parse_token_value(token_value: &String) -> Result<u64, Box<dyn Error>> {
    let token_multiplier = Decimal::from(TOKEN_DECIMALS);
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