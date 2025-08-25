use anchor_lang::prelude::*;

// Sample Struct demonstrating the upgrades
#[account]
#[derive(InitSpace, Debug)]
pub struct ConfigurationRegistryV2 {
    pub price_oracle_pubkey: Pubkey, // we rename this field
    // pub sol_quantity: u64, // we remove this field
    pub price_maximum_age: i64,
    pub fills_consumer: Pubkey,
    pub coefficient: u64, 
    pub max_discount_rate: u64,
    pub min_discount_rate: u64,
    pub sol_amount: u64, // we add new field
}

// Implement methods if needed
