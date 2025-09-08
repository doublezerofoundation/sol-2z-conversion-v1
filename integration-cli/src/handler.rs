use clap::Parser;
use std::error::Error;
use crate::{
    command::Commands,
    core::{
        common::error::COMMAND_NOT_SPECIFIED
    }
};
use crate::core::function::dequeue_fills::dequeue_fills;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

pub async fn handle() -> Result<(), Box<dyn Error>> {
    let cli = Cli::parse();
    match cli.command {
        // Consume from fills Registry
        Some(Commands::DequeueFills { amount }) => {
            dequeue_fills(amount)?;
            Ok(())
        }

        None => {
            Err(Box::from(COMMAND_NOT_SPECIFIED))
        }
    }
}