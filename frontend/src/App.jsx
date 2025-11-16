import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Accounts from './pages/Accounts';
import Prompts from './pages/Prompts';
import Projects from './pages/Projects';
import Generate from './pages/Generate';
import Gallery from './pages/Gallery';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">
              🎨 Whisk Auto
            </Link>
            
            <div className="flex space-x-4">
              <Link
                to="/accounts"
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('/accounts') 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-800'
                }`}
              >
                👤 Accounts
              </Link>
              
              <Link
                to="/prompts"
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('/prompts') 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-800'
                }`}
              >
                📝 Prompts
              </Link>
              
              <Link
                to="/projects"
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('/projects') 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-800'
                }`}
              >
                📁 Projects
              </Link>
              
              <Link
                to="/generate"
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('/generate') 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-800'
                }`}
              >
                ⚡ Generate
              </Link>
              
              <Link
                to="/gallery"
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('/gallery') 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-800'
                }`}
              >
                🖼️ Gallery
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Accounts />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/gallery" element={<Gallery />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;