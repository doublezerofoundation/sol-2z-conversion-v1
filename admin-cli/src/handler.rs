use std::error::Error;

use clap::Parser;

use crate::{
    command::Commands,
    core::{
        common::error::COMMAND_NOT_SPECIFIED,
        functions::{
            admin_handler,
            config_handler,
            deny_list,
            init_handler,
            system_state,
            update_dequeuer_handler,
            withdraw_2z,
            mock_token_handler
        },
    },
};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

pub fn handle() -> Result<(), Box<dyn Error>> {
    let cli = Cli::parse();
    match cli.command {

        // Initializing the system
        Some(Commands::Init) => {
            init_handler::init()
        }

        // Displays current configuration registry contents.
        Some(Commands::ViewConfig) => {
            config_handler::view_config()
        }

        // Updates configuration parameters using values from root directory config.json.
        Some(Commands::UpdateConfig) => {
            config_handler::update_config()
        }

        // Viewing current system state
        Some(Commands::ViewSystemState) => {
            system_state::view_system_state()
        }

        // Changing system state between active and pause
        Some(Commands::ToggleSystemState { activate: active, pause}) => {
            system_state::toggle_system_state(active, pause)
        }

        // Withdrawing from protocol treasury to designated account
        Some(Commands::WithdrawTokens { token_amount, to_account }) => {
            withdraw_2z::withdraw_2z_tokens(token_amount, to_account)
        }

        Some(Commands::AddDequeuer { dequeuer }) => {
            update_dequeuer_handler::add_dequeuer(&dequeuer)
        }
        
        Some(Commands::RemoveDequeuer { dequeuer }) => {
            update_dequeuer_handler::remove_dequeuer(&dequeuer)
        }
                  
        // Adding an address to the deny list
        Some(Commands::AddToDenyList { address }) => {
            deny_list::add_to_deny_list(address)
        }

        // Removing an address from the deny list
        Some(Commands::RemoveFromDenyList { address }) => {
            deny_list::remove_from_deny_list(address)
        }

        // Viewing the deny list
        Some(Commands::ViewDenyList) => {
            deny_list::view_deny_list()
        }

        // Setting the admin of the system
        Some(Commands::SetAdmin { admin }) => {
            admin_handler::set_admin(admin)
        }

        // Initializing the mock transfer program
        Some(Commands::InitMockProgram) => {
            mock_token_handler::init()
        }

        // Mint Mock Tokens
        Some(Commands::MockTokenMint { to_address, amount }) => {
            mock_token_handler::mint(to_address, amount)
        }

        // Mint Mock Tokens to Protocol Treasury Token Account
        Some(Commands::MintToMockProtocolTreasury { amount }) => {
            mock_token_handler::mint_to_protocol_treasury_token_account(amount)
        }

        // Mock vault airdrop
        Some(Commands::AirdropToMockVault {  amount }) => {
            mock_token_handler::airdrop_vault(amount)
        }

        None => {
            // println!("No command specified. Use --help for available commands.");
            Err(Box::from(COMMAND_NOT_SPECIFIED))
        }
    }
}
