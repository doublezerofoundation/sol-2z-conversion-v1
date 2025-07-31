use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct OraclePriceData {
    pub swap_rate: String,
    pub timestamp: u64,
    pub signature: String,
}