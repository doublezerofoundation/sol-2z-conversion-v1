use anchor_client::{
    anchor_lang::prelude::*,
    solana_sdk::pubkey::Pubkey,
};

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct ConfigurationRegistryInput {
    pub oracle_pubkey: Option<Pubkey>,
    pub sol_quantity: Option<u64>,
    pub price_maximum_age: Option<i64>,
    pub coefficient: Option<u64>,
    pub max_discount_rate: Option<u64>,
    pub min_discount_rate: Option<u64>,
}
