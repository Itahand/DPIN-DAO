import { FlowProvider } from '@onflow/react-sdk';
import flowJSON from '../../../../flow.json';

interface FlowProviderWrapperProps {
  children: React.ReactNode;
}

export function FlowProviderWrapper({ children }: FlowProviderWrapperProps) {
  return (
    <FlowProvider
      config={{
        // Testnet configuration (update to mainnet/emulator as needed)
        accessNodeUrl: 'https://access-testnet.onflow.org',
        discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
        flowNetwork: 'testnet',
        // App metadata
        appDetailTitle: 'DPIN DAO',
        appDetailUrl:
          typeof window !== 'undefined' ? window.location.origin : '',
        appDetailIcon: 'https://avatars.githubusercontent.com/u/62387156?v=4',
        appDetailDescription: 'DPIN DAO - Decentralized Autonomous Organization',
        // Optional configuration
        computeLimit: 1000,
      }}
      flowJson={flowJSON}
    >
      {children}
    </FlowProvider>
  );
}
