use anchor_lang::{
    prelude::*
};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        events::dequeuer::FillsDequeued,
    },
    state::program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    fills_registry::fills_registry::{
        FillsRegistry,
        DequeueFillsResult
    },
};

#[derive(Accounts)]
pub struct DequeueFills<'info> {
    #[account(
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump = program_state.bump_registry.configuration_registry_bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(
        mut,
        constraint = fills_registry.key() == program_state.fills_registry_address
    )]
    pub fills_registry: AccountLoader<'info, FillsRegistry>,
    #[account(mut)]
    pub signer: Signer<'info>
}

impl<'info> DequeueFills<'info> {
    pub fn process(
        &mut self,
        max_sol_amount: u64,
    ) -> Result<DequeueFillsResult> {
        // Checking whether address is inside the authorized dequeuers
        let signer_key = self.signer.key;
        require!(
            self.configuration_registry.authorized_dequeuers.contains(signer_key),
            DoubleZeroError::UnauthorizedDequeuer
        );

        let dequeue_fills_result = self.fills_registry.load_mut()?.dequeue_fills(max_sol_amount)?;

        emit!(FillsDequeued {
            requester: self.signer.key(),
            sol_dequeued: dequeue_fills_result.sol_dequeued,
            token_2z_dequeued: dequeue_fills_result.token_2z_dequeued,
            fills_consumed: dequeue_fills_result.fills_consumed,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(dequeue_fills_result)
    }
}