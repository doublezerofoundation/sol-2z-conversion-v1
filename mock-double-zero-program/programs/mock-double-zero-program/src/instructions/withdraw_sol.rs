use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use solana_system_interface::instruction::transfer;
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
    pub system_program: Program<'info, System>,
}
impl<'info> WithdrawSol<'info> {
    pub fn process(&mut self, amount_out: u64, jour_bump: u8) -> Result<()> {
        // Transfer SOL from journal
        let sol_transfer_ix = transfer(
            &self.journal.key(),
            &self.sol_recipient.key(),
            amount_out,
        );

        invoke_signed(
            &sol_transfer_ix,
            &[
                self.sol_recipient.to_account_info(),
                self.journal.to_account_info(),
            ],
            &[&[
                b"jour",
                &[jour_bump],
            ]],
        )?;
        Ok(())
    }
}