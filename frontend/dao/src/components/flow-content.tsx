"use client";

import { WalletConnect } from "./tutorial/wallet-connect";
import { FoundersVoting } from "./dao/founders-voting";
import { FoundersList } from "./dao/founders-list";
import { TopicsList } from "./dao/topics-list";
import { CreateTopic } from "./dao/create-topic";

export function FlowContent() {
  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="flex flex-col items-center justify-center py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl w-full space-y-12 sm:space-y-16 lg:space-y-20">
          <div className="text-center space-y-3 sm:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white tracking-tight leading-none px-4">
              DPIN DAO
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-black/50 dark:text-white/50 max-w-3xl mx-auto leading-relaxed font-light px-4">
              Decentralized Autonomous Organization on Flow blockchain
            </p>
          </div>

          <div className="space-y-6 max-w-7xl mx-auto">
            <WalletConnect />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FoundersVoting />
              <FoundersList />
            </div>

            <CreateTopic />

            <TopicsList />
          </div>
        </div>
      </div>
    </main>
  );
}
