use crate::{
    common::{constant::MAX_AUTHORIZED_DEQUEUERS, error::DoubleZeroError},
    configuration_registry::update_configuration::ConfigurationRegistryInput
};
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct ConfigurationRegistry {
    pub oracle_pubkey: Pubkey, // Public key of the swap oracle service
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: i64, // Maximum acceptable age for oracle price data
    pub max_fills_storage: u64, // Maximum number of fills to store
    #[max_len(MAX_AUTHORIZED_DEQUEUERS)]
    pub authorized_dequeuers: Vec<Pubkey>, // Contracts authorized to dequeue fills

    // Price calculation
    pub coefficient: u64, // Coefficient of the discount function in basis points (0 <= coefficient <= 10_000)
    pub max_discount_rate: u64, // Maximum discount rate in basis points (0 <= max_discount_rate <= 10_000)
    pub min_discount_rate: u64, // Minimum discount rate in basis points (0 <= min_discount_rate <= 10_000)
}

impl ConfigurationRegistry {
    pub fn initialize(
        &mut self,
        oracle_pubkey: Pubkey,
        sol_quantity: u64,
        slot_threshold: u64,
        price_maximum_age: i64,
        max_fills_storage: u64,
        coefficient: u64,
        max_discount_rate: u64,
        min_discount_rate: u64
    ) -> Result<()> {
        self.oracle_pubkey = oracle_pubkey;
        self.sol_quantity = sol_quantity;
        self.slot_threshold = slot_threshold;
        self.price_maximum_age = price_maximum_age;
        self.max_fills_storage = max_fills_storage;
        self.coefficient = coefficient;
        self.max_discount_rate = max_discount_rate;
        self.min_discount_rate = min_discount_rate;
        Ok(())
    }

    pub fn update(&mut self, input: ConfigurationRegistryInput) -> Result<()> {
        if let Some(oracle_pubkey) = input.oracle_pubkey {
            self.oracle_pubkey = oracle_pubkey;
        }
        if let Some(sol_quantity) = input.sol_quantity {
            self.sol_quantity = sol_quantity;
        }
        if let Some(slot_threshold) = input.slot_threshold {
            self.slot_threshold = slot_threshold;
        }
        if let Some(price_maximum_age) = input.price_maximum_age {
            self.price_maximum_age = price_maximum_age;
        }
        if let Some(max_fills_storage) = input.max_fills_storage {
            self.max_fills_storage = max_fills_storage;
        }
        if let Some(coefficient) = input.coefficient {
            self.coefficient = coefficient;
        }
        if let Some(max_discount_rate) = input.max_discount_rate {
            self.max_discount_rate = max_discount_rate;
        }
        if let Some(min_discount_rate) = input.min_discount_rate {
            self.min_discount_rate = min_discount_rate;
        }
        Ok(())
    }

    pub fn add_dequeuer(&mut self, new_pubkey: Pubkey) -> Result<bool> {

        // Add only if not already present
        if !self.authorized_dequeuers.contains(&new_pubkey) {
            // Enforce the maximum limit
            if self.authorized_dequeuers.len() as u64 >= MAX_AUTHORIZED_DEQUEUERS {
                return err!(DoubleZeroError::MaxAuthorizedDequeuersReached);
            }
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




