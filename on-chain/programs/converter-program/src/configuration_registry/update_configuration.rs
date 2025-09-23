use anchor_lang::prelude::*;
use crate::{
    configuration_registry::configuration_registry::ConfigurationRegistry,
    program_state::ProgramStateAccount,
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        events::config::ConfigChanged
    },
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ConfigurationRegistryInput {
    pub oracle_pubkey: Option<Pubkey>,
    pub sol_quantity: Option<u64>,
    pub price_maximum_age: Option<i64>, //in seconds
    pub coefficient: Option<u64>,
    pub max_discount_rate: Option<u64>,
    pub min_discount_rate: Option<u64>,
}

#[derive(Accounts)]
pub struct ConfigurationRegistryUpdate<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump = program_state.bump_registry.configuration_registry_bump
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    pub admin: Signer<'info>,
}

impl<'info> ConfigurationRegistryUpdate<'info> {
    pub fn process_update(&mut self, input: ConfigurationRegistryInput) -> Result<()> {
        require_keys_eq!(
            self.admin.key(),
            self.program_state.admin,
            DoubleZeroError::UnauthorizedAdmin
        );

        if let Some(oracle_pubkey) = input.oracle_pubkey {
            self.configuration_registry.oracle_pubkey = oracle_pubkey;
        }
        if let Some(sol_quantity) = input.sol_quantity {
            self.configuration_registry.sol_quantity = sol_quantity;
        }
        if let Some(price_maximum_age) = input.price_maximum_age {
            self.configuration_registry.price_maximum_age = price_maximum_age;
        }

        if let Some(coefficient) = input.coefficient {
            require!(coefficient <= 100_000_000, DoubleZeroError::InvalidCoefficient);
            self.configuration_registry.coefficient = coefficient;
        }

        if let Some(max_discount_rate) = input.max_discount_rate {
            require!(max_discount_rate <= 10_000, DoubleZeroError::InvalidMaxDiscountRate);

            let min_rate = input.min_discount_rate
                .unwrap_or(self.configuration_registry.min_discount_rate);

            require!(max_discount_rate > min_rate, DoubleZeroError::InvalidMaxDiscountRate);
            self.configuration_registry.max_discount_rate = max_discount_rate;
        }

        if let Some(min_discount_rate) = input.min_discount_rate {

            let max_rate = input.max_discount_rate
                .unwrap_or(self.configuration_registry.max_discount_rate);

            require!(min_discount_rate < max_rate, DoubleZeroError::InvalidMinDiscountRate);
            self.configuration_registry.min_discount_rate = min_discount_rate;
        }

        emit!(ConfigChanged {
            changed_by: self.admin.key(),
            oracle_pubkey: self.configuration_registry.oracle_pubkey,
            sol_quantity: self.configuration_registry.sol_quantity,
            price_maximum_age: self.configuration_registry.price_maximum_age,
            coefficient: self.configuration_registry.coefficient,
            max_discount_rate: self.configuration_registry.max_discount_rate,
            min_discount_rate: self.configuration_registry.min_discount_rate,
        });

        Ok(())
    }
}
