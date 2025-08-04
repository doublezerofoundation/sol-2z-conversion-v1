use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token_interface;
use anchor_spl::token_interface::{Mint, MintTo, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
pub struct Mint2Z<'info> {
    #[account(
        mut,
        token::mint = double_zero_mint,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"double_zero_mint"],
        bump
    )]
    pub double_zero_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>
}
impl<'info> Mint2Z<'info> {
    pub fn process(&mut self, amount_2z: u64, bump_mint: u8) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[b"double_zero_mint", &[bump_mint]]];
        let cpi_accounts = MintTo {
            mint: self.double_zero_mint.to_account_info(),
            to: self.user_token_account.to_account_info(),
            authority: self.double_zero_mint.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);
        token_interface::mint_to(cpi_context, amount_2z)?;
        Ok(())
    }
}