use anchor_lang::{
    prelude::*
};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        events::dequeuer::FillsDequeuedEvent,
    },
    state::program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    fills_registry::fills_registry::FillsRegistry,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DequeueFillsResult {
    pub sol_dequeued: u64,
    pub token_2z_dequeued: u64,
    pub fills_consumed: u64
}

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
        seeds = [SeedPrefixes::FillsRegistry.as_bytes()],
        bump = program_state.bump_registry.fills_registry_bump,
    )]
    pub fills_registry: Account<'info, FillsRegistry>,
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

        let fills_registry = &mut self.fills_registry;

        let mut sol_dequeued = 0u64;
        let mut token_2z_dequeued = 0u64;
        let mut fills_consumed = 0u64;

        // Consume fills until max_sol_amount reached
        // TODO: Do refactoring.. below algorithm can be optimized.
        while !fills_registry.fills.is_empty()
            && sol_dequeued + fills_registry.fills[0].sol_in <= max_sol_amount {
                let fill = fills_registry.fills.remove(0);
                sol_dequeued += fill.sol_in;
                token_2z_dequeued += fill.token_2z_out;
                fills_consumed += 1;
        }

        // Update registry statistics
        fills_registry.total_sol_pending -= sol_dequeued;
        fills_registry.total_2z_pending -= token_2z_dequeued;
        fills_registry.lifetime_sol_processed += sol_dequeued;
        fills_registry.lifetime_2z_processed += token_2z_dequeued;

        emit!(FillsDequeuedEvent {
            requester: self.signer.key(),
            sol_dequeued,
            token_2z_dequeued,
            fills_consumed,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(DequeueFillsResult {
            sol_dequeued,
            token_2z_dequeued,
            fills_consumed,
        })
    }
}