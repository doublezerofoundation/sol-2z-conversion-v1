use clap::Parser;
use std::error::Error;
use crate::{
    command::Commands,
    core::{
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
        // Displays SOL quantity available per transaction
        Some(Commands::GetQuantity) => {
            println!("Get Quantity");
            Ok(())
        }

        // Displays current 2Z-to-SOL conversion price
        Some(Commands::GetPrice) => {
            println!("Get Price");
            Ok(())
        }

        // Toggles system between active and paused states.
        None => {
            // println!("No command specified. Use --help for available commands.");
            Err(Box::from(COMMAND_NOT_SPECIFIED))
        }
    }
}
