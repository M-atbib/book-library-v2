export interface Book {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  coverUrl: string;
  avgRating: number;
  genre: string;
  tags: string[];
  publishedDate: Date;
  description: string;
  pages: number;
}

export interface BookRating {
  ratingValue: number;
  userId: string;
}

export interface SavedBook {
  id: string;
  title: string;
  authorName: string;
  coverUrl: string;
  avgRating: number;
  genre: string;
  tags: string[];
}

export interface RatedBook {
  book: Book;
  rating: BookRating;
}
