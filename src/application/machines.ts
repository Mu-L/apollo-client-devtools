import type { QueryInfo } from "../extension/tab/helpers";
import type { JSONObject } from "./types/json";

import type { StateMachine } from "@xstate/fsm";
import { createMachine, assign } from "@xstate/fsm";

export interface ClientContext {
  queries: QueryInfo[];
  mutations: QueryInfo[];
  cache: JSONObject;
}
interface Context {
  clientContext: ClientContext;
}

type Events =
  | { type: "connect"; clientContext: ClientContext }
  | { type: "timeout" }
  | { type: "disconnect" }
  | { type: "clientNotFound" }
  | { type: "retry" };

export type StateValues =
  | "initialized"
  | "retrying"
  | "connected"
  | "disconnected"
  | "timedout"
  | "notFound";

type State = {
  value: StateValues;
  context: Context;
};

type Actions = {
  connectToClient: StateMachine.ActionFunction<Context, Events>;
  startRequestInterval: StateMachine.ActionFunction<Context, Events>;
  unsubscribeFromAll: StateMachine.ActionFunction<Context, Events>;
};

export function createDevtoolsMachine({ actions }: { actions: Actions }) {
  return createMachine<Context, Events, State>(
    {
      initial: "initialized",
      context: {
        clientContext: {
          queries: [],
          mutations: [],
          cache: {},
        },
      },
      states: {
        initialized: {
          on: {
            connect: {
              target: "connected",
              actions: assign({
                clientContext: (_, event) => event.clientContext,
              }),
            },
            timeout: "timedout",
            clientNotFound: "notFound",
          },
        },
        retrying: {
          on: {
            connect: "connected",
            clientNotFound: "notFound",
          },
          entry: "connectToClient",
        },
        connected: {
          on: {
            disconnect: "disconnected",
          },
          entry: ["startRequestInterval"],
        },
        disconnected: {
          on: {
            connect: "connected",
            timeout: "timedout",
            clientNotFound: "notFound",
          },
          entry: "unsubscribeFromAll",
        },
        timedout: {},
        notFound: {
          on: {
            retry: "retrying",
          },
          entry: "unsubscribeFromAll",
        },
      },
    },
    { actions }
  );
}
