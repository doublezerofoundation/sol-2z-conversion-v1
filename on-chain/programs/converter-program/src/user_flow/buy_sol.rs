use anchor_lang::{
    prelude::*,
    solana_program::{
        native_token::LAMPORTS_PER_SOL,
        hash::hash,
        instruction::Instruction,
        program::invoke
    }
};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        utils::attestation_utils::verify_attestation,
        events::{
            trade::{TradeEvent, BidTooLowEvent},
            system::{AccessByDeniedPerson, AccessDuringSystemHalt}
        },
        structs::OraclePriceData,
    },
    state::{
        trade_registry::TradeRegistry,
        program_state::ProgramStateAccount
    },
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry,
    fills_registry::fills_registry::FillsRegistry,
    discount_rate::calculate_ask_price::calculate_conversion_rate_with_oracle_price_data
};

#[derive(Accounts)]
pub struct BuySol<'info> {
    #[account(
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump = program_state.bump_registry.configuration_registry_bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
    #[account(
        mut,
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
        bump = program_state.bump_registry.fills_registry_bump,
    )]
    pub fills_registry: Account<'info, FillsRegistry>,
    #[account(
        mut,
        seeds = [SeedPrefixes::TradeRegistry.as_bytes()],
        bump = program_state.bump_registry.trade_registry_bump,
    )]
    pub trade_registry: Account<'info, TradeRegistry>,
    #[account(
        mut,
        token::mint = double_zero_mint,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
    #[account(
        mut,
        token::mint = double_zero_mint,
    )]
    pub protocol_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub double_zero_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    /// CHECK: program address - TODO: implement validations
    pub revenue_distribution_program: AccountInfo<'info>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

impl<'info> BuySol<'info> {
    pub fn process(
        &mut self,
        bid_price: u64,
        oracle_price_data: OraclePriceData
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
            &oracle_price_data,
            self.configuration_registry.oracle_pubkey,
            self.configuration_registry.price_maximum_age
        )?;

        let clock = Clock::get()?;

        let sol_quantity = self.configuration_registry.sol_quantity;
        // call util function to get current ask price
        let ask_price = calculate_conversion_rate_with_oracle_price_data(
            oracle_price_data,
            self.configuration_registry.coefficient,
            self.configuration_registry.max_discount_rate,
            self.configuration_registry.min_discount_rate,
            self.program_state.last_trade_slot,
            clock.slot
        )?;

        msg!("Ask Price {}", ask_price);
        msg!("Bid Price {}", bid_price);

        // Check if bid meets ask
        if bid_price < ask_price {
            emit!(BidTooLowEvent {
                sol_amount: sol_quantity,
                bid_amount: bid_price,
                ask_price,
                timestamp: clock.unix_timestamp,
                buyer: self.signer.key(),
                epoch: clock.epoch,
            });
            return err!(DoubleZeroError::BidTooLow);
        }

        let tokens_required = sol_quantity.checked_mul(bid_price)
            .ok_or(DoubleZeroError::ArithmeticError)?
            .checked_div(LAMPORTS_PER_SOL)
            .ok_or(DoubleZeroError::ArithmeticError)?;

        msg!("Tokens required {}", tokens_required);

        let cpi_program_id = self.revenue_distribution_program.key();

        let account_metas = vec![
            AccountMeta::new(self.vault_account.key(), false),
            AccountMeta::new(self.user_token_account.key(), false),
            AccountMeta::new(self.protocol_treasury_token_account.key(), false),
            AccountMeta::new(self.double_zero_mint.key(), false),
            AccountMeta::new_readonly(self.token_program.key(), false),
            AccountMeta::new_readonly(self.system_program.key(), false),
            AccountMeta::new(self.signer.key(), true),
        ];

        // call cpi for settlement
        let cpi_instruction =  b"global:buy_sol";
        let mut cpi_data = hash(cpi_instruction).to_bytes()[..8].to_vec();
        cpi_data = [
            cpi_data,
            tokens_required.to_le_bytes().to_vec(),
            sol_quantity.to_le_bytes().to_vec(),
        ].concat();

        let cpi_ix = Instruction {
            program_id: cpi_program_id,
            data: cpi_data,
            accounts: account_metas,
        };

        invoke(
            &cpi_ix,
            &[
                self.vault_account.to_account_info(),
                self.user_token_account.to_account_info(),
                self.protocol_treasury_token_account.to_account_info(),
                self.double_zero_mint.to_account_info(),
                self.signer.to_account_info(),
            ],
        )?;

        // Add it to fills registry
        self.fills_registry.add_fill_to_fills_registry(
            sol_quantity,
            tokens_required,
            clock.unix_timestamp,
            self.signer.key(),
            clock.epoch,
            self.configuration_registry.max_fills_storage as usize,
        )?;

        // Update the last trade slot
        self.program_state.last_trade_slot = clock.slot;

        msg!("Buy SOL is successful");
        emit!(TradeEvent {
            sol_amount: sol_quantity,
            token_amount: tokens_required,
            bid_price,
            timestamp: clock.unix_timestamp,
            buyer: self.signer.key(),
            epoch: clock.epoch,
        });

        // Adding it to Trade History
        self.trade_registry.update_trade_registry(
            clock.epoch,
            sol_quantity
        )?;
        Ok(())
    }
}