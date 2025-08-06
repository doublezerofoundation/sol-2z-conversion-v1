use clap::Subcommand;

#[derive(Subcommand, Debug)]
pub enum Commands {
    /**
    Initializes the system by creating the configuration registry, vault,
    protocol treasury, and program state account.Init, Change the configs of the system
    **/
    Init,
    /// Displays current configuration registry contents.
    ViewConfig,

    /// Updates configuration parameters using values from root directory config.json.
    UpdateConfig,

    /// View current system state.
    ViewSystemState,

    /// Toggles system between active and paused states.
    ToggleSystemState {
        /// Flag to activate
        #[arg(long, action, required = false)]
        activate: bool,

        /// Flag to pause
        #[arg(long, action, required = false)]
        pause: bool,
    },

    /// Withdrawing from protocol treasury to designated account
    WithdrawTokens {
        #[arg(short = 'a', long, required = true)]
        token_amount: String,

        #[arg(short = 't', long, required = true)]
        to_account: String,
    },

    /// Add a dequeuer address to the authorized list
    AddDequeuer {
        /// Address to add
        #[arg(short = 'a', long, required = true)]
        dequeuer: String,
    },

    /// Remove a dequeuer address from the authorized list
    RemoveDequeuer {
        /// Address to remove
        #[arg(short = 'a', long, required = true)]
        dequeuer: String,
    },    

    /// Adds an address to the deny list registry
    AddToDenyList {
        #[arg(short = 'a', required = true)]
        address: String,
    },

    /// Removes an address from the deny list registry
    RemoveFromDenyList {
        #[arg(short = 'a', required = true)]
        address: String,
    },

    /// Displays all addresses in the deny list registry
    ViewDenyList,

    /// Sets the admin of the system
    SetAdmin {
        #[arg(short = 'a', required = true)]
        admin: String,
    },
}