import type { ChatModel } from "./models";

// User types that match our database allUsers.type
export type UserType = "user" | "temporary";

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel["id"]>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For temporary users (invitation system)
   */
  temporary: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ["chat-model", "chat-model-reasoning", "llama-3.1-70b", "deepseek-r1"],
  },

  /*
   * For permanent users (authenticated users)
   */
  user: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ["chat-model", "chat-model-reasoning", "llama-3.1-70b", "deepseek-r1"],
  },

  /*
   * TODO: For users with premium membership
   */
};
