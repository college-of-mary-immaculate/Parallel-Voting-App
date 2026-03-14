import Header from './Header';
import Footer from './Footer';
import { SkipLinks } from './AccessibilityProvider';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SkipLinks />
      <Header />
      <main 
        id="main-content"
        className="flex-grow"
        role="main"
        aria-label="Main content"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
