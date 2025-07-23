use crate::common::constant::MAX_AUTHORIZED_DEQUEUERS;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct ConfigurationRegistry {
    pub oracle_pubkey: Pubkey,      // Public key of the swap oracle service
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: u64,     // Maximum acceptable age for oracle price data
    pub max_fills_storage: u64,     // Maximum number of fills to store
    #[max_len(MAX_AUTHORIZED_DEQUEUERS)]
    pub authorized_dequeuers: Vec<Pubkey>, // Contracts authorized to dequeue fills
}