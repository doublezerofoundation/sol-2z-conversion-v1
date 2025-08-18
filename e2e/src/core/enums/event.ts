export namespace Event {
    export enum Dequeuer {
        Added = "DequeuerAdded",
        Removed = "DequeuerRemoved",
    }

    export enum System {
        UnauthorizedUser = "UnauthorizedUser",
        SystemHalted = "SystemHalted",
        SystemUnhalted = "SystemUnhalted",
    }

    export enum Init {
        SystemInitialized = "SystemInitialized",
    }
}