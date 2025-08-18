use crate::common::seeds::seed_prefix_current_versions::SeedPrefixVersions;
use crate::common::seeds::seed_prefix_v2::SeedPrefixV2;

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixes {
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
}

impl SeedPrefixes {
    pub fn as_bytes(&self) -> &'static [u8] {
        // Use current versions by default
        let current_version = match self {
            SeedPrefixes::ConfigurationRegistry => SeedPrefixV2::ConfigurationRegistry,
            SeedPrefixes::ProgramState => SeedPrefixV2::ProgramState,
            SeedPrefixes::DenyListRegistry => SeedPrefixV2::DenyListRegistry,
        };
        current_version.as_bytes()
    }
}