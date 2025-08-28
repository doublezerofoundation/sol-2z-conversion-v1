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
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
impl<'info> WithdrawSol<'info> {
    pub fn process(&mut self, amount_out: u64, vault_bump: u8) -> Result<()> {
        // Transfer SOL from vault
        let sol_transfer_ix = transfer(
            &self.vault_account.key(),
            &self.sol_recipient.key(),
            amount_out,
        );

        invoke_signed(
            &sol_transfer_ix,
            &[
                self.sol_recipient.to_account_info(),
                self.vault_account.to_account_info(),
            ],
            &[&[
                b"vault",
                &[vault_bump],
            ]],
        )?;
        Ok(())
    }
}