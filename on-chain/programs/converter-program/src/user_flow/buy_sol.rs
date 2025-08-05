use anchor_lang::{
    prelude::*,
    solana_program::native_token::LAMPORTS_PER_SOL,
};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        utils::attestation_utils::verify_attestation,
        constant::TOKEN_DECIMALS,
        events::{
            trade::{TradeEvent, BidTooLowEvent},
            system::{AccessByDeniedPerson, AccessDuringSystemHalt}
        }
    },
    state::program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry,
    fills_registry::fills_registry::{Fill, FillsRegistry}
};
use mock_transfer_program::{
    cpi::{
        buy_sol as mock_buy_sol,
        accounts::BuySol as BuySolCpi
    },
    program::MockTransferProgram
};

#[derive(Accounts)]
pub struct BuySol<'info> {
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
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump = program_state.bump_registry.deny_list_registry_bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,
    #[account(
        mut,
        seeds = [SeedPrefixes::FillsRegistry.as_bytes()],
        bump,
    )]
    pub fills_registry: Account<'info, FillsRegistry>,
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
    #[account(mut)]
    pub protocol_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    pub double_zero_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub transfer_program: Program<'info, MockTransferProgram>,
    #[account(mut)]
    pub signer: Signer<'info>
}

impl<'info> BuySol<'info> {
    pub fn process(
        &mut self,
        bid_price: u64,
        swap_rate: String,
        timestamp: i64,
        signature: String
    ) -> Result<()> {

        // System Halt validation
        if self.program_state.is_halted {
            emit!(AccessDuringSystemHalt { accessed_by: self.signer.key() });
            return err!(DoubleZeroError::SystemIsHalted);
        }

        // Checking whether address is inside the deny list
        let signer_key = self.signer.key;
        if self.deny_list_registry.denied_addresses.contains(signer_key) {
            emit!(AccessByDeniedPerson { accessed_by: self.signer.key() });
            return err!(DoubleZeroError::UserInsideDenyList);
        }

        // checking attestation
        verify_attestation(
            swap_rate,
            timestamp,
            signature,
            self.configuration_registry.oracle_pubkey,
            self.configuration_registry.price_maximum_age
        )?;

        // call util function to get current ask price
        let ask_price = 21 * TOKEN_DECIMALS;
        let sol_quantity = 21 * LAMPORTS_PER_SOL;
        let tokens_required = 21 * TOKEN_DECIMALS;

        let clock = Clock::get()?;

        // Check if bid meets ask
        if bid_price < ask_price {
            emit!(BidTooLowEvent {
                sol_amount: sol_quantity,
                bid_amount: tokens_required,
                ask_price,
                timestamp: clock.unix_timestamp,
                buyer: self.signer.key(),
                epoch: clock.epoch,
            })
        }
        require!(bid_price >= ask_price, DoubleZeroError::BidTooLow);

        let cpi_accounts = BuySolCpi {
            vault_account: self.vault_account.to_account_info(),
            user_token_account: self.user_token_account.to_account_info(),
            protocol_treasury_token_account: self.protocol_treasury_token_account.to_account_info(),
            double_zero_mint: self.double_zero_mint.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            signer: self.signer.to_account_info(),
        };

        let cpi_program = self.transfer_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        // settlement
        mock_buy_sol(
            cpi_context,
            tokens_required,
            sol_quantity,
        )?;
        
        // Add it to fills registry
        let fill = Fill {
            sol_in: sol_quantity,
            token_2z_out: tokens_required,
            timestamp: clock.unix_timestamp,
            buyer: self.signer.key(),
            epoch: clock.epoch,
        };

        // Check storage limits
        let maximum_fills_storage = self.configuration_registry.max_fills_storage as usize;
        if self.fills_registry.fills.len() > maximum_fills_storage {
            // Remove the oldest fill
            self.fills_registry.fills.remove(0);
        }

        // Update fills registry
        self.fills_registry.fills.push(fill);
        self.fills_registry.total_sol_pending += sol_quantity;
        self.fills_registry.total_2z_pending += tokens_required;

        msg!("Buy SOL is successful");
        emit!(TradeEvent {
            sol_amount: sol_quantity,
            token_amount: tokens_required,
            timestamp: clock.unix_timestamp,
            buyer: self.signer.key(),
            epoch: clock.epoch,
        });
        Ok(())
    }
}