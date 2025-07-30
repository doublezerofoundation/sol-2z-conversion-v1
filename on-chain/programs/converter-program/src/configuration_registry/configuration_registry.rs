use crate::{
    common::{constant::MAX_AUTHORIZED_DEQUEUERS, errors::ConverterError, seeds::seed_prefixes::SeedPrefixes},
    deny_list_registry::deny_list_registry::DenyListRegistry,
    state::program_state::ProgramStateAccount,
};
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct ConfigurationRegistry {
    pub oracle_pubkey: Pubkey, // Public key of the swap oracle service
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: u64, // Maximum acceptable age for oracle price data
    pub max_fills_storage: u64, // Maximum number of fills to store
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
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ConfigurationRegistryInput {
    pub oracle_pubkey: Option<Pubkey>,
    pub sol_quantity: Option<u64>,
    pub slot_threshold: Option<u64>,
    pub price_maximum_age: Option<u64>,
    pub max_fills_storage: Option<u64>,
}

#[derive(Accounts)]
pub struct ConfigurationRegistryUpdate<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

impl<'info> ConfigurationRegistryUpdate<'info> {
    pub fn process_update(&mut self, input: ConfigurationRegistryInput) -> Result<()> {
        // Authentication and authorization
        if self.program_state.admin != self.authority.key() {
            return err!(ConverterError::UnauthorizedUser);
        }
        if self.deny_list_registry.denied_addresses.contains(self.authority.key) {
            return err!(ConverterError::DenyListedUser);
        }

        self.configuration_registry.update(input)
    }
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