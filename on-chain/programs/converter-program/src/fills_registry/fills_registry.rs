use crate::common::{
    constant::MAX_FILLS_QUEUE_SIZE,
    error::DoubleZeroError
};
use anchor_lang::prelude::*;

#[account(zero_copy)]
pub struct FillsRegistry {
    pub total_sol_pending: u64,      // Total SOL in not dequeued fills
    pub total_2z_pending: u64,       // Total 2Z in not dequeued fills
    pub lifetime_sol_processed: u64, // Cumulative SOL processed
    pub lifetime_2z_processed: u64,  // Cumulative 2Z processed
    pub fills: [Fill; MAX_FILLS_QUEUE_SIZE],
    pub head: u64,   // index of oldest element
    pub tail: u64,   // index to insert next element
    pub count: u64,  // number of valid elements
}

#[zero_copy]
pub struct Fill {
    pub sol_in: u64,
    pub token_2z_out: u64
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DequeueFillsResult {
    pub sol_dequeued: u64,
    pub token_2z_dequeued: u64,
    pub fills_consumed: u64
}

impl FillsRegistry {
    pub fn add_trade_to_fills_registry(
        &mut self,
        sol_in: u64,
        token_2z_out: u64,
    ) -> Result<()> {
        // Add it to fills registry
        let fill = Fill {
            sol_in,
            token_2z_out,
        };

        self.enqueue(fill)?;
        self.total_sol_pending += sol_in;
        self.total_2z_pending += token_2z_out;
        Ok(())
    }

    pub fn dequeue_fills(
        &mut self,
        max_sol_amount: u64,
    ) -> Result<DequeueFillsResult> {
        let mut sol_dequeued = 0u64;
        let mut token_2z_dequeued = 0u64;
        let mut fills_consumed = 0u64;

        require!(!self.is_empty(), DoubleZeroError::EmptyFillsRegistry);

        // Consume fills until max_sol_amount reached
        while !self.is_empty() && sol_dequeued < max_sol_amount {
            let next_entry = self.peek()?;
            let remaining_sol_amount = max_sol_amount.checked_sub(sol_dequeued)
                .ok_or(DoubleZeroError::ArithmeticError)?;

            let dequeued_fill = if next_entry.sol_in <= remaining_sol_amount {
                // Full dequeue
                self.dequeue()?
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
                self.update_front(remainder_fill)?;

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
        self.total_sol_pending -= sol_dequeued;
        self.total_2z_pending -= token_2z_dequeued;
        self.lifetime_sol_processed += sol_dequeued;
        self.lifetime_2z_processed += token_2z_dequeued;

        Ok(DequeueFillsResult {
            sol_dequeued,
            token_2z_dequeued,
            fills_consumed,
        })
    }

}
