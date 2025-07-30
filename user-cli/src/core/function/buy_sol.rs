use std::error::Error;
use crate::core::config::UserConfig;
use crate::core::utils::price_utils::fetch_oracle_price;

pub async fn buy_sol(bid_price: String) -> Result<(), Box<dyn Error>> {
    let user_config = UserConfig::load_user_config()?;
    let oracle_price = fetch_oracle_price(user_config.price_oracle_end_point).await?;
    println!("Buying SOL for {}", bid_price);
    Ok(())
}