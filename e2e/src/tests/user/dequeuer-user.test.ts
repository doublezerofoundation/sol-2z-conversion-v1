import { Test } from "../../core/account-defs";
import { DequeuerScenario } from "../../scenarios/dequeuer-scenario";

export const dequeuerUserTests: Test[] = [
    {
        name: "dequeuer_user_cannot_dequeue_fill_if_not_authorized",
        description: "Dequeuer user should not be able to dequeue a fill if they are not authorized",
        execute: async (scenario: DequeuerScenario) => {
            //TODO: add test
        }
    },
    {
        name: "dequeuer_user_can_dequeue_fill",
        description: "Dequeuer user should be able to dequeue a fill",
        execute: async (scenario: DequeuerScenario) => {
            //TODO: add test
        }
    }
]