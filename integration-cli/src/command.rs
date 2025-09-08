use clap::Subcommand;

#[derive(Subcommand, Debug)]
pub enum Commands {
   
    /// Consumes from fills registry
    DequeueFills {
        #[arg(short = 'a', required = true)]
        amount: String,
    },
}