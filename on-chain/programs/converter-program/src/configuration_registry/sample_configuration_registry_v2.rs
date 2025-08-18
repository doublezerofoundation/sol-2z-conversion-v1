use crate::{
    common::{constant::MAX_AUTHORIZED_DEQUEUERS, error::DoubleZeroError},
    configuration_registry::update_configuration::ConfigurationRegistryInput,
};
use anchor_lang::prelude::*;

// Sample Struct demonstrating the upgrades
#[account]
#[derive(InitSpace, Debug)]
pub struct ConfigurationRegistryV2 {
    pub price_oracle_pubkey: Pubkey, // we rename this field
    // pub sol_quantity: u64, // we remove this field
    pub price_maximum_age: i64,
    #[max_len(MAX_AUTHORIZED_DEQUEUERS)]
    pub authorized_dequeuers: Vec<Pubkey>,
    pub coefficient: u64, 
    pub max_discount_rate: u64,
    pub min_discount_rate: u64,
    pub sol_amount: u64, // we add new field
}

// Implement methods if needed