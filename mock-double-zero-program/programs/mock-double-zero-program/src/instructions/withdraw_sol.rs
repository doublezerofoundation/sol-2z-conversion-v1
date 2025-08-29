use anchor_lang::prelude::*;
use crate::instructions::config::Config;
use crate::instructions::revenue_distribution_journal::RevenueDistributionJournal;

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        seeds = [b"config"],
        bump,
    )]
    pub program_config_key: Account<'info, Config>,
    pub withdraw_sol_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"jour"],
        bump,
    )]
    pub journal: Account<'info, RevenueDistributionJournal>,
    #[account(mut)]
    pub sol_recipient: SystemAccount<'info>,
}
impl<'info> WithdrawSol<'info> {
    pub fn process(&mut self, amount_out: u64,) -> Result<()> {
        // Transfer SOL from journal
        self.journal.sub_lamports(amount_out)?;
        self.sol_recipient.add_lamports(amount_out)?;
        Ok(())
    }
}