use crate::common::seeds::seed_prefix_v1::SeedPrefixV1;

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
            SeedPrefixes::ConfigurationRegistry => SeedPrefixV1::ConfigurationRegistry,
            SeedPrefixes::ProgramState => SeedPrefixV1::ProgramState,
            SeedPrefixes::DenyListRegistry => SeedPrefixV1::DenyListRegistry,
        };
        current_version.as_bytes()
    }
}