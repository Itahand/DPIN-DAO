"use client";

import { FlowProvider } from "@onflow/react-sdk";
import { ReactNode } from "react";
import flowJSON from "../../flow.json";
import * as fcl from "@onflow/fcl";

interface FlowProviderWrapperProps {
  children: ReactNode;
}

export function FlowProviderWrapper({ children }: FlowProviderWrapperProps) {
  // Configure FCL access node
  if (typeof window !== "undefined") {
    fcl.config({
      "accessNode.api": "https://rest-mainnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/mainnet/authn",
      "discovery.authn.endpoint": "https://fcl-discovery.onflow.org/api/mainnet/authn",
      "app.detail.title": "DPIN DAO",
      "app.detail.icon": "https://avatars.githubusercontent.com/u/62387156?v=4",
      "fcl.limit": 1000,
    });
  }

  return (
    <FlowProvider
      config={{
        // Mainnet configuration
        accessNodeUrl: "https://rest-mainnet.onflow.org",
        discoveryWallet: "https://fcl-discovery.onflow.org/mainnet/authn",
        discoveryAuthnEndpoint:
          "https://fcl-discovery.onflow.org/api/mainnet/authn",
        flowNetwork: "mainnet",

        // App metadata
        appDetailTitle: "DPIN DAO",
        appDetailUrl:
          typeof window !== "undefined" ? window.location.origin : "",
        appDetailIcon: "https://avatars.githubusercontent.com/u/62387156?v=4",
        appDetailDescription:
          "Decentralized Autonomous Organization on Flow blockchain",

        // Optional configuration
        computeLimit: 1000,
        // Example WalletConnect project ID
        walletconnectProjectId: "9b70cfa398b2355a5eb9b1cf99f4a981",
      }}
      flowJson={flowJSON}
    >
      {children}
    </FlowProvider>
  );
}
