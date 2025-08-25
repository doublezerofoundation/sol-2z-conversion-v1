use clap::Parser;
use std::error::Error;
use cli_common::common_functions::view_fills::view_fills_registry;
use crate::{
    command::Commands,
    core::{
        function::{
            buy_sol::buy_sol,
            query_handler
        },
        common::error::COMMAND_NOT_SPECIFIED
    }
};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

pub async fn handle() -> Result<(), Box<dyn Error>> {
    let cli = Cli::parse();
    match cli.command {

        // Triggering SOL transaction.
        Some(Commands::BuySol { bid_price, from_address}) => {
            buy_sol(bid_price, from_address).await
        }

        // Displays SOL quantity available per transaction.
        Some(Commands::GetQuantity) => {
            query_handler::get_quantity()
        }

        // Displays current 2Z-to-SOL conversion price.
        Some(Commands::GetPrice) => {
            query_handler::get_price().await
        }

        // View Fills Registry.
        Some(Commands::GetFillsInfo) => {
            view_fills_registry()
        }

        // Toggles system between active and paused states.
        None => {
            // println!("No command specified. Use --help for available commands.");
            Err(Box::from(COMMAND_NOT_SPECIFIED))
        }
    }
}