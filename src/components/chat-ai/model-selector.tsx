"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";

import { saveChatModelAsCookie } from "@/app/[lang]/(chat)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODELS } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { Session } from "next-auth";

export function ModelSelector({
  session,
  selectedModelId,
  onModelChange,
  className,
}: {
  session: Session;
  selectedModelId: string;
  onModelChange?: (id: string) => void;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);

  // Determine user type based on session
  // If user has businessUserId, they're a permanent user, otherwise temporary
  const userType = session.user.businessUserId ? "user" : "temporary";
  const { availableChatModelIds } = entitlementsByUserType[userType];

  // Debug logging for model selection
  console.log("🔍 Model Selection Debug:");
  console.log("User type:", userType);
  console.log("Available model IDs from entitlements:", availableChatModelIds);
  console.log("All models from MODELS array:", MODELS);
  console.log("User entitlements:", entitlementsByUserType[userType]);

  // Show all available models (both Theta and Vercel)
  // Filter by user entitlements but allow both providers
  const availableChatModels = MODELS.filter((model) => availableChatModelIds.includes(model.id));

  console.log("Filtered available models:", availableChatModels);
  console.log(
    "Model filtering details:",
    MODELS.map((model) => ({
      id: model.id,
      label: model.label,
      provider: model.provider,
      isIncluded: availableChatModelIds.includes(model.id),
    }))
  );

  const selectedChatModel = useMemo(
    () => availableChatModels.find((chatModel) => chatModel.id === optimisticModelId),
    [optimisticModelId, availableChatModels]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn("w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground", className)}
      >
        <Button data-testid="model-selector" variant="outline" className="md:h-[34px] md:px-2">
          {selectedChatModel?.label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[280px] max-w-[90vw] sm:min-w-[300px]">
        {availableChatModels.map((chatModel) => {
          const { id } = chatModel;

          return (
            <DropdownMenuItem
              data-testid={`model-selector-item-${id}`}
              key={id}
              onSelect={() => {
                console.log("🎯 Model Selected:", {
                  modelId: id,
                  modelLabel: chatModel.label,
                  provider: chatModel.provider,
                });

                setOpen(false);

                startTransition(() => {
                  setOptimisticModelId(id);
                  // Notify parent about model change so the selection is lifted up
                  try {
                    onModelChange?.(id);
                  } catch (e) {
                    console.warn("ModelSelector onChange handler threw:", e);
                  }
                  saveChatModelAsCookie(id);

                  console.log("💾 Model saved to cookie:", id);
                });
              }}
              data-active={id === optimisticModelId}
              asChild
            >
              <button
                type="button"
                className="group/item flex w-full flex-row items-center justify-between gap-2 sm:gap-4"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="text-sm sm:text-base">{chatModel.label}</div>
                  <div className="line-clamp-2 text-muted-foreground text-xs">
                    {chatModel.kind === "reasoning" ? "Advanced reasoning model" : "Chat model"} •{" "}
                    {chatModel.provider === "theta" ? "Theta Cloud" : "Vercel AI"}
                  </div>
                </div>

                <div className="shrink-0 text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
                  <CheckCircleFillIcon />
                </div>
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
