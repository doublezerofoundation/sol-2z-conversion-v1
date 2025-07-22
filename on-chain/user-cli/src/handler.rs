use clap::Parser;
use std::error::Error;
use crate::{
    command::Commands,
    core::{
        error::COMMAND_NOT_SPECIFIED,
        function::{
            buy_sol::buy_sol,
            query_handler
        }
    }
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

        // Triggering SOL transaction
        Some(Commands::BuySol { bid_price }) => {
            buy_sol(bid_price)
        }

        // Displays SOL quantity available per transaction
        Some(Commands::GetQuantity) => {
            query_handler::get_quantity()
        }

        // Displays current 2Z-to-SOL conversion price
        Some(Commands::GetPrice) => {
            query_handler::get_price()
        }

        // Toggles system between active and paused states.
        None => {
            // println!("No command specified. Use --help for available commands.");
            Err(Box::from(COMMAND_NOT_SPECIFIED))
        }
    }
}
