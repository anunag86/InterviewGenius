import { Link } from "wouter";

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <span className="text-indigo-600 text-xl font-bold mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <Link href="/">
              <h1 className="text-xl font-bold text-gray-900 cursor-pointer">InterviewPrepAI</h1>
            </Link>
          </div>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Link href="/">
                  <a className="text-gray-700 hover:text-indigo-600 font-medium">Home</a>
                </Link>
              </li>
              <li>
                <Link href="/how-it-works">
                  <a className="text-gray-700 hover:text-indigo-600 font-medium">How it Works</a>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <a className="text-gray-700 hover:text-indigo-600 font-medium">About</a>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
