use clap::Subcommand;

#[derive(Subcommand, Debug)]
pub enum Commands {
    /**
    Initiates SOL purchase.
    Trade executes at bid price if ask price ≤ bid price; otherwise cancels.
    **/
    BuySol {
        #[arg(short = 'p', long, required = true)]
        bid_price: String,

        #[arg(short = 'f')]
        from_address: Option<String>,
    },
    
    /// Retrieves current 2Z-to-SOL conversion price.
    GetPrice,

    /// Retrieves SOL quantity available per transaction (admin-configured parameter).
    GetQuantity,

    /// View Fills Registry, which tracks individual fill records and overall aggregate statistics
    ViewFills
}