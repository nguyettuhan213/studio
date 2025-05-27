import Link from 'next/link';
import { Home, LayoutDashboard } from 'lucide-react';

const SidebarNavigation = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <nav>
        <ul>
          <li className="mb-2">
            <Link href="/" className="flex items-center py-2 px-4 rounded hover:bg-gray-700">
                <Home className="mr-2" size={18} />
                Home
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/dashboard" className="flex items-center py-2 px-4 rounded hover:bg-gray-700">
                <LayoutDashboard className="mr-2" size={18} />
                Dashboard
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default SidebarNavigation;