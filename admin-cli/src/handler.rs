use std::error::Error;

use clap::Parser;
use cli_common::common_functions::view_fills::view_fills_registry;
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
            set_fills_consumer,
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
        Some(Commands::ToggleSystemState { activate, pause}) => {
            system_state::toggle_system_state(activate, pause)
        }

        Some(Commands::SetFillsConsumer { fills_consumer}) => {
            set_fills_consumer::change_fills_consumer(&fills_consumer)
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

        // Setting the deny list authority of the system
        Some(Commands::SetDenyAuthority { authority }) => {
            admin_handler::set_deny_authority(authority)
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

        // Mock journal airdrop
        Some(Commands::AirdropToMockJournal {  amount }) => {
            mock_token_handler::airdrop_journal(amount)
        }

        // View Fills Registry
        Some(Commands::ViewFills) => {
            view_fills_registry()
        }

        None => {
            // println!("No command specified. Use --help for available commands.");
            Err(Box::from(COMMAND_NOT_SPECIFIED))
        }
    }
}