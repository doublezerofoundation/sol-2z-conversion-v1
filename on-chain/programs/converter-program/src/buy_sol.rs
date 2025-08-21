use anchor_lang::{
    prelude::*,
    solana_program::{
        native_token::LAMPORTS_PER_SOL,
        hash::hash,
        instruction::Instruction,
        program::invoke_signed
    }
};
use anchor_spl::token_interface;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::{
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        attestation_utils::verify_attestation,
        events::{
            trade::{TradeEvent, BidTooLowEvent},
            system::{AccessByDeniedPerson, AccessDuringSystemHalt}
        },
        structs::OraclePriceData,
    },
    program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::DenyListRegistry,
    fills_registry::fills_registry::{FillsRegistry, Fill},
    calculate_ask_price::calculate_conversion_rate_with_oracle_price_data
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
        constraint = fills_registry.key() == program_state.fills_registry_address
    )]
    pub fills_registry: AccountLoader<'info, FillsRegistry>,
    #[account(
        seeds = [SeedPrefixes::WithdrawAuthority.as_bytes()],
        bump = program_state.bump_registry.withdraw_authority_bump,
    )]
    pub withdraw_authority: SystemAccount<'info>,
    #[account(
        mut,
        token::mint = double_zero_mint,
        constraint = user_token_account.owner == signer.key()
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
    #[account(
        mut,
        token::mint = double_zero_mint,
    )]
    pub protocol_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: program address - TODO: implement address validations
    #[account(mut)]
    pub double_zero_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: program address - TODO: implement address validations
    #[account(mut)]
    pub config_account: AccountInfo<'info>,
    /// CHECK: program address - TODO: implement address validations
    #[account(mut)]
    pub revenue_distribution_journal: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    /// CHECK: program address - TODO: implement address validations
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

        // Restricting only trade once per slot.
        let clock = Clock::get()?;
        require!(
            clock.slot > self.program_state.last_trade_slot,
            DoubleZeroError::SingleTradePerSlot
        );

        // checking attestation
        verify_attestation(
            &oracle_price_data,
            self.configuration_registry.oracle_pubkey,
            self.configuration_registry.price_maximum_age
        )?;

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

        // Transfer 2Z from signer
        let cpi_accounts = TransferChecked {
            mint: self.double_zero_mint.to_account_info(),
            from: self.user_token_account.to_account_info(),
            to: self.protocol_treasury_token_account.to_account_info(),
            authority: self.signer.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, tokens_required, 6)?;

        // Does cpi calls to withdraw sol and transfer it to signer
        let cpi_program_id = self.revenue_distribution_program.key();

        let account_metas = vec![
            AccountMeta::new(self.config_account.key(), false),
            AccountMeta::new_readonly(self.withdraw_authority.key(), true),
            AccountMeta::new(self.revenue_distribution_journal.key(), false),
            AccountMeta::new(self.signer.key(), false),
            AccountMeta::new(self.vault_account.key(), false),
            AccountMeta::new_readonly(self.system_program.key(), false)
        ];

        // call cpi for sol withdrawal
        let cpi_instruction =  b"global:withdraw_sol"; //TODO: need to change to "dz::ix::withdraw_sol"
        let mut cpi_data = hash(cpi_instruction).to_bytes()[..8].to_vec();
        cpi_data = [
            cpi_data,
            sol_quantity.to_le_bytes().to_vec(),
        ].concat();

        let cpi_ix = Instruction {
            program_id: cpi_program_id,
            data: cpi_data,
            accounts: account_metas,
        };

        invoke_signed(
            &cpi_ix,
            &[
                self.config_account.to_account_info(),
                self.withdraw_authority.to_account_info(),
                self.revenue_distribution_journal.to_account_info(),
                self.signer.to_account_info(),
                self.vault_account.to_account_info(),
            ],
            &[&[
                SeedPrefixes::WithdrawAuthority.as_bytes(),
                &[self.program_state.bump_registry.withdraw_authority_bump],
            ]],
        )?;

        // Add it to fills registry
        let fills_registry = &mut self.fills_registry.load_mut()?;
        let fill = Fill {
            sol_in: sol_quantity,
            token_2z_out: tokens_required,
        };
        fills_registry.enqueue(fill)?;
        fills_registry.total_sol_pending += sol_quantity;
        fills_registry.total_2z_pending += tokens_required;

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

        Ok(())
    }
}