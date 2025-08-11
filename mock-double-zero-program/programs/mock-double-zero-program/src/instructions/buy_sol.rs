use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token_interface;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
pub struct BuySol<'info> {
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
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
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
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub signer: Signer<'info>,
}
impl<'info> BuySol<'info> {
    pub fn process(&mut self, amount_2z: u64, amount_sol: u64, vault_bump: u8) -> Result<()> {
        // Transfer 2Z from signer
        let cpi_accounts = TransferChecked {
            mint: self.double_zero_mint.to_account_info(),
            from: self.user_token_account.to_account_info(),
            to: self.protocol_treasury_token_account.to_account_info(),
            authority: self.signer.to_account_info(),
        };
        
        let cpi_program = self.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, amount_2z, 6)?;

        // Transfer SOL from vault
        let sol_transfer_ix = system_instruction::transfer(
            &self.vault_account.key(),
            &self.signer.key(),
            amount_sol,
        );

        invoke_signed(
            &sol_transfer_ix,
            &[
                self.signer.to_account_info(),
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