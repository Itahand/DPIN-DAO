import { Header } from './components/Header';
import { TopicsList } from './components/TopicsList';
import { FoundersList } from './components/FoundersList';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <FoundersList />
        <TopicsList />
      </main>
    </div>
  );
}

export default App;
