import { redirect } from 'next/navigation';

// Redirect old music-sfx page to new stock-musics page
export default function MusicSfxPage() {
  redirect('/stock-musics');
}

