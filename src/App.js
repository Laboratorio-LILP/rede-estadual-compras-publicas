import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ForumNoticeModal from './components/ForumNoticeModal';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Categories from './pages/Categories';
import Category from './pages/Category';
import Topic from './pages/Topic';
import Admin from './pages/Admin';
import NewTopic from './pages/NewTopic';
import UserProfile from './pages/UserProfile';
import Messages from './pages/Messages';
import Portal from './pages/Portal';
import Capacitacao from './pages/Capacitacao';
import Terms from './pages/Terms';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-gray-500 text-lg mb-6">Página não encontrada</p>
      <Link to="/" className="bg-red-500 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition">
        Voltar ao Início
      </Link>
    </div>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#F8F9FB]">
            <Navbar />
            <ForumNoticeModal />
            <main>
              <Routes>
              <Route path="/" element={<Portal />} />
              <Route path="/forum" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/category/:id" element={<Category />} />
              <Route path="/topic/:id" element={<Topic />} />
              <Route path="/new-topic" element={<NewTopic />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/user/:id" element={<UserProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:userId" element={<Messages />} />
              <Route path="/capacitacao" element={<Capacitacao />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
