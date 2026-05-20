import Link from 'next/link';
import { Button } from '../components/ui/neon-button';

export default function NotFound() {
  return (
    <main className="bg-white min-h-screen pt-20 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-6xl sm:text-8xl font-bold text-zinc-900 mb-4">404</h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-800 mb-4">
          Page Not Found
        </h2>
        <p className="text-zinc-500 text-lg mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex justify-center">
          <Button
            className="px-8 py-3 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
            asChild
          >
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}



