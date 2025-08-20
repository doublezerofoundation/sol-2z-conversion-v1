use anchor_lang::{
    prelude::*
};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        events::dequeuer::FillsDequeuedEvent,
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
        
        let fills_registry = &mut self.fills_registry.load_mut()?;
        
        // Dequeue Fills
        let mut sol_dequeued = 0u64;
        let mut token_2z_dequeued = 0u64;
        let mut fills_consumed = 0u64;

        require!(!fills_registry.is_empty(), DoubleZeroError::EmptyFillsRegistry);

        // Consume fills until max_sol_amount reached
        while !fills_registry.is_empty() && sol_dequeued < max_sol_amount {
            let next_entry = fills_registry.peek()?;
            let remaining_sol_amount = max_sol_amount.checked_sub(sol_dequeued)
                .ok_or(DoubleZeroError::ArithmeticError)?;

            let dequeued_fill = if next_entry.sol_in <= remaining_sol_amount {
                // Full dequeue
                fills_registry.dequeue()?
            } else {
                // Partial dequeue
                let token_2z_dequeued = next_entry.token_2z_out
                    .checked_mul(remaining_sol_amount)
                    .ok_or(DoubleZeroError::ArithmeticError)?
                    .checked_div(next_entry.sol_in)
                    .ok_or(DoubleZeroError::ArithmeticError)?;

                // Updated Remainder Fill
                let remainder_fill = Fill {
                    sol_in: next_entry.sol_in.checked_sub(remaining_sol_amount)
                        .ok_or(DoubleZeroError::ArithmeticError)?,
                    token_2z_out: next_entry.token_2z_out.checked_sub(token_2z_dequeued)
                        .ok_or(DoubleZeroError::ArithmeticError)?,
                };
                fills_registry.update_front(remainder_fill)?;

                // Dequeued Fills
                let fill = Fill {
                    sol_in: remaining_sol_amount,
                    token_2z_out: token_2z_dequeued,
                };

                fill
            };

            sol_dequeued += dequeued_fill.sol_in;
            token_2z_dequeued += dequeued_fill.token_2z_out;
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

        emit!(FillsDequeuedEvent {
            requester: self.signer.key(),
            sol_dequeued: dequeue_fills_result.sol_dequeued,
            token_2z_dequeued: dequeue_fills_result.token_2z_dequeued,
            fills_consumed: dequeue_fills_result.fills_consumed,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(dequeue_fills_result)
    }
}