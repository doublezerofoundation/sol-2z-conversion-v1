use crate::instructions::revenue_distribution_journal::RevenueDistributionJournal;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::instructions::config::Config;

#[derive(Accounts)]
pub struct InitializeAccounts<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub program_config: Account<'info, Config>,
    #[account(
        init,
        payer = signer,
        space = 8 + RevenueDistributionJournal::INIT_SPACE,
        seeds = [b"jour"],
        bump,
    )]
    pub journal: Account<'info, RevenueDistributionJournal>,
    #[account(
        init,
        payer = signer,
        mint::decimals = 8,
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
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

impl<'info> InitializeAccounts<'info> {
    pub fn process(&mut self) -> Result<()> {
        Ok(())
    }
}