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

impl ConfigurationRegistry {
    pub fn initialize(
        &mut self,
        oracle_pubkey: Pubkey,
        sol_quantity: u64,
        slot_threshold: u64,
        price_maximum_age: u64,
        max_fills_storage: u64,
    ) -> Result<()> {
        self.oracle_pubkey = oracle_pubkey;
        self.sol_quantity = sol_quantity;
        self.slot_threshold = slot_threshold;
        self.price_maximum_age = price_maximum_age;
        self.max_fills_storage = max_fills_storage;
        Ok(())
    }

    pub fn add_dequeuer(&mut self,  new_pubkey: Pubkey) -> Result<bool> {
        // Add only if not already present
        if !self.authorized_dequeuers.contains(&new_pubkey) {
            self.authorized_dequeuers.push(new_pubkey);
            Ok(true)  // return true if added
        } else {
            Ok(false) // already present, no change
        }
    }

    pub fn remove_dequeuer(&mut self, remove_pubkey: Pubkey) -> Result<bool> {
        let before_len = self.authorized_dequeuers.len();
        self.authorized_dequeuers.retain(|pk| pk != &remove_pubkey);
        Ok(before_len != self.authorized_dequeuers.len()) // true if something was removed
    }

}