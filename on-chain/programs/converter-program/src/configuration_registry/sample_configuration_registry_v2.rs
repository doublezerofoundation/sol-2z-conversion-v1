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

impl ConfigurationRegistryV2 {
    pub fn initialize(
        &mut self,
        oracle_pubkey: Pubkey,
        sol_quantity: u64,
        price_maximum_age: i64,
        coefficient: u64,
        max_discount_rate: u64,
        min_discount_rate: u64,
    ) -> Result<()> {
        // Validate D_max is between 0 and 1 and D_max is greater than D_min
        if max_discount_rate > 10000 || max_discount_rate < min_discount_rate {
            return Err(error!(DoubleZeroError::InvalidMaxDiscountRate));
        }

        // Validate D_min is between 0 and D_max
        if min_discount_rate > max_discount_rate {
            return Err(error!(DoubleZeroError::InvalidMinDiscountRate));
        }

        self.price_oracle_pubkey = oracle_pubkey;
        self.sol_amount = sol_quantity;
        self.price_maximum_age = price_maximum_age;
        self.coefficient = coefficient;
        self.max_discount_rate = max_discount_rate;
        self.min_discount_rate = min_discount_rate;
        Ok(())
    }

    pub fn update(&mut self, input: ConfigurationRegistryInput) -> Result<()> {
        if let Some(oracle_pubkey) = input.oracle_pubkey {
            self.price_oracle_pubkey = oracle_pubkey;
        }
        if let Some(sol_quantity) = input.sol_quantity {
            self.sol_amount = sol_quantity;
        }
        if let Some(price_maximum_age) = input.price_maximum_age {
            self.price_maximum_age = price_maximum_age;
        }
        if let Some(coefficient) = input.coefficient {
            self.coefficient = coefficient;
        }
        if let Some(max_discount_rate) = input.max_discount_rate {
            if max_discount_rate > 10000 || max_discount_rate < self.min_discount_rate {
                return Err(error!(DoubleZeroError::InvalidMaxDiscountRate));
            }
            self.max_discount_rate = max_discount_rate;
        }
        if let Some(min_discount_rate) = input.min_discount_rate {
            if min_discount_rate > self.max_discount_rate {
                return Err(error!(DoubleZeroError::InvalidMinDiscountRate));
            }
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
            Ok(true) // return true if added
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
