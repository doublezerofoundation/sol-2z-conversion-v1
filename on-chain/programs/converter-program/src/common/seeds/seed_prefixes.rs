use crate::common::seeds::seed_prefix_current_versions::SeedPrefixVersions;

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixes {
    // SOLVault,
    // ProtocolTreasury,
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
    FillsRegistry,
}

impl SeedPrefixes {
    pub fn as_bytes(&self) -> &'static [u8] {
        // Use current versions by default
        let current_version = match self {
            // SeedPrefixes::SOLVault => SeedPrefixVersions::SOLVault,
            // SeedPrefixes::ProtocolTreasury => SeedPrefixVersions::ProtocolTreasury,
            SeedPrefixes::ConfigurationRegistry => SeedPrefixVersions::ConfigurationRegistry,
            SeedPrefixes::ProgramState => SeedPrefixVersions::ProgramState,
            SeedPrefixes::DenyListRegistry => SeedPrefixVersions::DenyListRegistry,
            SeedPrefixes::FillsRegistry => SeedPrefixVersions::FillsRegistry,
        };
        current_version.as_bytes()
    }
    
    // Note: will be implemented during migration ticket
    
    // pub fn version(&self) -> &'static str {
    //     let current_version = match self {
    //         SeedPrefixes::SOLVault => SeedPrefixVersions::SOLVault,
    //         SeedPrefixes::ProtocolTreasury => SeedPrefixVersions::ProtocolTreasury,
    //         SeedPrefixes::ConfigurationRegistry => SeedPrefixVersions::ConfigurationRegistry,
    //         SeedPrefixes::ProgramState => SeedPrefixVersions::ProgramState,
    //         SeedPrefixes::DenyListRegistry => SeedPrefixVersions::DenyListRegistry,
    //         SeedPrefixes::FillsRegistry => SeedPrefixVersions::FillsRegistry,
    //     };
    //     current_version.version()
    // }
}