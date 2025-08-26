use anchor_lang::{
    prelude::*
};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        events::fill_consumer::FillsDequeued,
        constant::MAX_FILLS_QUEUE_SIZE
    },
    program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    fills_registry::fills_registry::{
        FillsRegistry,
        DequeueFillsResult,
        Fill
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

        require!(max_sol_amount > 0, DoubleZeroError::InvalidMaxSolAmount);
        
        let fills_registry = &mut self.fills_registry.load_mut()?;
        
        // Dequeue fills.
        let mut sol_dequeued = 0u64;
        let mut token_2z_dequeued = 0u64;
        let mut fills_consumed = 0u64;

        require!(fills_registry.count > 0, DoubleZeroError::EmptyFillsRegistry);

        // Consume fills until max_sol_amount reached.
        while fills_registry.count > 0 && sol_dequeued < max_sol_amount {
            let head_index = fills_registry.head as usize;
            let next_entry = &fills_registry.fills[head_index];
            let remaining_sol = max_sol_amount - sol_dequeued; // safe, can't underflow

            let dequeued_fill = if next_entry.sol_in <= remaining_sol {
                // Full dequeue.
                let fill = *next_entry; // copy the entire fill
                fills_registry.head = (fills_registry.head + 1) % MAX_FILLS_QUEUE_SIZE as u64;
                fills_registry.count -= 1;
                fill
            } else {
                // Partial dequeue.
                let token_2z_dequeued = next_entry.token_2z_out
                    .checked_mul(remaining_sol)
                    .ok_or(DoubleZeroError::ArithmeticError)?
                    .checked_div(next_entry.sol_in)
                    .ok_or(DoubleZeroError::ArithmeticError)?;

                // Updated remainder fill.
                fills_registry.fills[head_index] = Fill {
                    sol_in: next_entry.sol_in - remaining_sol,
                    token_2z_out: next_entry.token_2z_out - token_2z_dequeued
                };

                Fill {
                    sol_in: remaining_sol,
                    token_2z_out: token_2z_dequeued,
                }
            };

            sol_dequeued += dequeued_fill.sol_in;
            token_2z_dequeued += dequeued_fill.token_2z_out;
            fills_consumed += 1;
        }

        // Update registry statistics.
        fills_registry.total_sol_pending = fills_registry.total_sol_pending
            .checked_sub(sol_dequeued)
            .ok_or(DoubleZeroError::ArithmeticError)?;

        fills_registry.total_2z_pending = fills_registry.total_2z_pending
            .checked_sub(token_2z_dequeued)
            .ok_or(DoubleZeroError::ArithmeticError)?;

        fills_registry.lifetime_sol_processed = fills_registry.lifetime_sol_processed
            .checked_add(sol_dequeued)
            .ok_or(DoubleZeroError::ArithmeticError)?;

        fills_registry.lifetime_2z_processed = fills_registry.lifetime_2z_processed
            .checked_add(token_2z_dequeued)
            .ok_or(DoubleZeroError::ArithmeticError)?;

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