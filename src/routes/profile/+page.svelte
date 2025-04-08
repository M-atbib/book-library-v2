<script lang="ts">
  import Tabs from "$lib/features/profile/components/Tabs.svelte";
  import { setProfileState } from "$lib/features/profile/context/profile.svelte";
  import { collection, doc, setDoc } from "firebase/firestore";
  import { db } from "$lib/services/firebase";

  setProfileState();

  // Genres and tags definitions
  const genres = [
    "Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Mystery",
    "Thriller", "Romance", "Horror", "Biography", "History",
    "Self-Help", "Business", "Children", "Young Adult", "Poetry"
  ];

  const tagsByGenre: Record<string, string[]> = {
    Fiction: ["Contemporary", "Literary", "Classic", "Short Stories"],
    "Non-Fiction": ["Memoir", "Essay", "Educational", "Reference"],
    "Science Fiction": ["Space Opera", "Dystopian", "Cyberpunk", "Time Travel"],
    Fantasy: ["Epic", "Urban", "High Fantasy", "Magical Realism"],
    Mystery: ["Cozy", "Detective", "Police Procedural", "Whodunit"],
    Thriller: ["Psychological", "Legal", "Political", "Spy"],
    Romance: ["Contemporary", "Historical", "Paranormal", "Suspense"],
    Horror: ["Supernatural", "Psychological", "Gothic", "Slasher"],
    Biography: ["Autobiography", "Memoir", "Historical", "Celebrity"],
    History: ["Ancient", "Medieval", "Modern", "Military"],
    "Self-Help": ["Motivation", "Personal Development", "Productivity", "Wellness"],
    Business: ["Leadership", "Entrepreneurship", "Management", "Finance"],
    Children: ["Picture Book", "Middle Grade", "Educational", "Adventure"],
    "Young Adult": ["Coming of Age", "Dystopian", "Contemporary", "Fantasy"],
    Poetry: ["Lyric", "Narrative", "Sonnet", "Free Verse"]
  };

  // Helper functions
  const getRandomItem = <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const getRandomNumber = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const transformBookData = (jsonBook: any) => {
    const genre = getRandomItem(genres);
    const genreTags = tagsByGenre[genre] || [];
    
    const numTags = getRandomNumber(1, 3);
    const tags: string[] = [];
    for (let i = 0; i < numTags; i++) {
      const tag = getRandomItem(genreTags);
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    const authorName = "Matbib 18";
    const authorId = "cG7JcZXEigNDvsqwDuDmG7vhjrk2";

    const publishedDate = jsonBook.publication_year
      ? new Date(jsonBook.publication_year, 0, 1)
      : new Date();

    return {
      id: jsonBook.id,
      title: jsonBook.title || "Untitled",
      authorName,
      authorId,
      coverUrl: jsonBook.image_url || "https://s.gr-assets.com/assets/nophoto/book/111x148-bcc042a9c91a29c1d680899eff700a03.png",
      avgRating: jsonBook.average_rating || 0,
      genre,
      tags,
      publishedDate,
      description: `A ${genre.toLowerCase()} book by ${authorName}.`,
      pages: getRandomNumber(100, 500)
    };
  };

  let isImporting = false;
  let importStatus = "";

  const importBooks = async () => {
    isImporting = true;
    importStatus = "Starting import...";
    
    try {
      const response = await fetch("src/lib/books.jsonl");
      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim());

      const MAX_BOOKS = 300;
      let count = 0;
      const booksCollection = collection(db, "books");

      for (const line of lines) {
        if (count >= MAX_BOOKS) break;

        try {
          const jsonBook = JSON.parse(line);
          if (!jsonBook.title) continue;

          const book = transformBookData(jsonBook);
          await setDoc(doc(booksCollection, book.id), book);

          count++;
          importStatus = `Imported ${count} books...`;
        } catch (error) {
          console.error("Error processing book:", error);
        }
      }

      importStatus = `Successfully imported ${count} books to Firestore.`;
    } catch (error) {
      importStatus = `Error during import: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error("Import error:", error);
    } finally {
      isImporting = false;
    }
  };
</script>

<div class="flex flex-col gap-4">
  <Tabs />
  
  <!-- <div class="p-4 bg-base-200 rounded-lg">
    <h2 class="text-xl font-bold mb-4">Data Import</h2>
    <button 
      class="btn btn-primary" 
      onclick={importBooks} 
      disabled={isImporting}
    >
      {isImporting ? 'Importing...' : 'Import Books'}
    </button>
    
    {#if importStatus}
      <div class="mt-4 p-4 bg-base-100 rounded">
        <p>{importStatus}</p>
      </div>
    {/if}
  </div> -->
</div>
