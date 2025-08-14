use clap::Subcommand;

#[derive(Subcommand, Debug)]
pub enum Commands {
   
    /// Dequeue from fills Registry
    DequeueFills {
        #[arg(short = 'a', required = true)]
        amount: String,
    },
}