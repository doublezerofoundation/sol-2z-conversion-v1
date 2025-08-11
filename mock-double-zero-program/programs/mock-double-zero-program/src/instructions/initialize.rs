use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct InitializeAccounts<'info> {
    #[account(
        init,
        payer = signer,
        mint::decimals = 6,
        mint::authority = double_zero_mint.key(),
        mint::freeze_authority = double_zero_mint.key(),
        seeds = [b"double_zero_mint"],
        bump
    )]
    pub double_zero_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = signer,
        token::mint = double_zero_mint,
        token::authority = protocol_treasury_token_account,
        token::token_program = token_program,
        seeds = [b"protocol_treasury"],
        bump,
    )]
    pub protocol_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

impl<'info> InitializeAccounts<'info> {
    pub fn process(&mut self) -> Result<()> {
        // Transfer minimum amount to vault to initialize
        // Rent exempt the token buffer account
        let minimum_balance = self.rent.minimum_balance(0);

        let sol_transfer_ix = system_instruction::transfer(
            &self.signer.key(),
            &self.vault_account.key(),
            minimum_balance,
        );

        invoke(
            &sol_transfer_ix,
            &[self.signer.to_account_info(), self.vault_account.to_account_info()],
        )?;

        Ok(())
    }
}