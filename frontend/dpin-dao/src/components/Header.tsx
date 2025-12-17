import { Connect, useFlowCurrentUser } from '@onflow/react-sdk';

export function Header() {
  const { user } = useFlowCurrentUser();

  return (
    <header className="app-header">
      <div className="header-content">
        <h1>DPIN DAO</h1>
        <div className="header-actions">
          {user?.loggedIn && (
            <div className="user-info">
              <span className="user-address">{user.addr}</span>
            </div>
          )}
          <Connect />
        </div>
      </div>
    </header>
  );
}
