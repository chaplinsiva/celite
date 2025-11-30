import Link from 'next/link';
import { Button } from '../components/ui/neon-button';

export default function NotFound() {
  return (
    <main className="bg-black min-h-screen pt-16 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-6xl sm:text-8xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-zinc-400 text-lg mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex justify-center">
          <Button
            variant="default"
            size="lg"
            className="px-8 py-3 font-semibold"
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



