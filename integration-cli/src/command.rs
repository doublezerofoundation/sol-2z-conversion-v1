use clap::Subcommand;

#[derive(Subcommand, Debug)]
pub enum Commands {
    // Add your commands here
    
    /// Retrieves current 2Z-to-SOL conversion price.
    GetPrice,

    /// Retrieves SOL quantity available per transaction (admin-configured parameter).
    GetQuantity,
}