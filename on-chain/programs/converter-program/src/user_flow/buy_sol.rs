use anchor_lang::prelude::*;
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        utils::attestation_utils::verify_attestation
    },
    state::program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry
};
use crate::common::constant::TOKEN_DECIMALS;
use crate::common::events::trade::TradeEvent;
use crate::fills_registry::fills_registry::{Fill, FillsRegistry};

#[derive(Accounts)]
pub struct BuySol<'info> {
    #[account(
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
    #[account(
        mut,
        seeds = [SeedPrefixes::FillsRegistry.as_bytes()],
        bump,
    )]
    pub fills_registry: Account<'info, FillsRegistry>,
    #[account(mut)]
    pub signer: Signer<'info>
}

impl<'info> BuySol<'info> {
    pub fn process(
        &mut self,
        bid_price: u64,
        swap_rate: String,
        timestamp: i64,
        signature: String
    ) -> Result<()> {

        // Checking whether address is inside the deny list
        let signer_key = self.signer.key;
        require!(
            !self.deny_list_registry.denied_addresses.contains(signer_key),
            DoubleZeroError::UserInsideDenyList
        );

        // checking attestation
        verify_attestation(
            swap_rate,
            timestamp,
            signature,
            self.configuration_registry.oracle_pubkey,
            self.configuration_registry.price_maximum_age
        )?;

        // call util function to get current ask price
        let ask_price = 21 * TOKEN_DECIMALS;
        let sol_quantity = 21 * TOKEN_DECIMALS;
        let tokens_required = 21 * TOKEN_DECIMALS;
        // Check if bid meets ask
        require!(bid_price >= ask_price, DoubleZeroError::BidTooLow);

        // settlement

        let clock = Clock::get()?;

        // Add it to fills registry
        let fill = Fill {
            sol_in: sol_quantity,
            token_2z_out: tokens_required,
            timestamp: clock.unix_timestamp,
            buyer: self.signer.key(),
            epoch: clock.epoch,
        };

        // Check storage limits
        let maximum_fills_storage = self.configuration_registry.max_fills_storage as usize;
        if self.fills_registry.fills.len() > maximum_fills_storage {
            // Remove the oldest fill
            self.fills_registry.fills.remove(0);
        }

        // Update fills registry
        self.fills_registry.fills.push(fill);
        self.fills_registry.total_sol_pending += sol_quantity;
        self.fills_registry.total_2z_pending += tokens_required;


        msg!("Buy SOL is successful");
        emit!(TradeEvent {
            sol_amount: sol_quantity,
            token_amount: tokens_required,
            timestamp: clock.unix_timestamp,
            buyer: self.signer.key(),
            epoch: clock.epoch,
        });
        Ok(())
    }
}