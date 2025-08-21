use anchor_lang::{
    prelude::*
};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        events::dequeuer::FillsDequeued,
    },
    program_state::ProgramStateAccount,
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

        require!(
            self.signer.key() == self.configuration_registry.fills_consumer,
            DoubleZeroError::UnauthorizedFillConsumer
        );
        
        let fills_registry = &mut self.fills_registry.load_mut()?;
        
        // Dequeue Fills
        let mut sol_dequeued = 0u64;
        let mut token_2z_dequeued = 0u64;
        let mut fills_consumed = 0u64;

        // Consume fills until max_sol_amount reached
        while !fills_registry.is_empty() {
            let next_fill_amount = fills_registry.peek()?.sol_in;
            // Check if adding this fill would exceed max_sol_amount
            let new_total = sol_dequeued.checked_add(next_fill_amount)
                .ok_or(DoubleZeroError::ArithmeticError)?;

            if new_total > max_sol_amount { break; }

            let fill = fills_registry.dequeue()?;
            sol_dequeued += fill.sol_in;
            token_2z_dequeued += fill.token_2z_out;
            fills_consumed += 1;
        }

        // Update registry statistics
        fills_registry.total_sol_pending -= sol_dequeued;
        fills_registry.total_2z_pending -= token_2z_dequeued;
        fills_registry.lifetime_sol_processed += sol_dequeued;
        fills_registry.lifetime_2z_processed += token_2z_dequeued;

        let dequeue_fills_result = DequeueFillsResult {
            sol_dequeued,
            token_2z_dequeued,
            fills_consumed,
        };

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