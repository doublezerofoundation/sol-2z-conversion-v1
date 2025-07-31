// Standard library
use std::error::Error;

// External crates
use anchor_client::solana_sdk::hash::hash;
// Internal modules
use crate::core::common::instruction::BUY_SOL_INSTRUCTION;
use crate::core::config::UserConfig;
use crate::core::utils::price_utils::fetch_oracle_price;

pub async fn buy_sol(bid_price: String) -> Result<(), Box<dyn Error>> {

    let user_config = UserConfig::load_user_config()?;
    let oracle_price_data = fetch_oracle_price(user_config.price_oracle_end_point).await?;
    let mut data_initialize = hash(BUY_SOL_INSTRUCTION).to_bytes()[..8].to_vec();
    data_initialize = [
        data_initialize,
        bid_price.as_bytes().to_vec(),
        oracle_price_data.swap_rate.as_bytes().to_vec(),
        oracle_price_data.timestamp.to_le_bytes().to_vec(),
        oracle_price_data.signature.as_bytes().to_vec(),
    ].concat();

    println!("Buying SOL for {}", bid_price);
    Ok(())
}