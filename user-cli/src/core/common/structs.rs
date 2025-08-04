use anchor_client::anchor_lang::prelude::*;
use serde::Deserialize;

#[derive(AnchorSerialize, AnchorDeserialize)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OraclePriceData {
    pub swap_rate: String,
    pub timestamp: u64,
    pub signature: String,
    // uncomment if needed
    // pub sol_price_usd: String,
    // pub twoz_price_usd: String,
}