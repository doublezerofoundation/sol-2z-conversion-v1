use anchor_lang::prelude::*;
#[event]
pub struct ConfigChanged {
    pub changed_by: Pubkey,
    pub oracle_pubkey: Pubkey,
    pub sol_quantity: u64,
    pub price_maximum_age: i64,
    pub coefficient: u64,
    pub max_discount_rate: u64,
    pub min_discount_rate: u64,
}