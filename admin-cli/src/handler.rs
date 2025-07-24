use clap::Parser;
use crate::command::Commands;
use std::error::Error;
use crate::core::functions::{config_handler, init_handler, system_state, withdraw_2z};
use crate::core::common::error::COMMAND_NOT_SPECIFIED;

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

        // Toggles system between active and paused states.
        None => {
            // println!("No command specified. Use --help for available commands.");
            Err(Box::from(COMMAND_NOT_SPECIFIED))
        }
    }
}
