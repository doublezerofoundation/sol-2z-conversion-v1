use anchor_lang::prelude::*;
use anchor_spl::token_interface;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
pub struct Withdraw2Z<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>,
    #[account(
        mut,
        token::mint = double_zero_mint,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"protocol_treasury"],
        bump,
    )]
    pub protocol_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"double_zero_mint"],
        bump
    )]
    pub double_zero_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    #[account(mut)]
    pub signer: Signer<'info>,
}
impl<'info> Withdraw2Z<'info> {
    pub fn process(&mut self, amount: u64) -> Result<()> {
        let cpi_accounts = TransferChecked {
            mint: self.double_zero_mint.to_account_info(),
            from: self.protocol_treasury_token_account.to_account_info(),
            to: self.recipient_token_account.to_account_info(),
            authority: self.protocol_treasury_token_account.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, amount, 6)?;
        Ok(())
    }
}